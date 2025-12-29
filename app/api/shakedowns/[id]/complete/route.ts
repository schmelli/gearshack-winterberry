/**
 * API Route: Complete Shakedown
 *
 * Feature: 001-community-shakedowns
 * Task: T051
 *
 * POST /api/shakedowns/[id]/complete - Mark a shakedown as completed
 *
 * This route:
 * - Validates that the user owns the shakedown
 * - Validates that the shakedown is currently 'open'
 * - Updates the status to 'completed' with timestamp
 * - Optionally batch-marks feedback as helpful
 * - Returns any badges awarded from the batch helpful votes
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { completeShakedownSchema } from '@/lib/shakedown-schemas';
import type {
  ShakedownWithAuthor,
  Badge,
  ShakedownBadge,
  ExperienceLevel,
  ShakedownPrivacy,
  ShakedownStatus,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface CompleteShakedownResponse {
  shakedown: ShakedownWithAuthor;
  helpfulCount: number;
  badgesAwarded?: Badge[];
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row from shakedowns table with profile join
 */
interface ShakedownDbRow {
  id: string;
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  share_token: string | null;
  status: ShakedownStatus;
  feedback_count: number;
  helpful_count: number;
  is_hidden: boolean;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  archived_at: string | null;
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Loadout row for summary data
 */
interface LoadoutSummaryRow {
  name: string;
  total_weight_grams: number;
  item_count: number;
}

/**
 * Database row from shakedown_feedback table
 */
interface FeedbackDbRow {
  id: string;
  author_id: string;
}

/**
 * Database row from shakedown_badges table
 */
interface BadgeDbRow {
  id: string;
  user_id: string;
  badge_type: ShakedownBadge;
  awarded_at: string;
}

// =============================================================================
// Constants
// =============================================================================

const BADGE_THRESHOLDS: Record<ShakedownBadge, number> = {
  shakedown_helper: 10,
  trail_expert: 50,
  community_legend: 100,
};

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps database row to ShakedownWithAuthor type
 */
function mapDbRowToShakedownWithAuthor(
  row: ShakedownDbRow,
  loadoutSummary: LoadoutSummaryRow
): ShakedownWithAuthor {
  return {
    id: row.id,
    ownerId: row.owner_id,
    loadoutId: row.loadout_id,
    tripName: row.trip_name,
    tripStartDate: row.trip_start_date,
    tripEndDate: row.trip_end_date,
    experienceLevel: row.experience_level,
    concerns: row.concerns,
    privacy: row.privacy,
    shareToken: row.share_token,
    status: row.status,
    feedbackCount: row.feedback_count,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
    archivedAt: row.archived_at,
    // Author info from joined profile
    authorName: row.profiles.display_name,
    authorAvatar: row.profiles.avatar_url,
    // Loadout summary
    loadoutName: loadoutSummary.name,
    totalWeightGrams: loadoutSummary.total_weight_grams,
    itemCount: loadoutSummary.item_count,
  };
}

/**
 * Checks if a new badge was awarded after incrementing helpful count
 * Returns the newly awarded badge if applicable
 */
async function checkForNewBadge(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  authorId: string,
  previousHelpfulCount: number
): Promise<Badge | undefined> {
  // Get current helpful count from profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('shakedown_helpful_received')
    .eq('id', authorId)
    .single();

  if (profileError || !profile) {
    console.error('[API] Failed to fetch profile for badge check:', profileError);
    return undefined;
  }

  const currentCount = profile.shakedown_helpful_received;

  // Check each badge threshold to see if we crossed it
  for (const [badgeType, threshold] of Object.entries(BADGE_THRESHOLDS)) {
    // Badge was just earned if previous count was below threshold
    // and current count is at or above threshold
    if (previousHelpfulCount < threshold && currentCount >= threshold) {
      // Fetch the badge that was just awarded (by the trigger)
      const { data: badge, error: badgeError } = await supabase
        .from('shakedown_badges')
        .select('id, user_id, badge_type, awarded_at')
        .eq('user_id', authorId)
        .eq('badge_type', badgeType)
        .single();

      if (badgeError) {
        console.error('[API] Failed to fetch awarded badge:', badgeError);
        return undefined;
      }

      if (badge) {
        const typedBadge = badge as BadgeDbRow;
        return {
          id: typedBadge.id,
          userId: typedBadge.user_id,
          badgeType: typedBadge.badge_type,
          awardedAt: typedBadge.awarded_at,
        };
      }
    }
  }

  return undefined;
}

// =============================================================================
// POST Handler - Complete Shakedown
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<CompleteShakedownResponse | ErrorResponse>> {
  try {
    const { id: shakedownId } = await params;

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      // Empty body is valid (helpfulFeedbackIds is optional)
      body = {};
    }

    const validation = completeShakedownSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { helpfulFeedbackIds } = validation.data;

    // Fetch shakedown with profile data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownRow, error: shakedownError } = await (supabase as any)
      .from('shakedowns')
      .select(
        `
        *,
        profiles!owner_id (
          display_name,
          avatar_url
        )
      `
      )
      .eq('id', shakedownId)
      .single();

    if (shakedownError || !shakedownRow) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const shakedown = shakedownRow as ShakedownDbRow;

    // Authorization: Only owner can complete the shakedown
    if (shakedown.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the shakedown owner can complete it' },
        { status: 403 }
      );
    }

