/**
 * API Route: Shakedown Experts
 *
 * Feature: 001-community-shakedowns
 * Task: T068
 *
 * GET /api/shakedowns/experts - Get top contributors (public leaderboard)
 *
 * Returns users who have earned recognition through helpful feedback.
 * Threshold: 50+ helpful votes to be considered an "expert".
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { ShakedownBadge } from '@/types/shakedown';

// =============================================================================
// Constants
// =============================================================================

/**
 * Minimum helpful votes received to be considered an expert
 */
const EXPERT_THRESHOLD = 50;

/**
 * Badge ranking from lowest to highest
 * Higher number = more prestigious badge
 */
const BADGE_RANK: Record<ShakedownBadge, number> = {
  shakedown_helper: 1,
  trail_expert: 2,
  community_legend: 3,
};

// =============================================================================
// Types
// =============================================================================

interface Expert {
  userId: string;
  displayName: string | null;
  avatarUrl: string | null;
  helpfulVotesReceived: number;
  shakedownsReviewed: number;
  badges: ShakedownBadge[];
  highestBadge: ShakedownBadge | null;
}

interface ExpertsResponse {
  experts: Expert[];
}

interface ErrorResponse {
  error: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row from profiles table with expert stats
 */
interface ProfileExpertDbRow {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  shakedown_helpful_received: number;
  shakedowns_reviewed: number;
}

// =============================================================================
// Query Schema
// =============================================================================

const expertsQuerySchema = z.object({
  limit: z.coerce
    .number()
    .min(1, 'Limit must be at least 1')
    .max(50, 'Limit cannot exceed 50')
    .default(10),
  badge: z.enum(['shakedown_helper', 'trail_expert', 'community_legend']).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Gets the highest-ranked badge from a list of badges
 * Returns null if the badges array is empty
 */
function getHighestBadge(badges: ShakedownBadge[]): ShakedownBadge | null {
  if (badges.length === 0) {
    return null;
  }

  return badges.sort((a, b) => BADGE_RANK[b] - BADGE_RANK[a])[0];
}

/**
 * Maps database row to Expert type
 * Returns null for displayName when missing to allow client-side i18n handling
 */
function mapDbRowToExpert(
  row: ProfileExpertDbRow,
  badges: ShakedownBadge[]
): Expert {
  return {
    userId: row.id,
    displayName: row.display_name || null,
    avatarUrl: row.avatar_url,
    helpfulVotesReceived: row.shakedown_helpful_received,
    shakedownsReviewed: row.shakedowns_reviewed,
    badges,
    highestBadge: getHighestBadge(badges),
  };
}

// =============================================================================
// GET Handler - List Experts
// =============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<ExpertsResponse | ErrorResponse>> {
  try {
    const supabase = await createClient();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      limit: searchParams.get('limit') || undefined,
      badge: searchParams.get('badge') || undefined,
    };

    // Validate query parameters
    const validation = expertsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { limit, badge } = validation.data;

    // If filtering by badge, get user IDs with that specific badge first
    let filteredUserIds: string[] | null = null;

    if (badge) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: badgeUsers, error: badgeError } = await (supabase as any)
        .from('shakedown_badges')
        .select('user_id')
        .eq('badge_type', badge);

      if (badgeError) {
        console.error('[API] Failed to fetch badge users:', badgeError);
        return NextResponse.json(
          { error: 'Failed to fetch experts' },
          { status: 500 }
        );
      }

      if (!badgeUsers || badgeUsers.length === 0) {
        // No users with this badge
        return NextResponse.json({ experts: [] });
      }

      filteredUserIds = badgeUsers.map(
        (row: { user_id: string }) => row.user_id
      );
    }

    // Build the main query for expert profiles
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('profiles')
      .select('id, display_name, avatar_url, shakedown_helpful_received, shakedowns_reviewed')
      .gte('shakedown_helpful_received', EXPERT_THRESHOLD)
      .order('shakedown_helpful_received', { ascending: false })
      .limit(limit);

    // Apply badge filter if specified
    if (filteredUserIds) {
      query = query.in('id', filteredUserIds);
    }

    // Execute the profiles query
    const { data: profiles, error: profilesError } = await query;

    if (profilesError) {
      console.error('[API] Failed to fetch expert profiles:', profilesError);
      return NextResponse.json(
        { error: 'Failed to fetch experts' },
        { status: 500 }
      );
    }

    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ experts: [] });
    }

    const typedProfiles = profiles as ProfileExpertDbRow[];

    // Fetch badges for all expert users in a single query
    const userIds = typedProfiles.map((p) => p.id);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: allBadges, error: badgesError } = await (supabase as any)
      .from('shakedown_badges')
      .select('user_id, badge_type')
      .in('user_id', userIds);

    if (badgesError) {
      console.error('[API] Failed to fetch badges:', badgesError);
      // Continue without badges rather than failing the entire request
    }

    // Group badges by user ID for efficient lookup
    const badgesByUser = new Map<string, ShakedownBadge[]>();
    if (allBadges) {
      for (const badgeRow of allBadges as Array<{ user_id: string; badge_type: ShakedownBadge }>) {
        const existing = badgesByUser.get(badgeRow.user_id) || [];
        existing.push(badgeRow.badge_type);
        badgesByUser.set(badgeRow.user_id, existing);
      }
    }

    // Map profiles to Expert response format
    const experts: Expert[] = typedProfiles.map((profile) => {
      const userBadges = badgesByUser.get(profile.id) || [];
      return mapDbRowToExpert(profile, userBadges);
    });

    return NextResponse.json({ experts });
  } catch (error) {
    console.error('[API] Experts list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