    // Validate status: Must be 'open' to complete
    if (shakedown.status !== 'open') {
      const statusMessage =
        shakedown.status === 'completed'
          ? 'Shakedown is already completed'
          : 'Shakedown is archived and cannot be completed';

      return NextResponse.json(
        { error: statusMessage, code: 'INVALID_STATUS' },
        { status: 409 }
      );
    }

    // Track badges awarded from batch helpful votes
    const badgesAwarded: Badge[] = [];
    let helpfulCount = 0;

    // Process batch helpful votes if provided
    if (helpfulFeedbackIds && helpfulFeedbackIds.length > 0) {
      // Validate that all feedback IDs belong to this shakedown
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: feedbackRows, error: feedbackError } = await (supabase as any)
        .from('shakedown_feedback')
        .select('id, author_id')
        .eq('shakedown_id', shakedownId)
        .in('id', helpfulFeedbackIds);

      if (feedbackError) {
        console.error('[API] Failed to validate feedback IDs:', feedbackError);
        return NextResponse.json(
          { error: 'Failed to validate feedback' },
          { status: 500 }
        );
      }

      const validFeedback = (feedbackRows || []) as FeedbackDbRow[];
      const validFeedbackIds = new Set(validFeedback.map((f) => f.id));

      // Filter to only valid feedback IDs (ignore invalid ones silently)
      const feedbackToMark = helpfulFeedbackIds.filter((id) => validFeedbackIds.has(id));

      // Also filter out any feedback authored by the user themselves
      const feedbackNotSelf = validFeedback.filter(
        (f) => feedbackToMark.includes(f.id) && f.author_id !== user.id
      );

      if (feedbackNotSelf.length > 0) {
        // Get previous helpful counts for badge checking
        const authorIds = [...new Set(feedbackNotSelf.map((f) => f.author_id))];
        const previousCounts = new Map<string, number>();

        for (const authorId of authorIds) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: profile } = await (supabase as any)
            .from('profiles')
            .select('shakedown_helpful_received')
            .eq('id', authorId)
            .single();

          previousCounts.set(authorId, profile?.shakedown_helpful_received ?? 0);
        }

        // Batch upsert helpful votes
        const voteInserts = feedbackNotSelf.map((f) => ({
          feedback_id: f.id,
          voter_id: user.id,
        }));

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: upsertError, count } = await (supabase as any)
          .from('shakedown_helpful_votes')
          .upsert(voteInserts, {
            onConflict: 'feedback_id,voter_id',
            ignoreDuplicates: true,
            count: 'exact',
          });

        if (upsertError) {
          console.error('[API] Failed to batch insert helpful votes:', upsertError);
          // Continue with completion even if helpful votes fail
        } else {
          helpfulCount = count ?? feedbackNotSelf.length;

          // Check for badges for each unique author
          for (const authorId of authorIds) {
            const previousCount = previousCounts.get(authorId) ?? 0;
            const badge = await checkForNewBadge(supabase, authorId, previousCount);
            if (badge) {
              badgesAwarded.push(badge);
            }
          }
        }
      }
    }

    // Update shakedown status to 'completed'
    const completedAt = new Date().toISOString();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedRow, error: updateError } = await (supabase as any)
      .from('shakedowns')
      .update({
        status: 'completed',
        completed_at: completedAt,
      })
      .eq('id', shakedownId)
      .select(
        `
        *,
        profiles!owner_id (
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (updateError) {
      console.error('[API] Failed to complete shakedown:', updateError);
      return NextResponse.json(
        { error: 'Failed to complete shakedown' },
        { status: 500 }
      );
    }

    const updatedShakedown = updatedRow as ShakedownDbRow;

    // Fetch loadout summary for response
    const { data: loadoutRow, error: loadoutError } = await supabase
      .from('loadouts')
      .select('name, total_weight_grams, item_count')
      .eq('id', updatedShakedown.loadout_id)
      .single();

    if (loadoutError || !loadoutRow) {
      console.error('[API] Failed to fetch loadout:', loadoutError);
      // Continue with default values rather than failing
    }

    const loadoutSummary: LoadoutSummaryRow = loadoutRow
      ? (loadoutRow as unknown as LoadoutSummaryRow)
      : { name: 'Unknown', total_weight_grams: 0, item_count: 0 };

    // Build response
    const response: CompleteShakedownResponse = {
      shakedown: mapDbRowToShakedownWithAuthor(updatedShakedown, loadoutSummary),
      helpfulCount,
    };

    if (badgesAwarded.length > 0) {
      response.badgesAwarded = badgesAwarded;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Complete shakedown error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
