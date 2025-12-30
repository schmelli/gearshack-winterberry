/**
 * API Route: Reopen Shakedown
 *
 * Feature: 001-community-shakedowns
 * Task: T052
 *
 * POST /api/shakedowns/[id]/reopen - Reopen a completed shakedown for more feedback
 *
 * Constraints:
 * - Only owner can reopen
 * - Can only reopen 'completed' status (not 'open' or 'archived')
 * - Archived shakedowns cannot be reopened (90-day auto-archive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type {
  ShakedownWithAuthor,
  ExperienceLevel,
  ShakedownPrivacy,
  ShakedownStatus,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface ReopenResponse {
  shakedown: ShakedownWithAuthor;
}

interface ErrorResponse {
  error: string;
}

/**
 * Database row from shakedowns table with author/loadout info
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
  // Joined profile data
  profiles: {
    display_name: string;
    avatar_url: string | null;
  };
}

/**
 * Loadout summary for response
 */
interface LoadoutSummary {
  name: string;
  total_weight_grams: number;
  item_count: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps database row to ShakedownWithAuthor type
 */
function mapDbRowToShakedownWithAuthor(
  row: ShakedownDbRow,
  loadout: LoadoutSummary
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
    loadoutName: loadout.name,
    totalWeightGrams: loadout.total_weight_grams,
    itemCount: loadout.item_count,
  };
}

// =============================================================================
// POST Handler - Reopen Shakedown
// =============================================================================

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ReopenResponse | ErrorResponse>> {
  try {
    const { id: shakedownId } = await params;
    const supabase = await createClient();

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch shakedown to verify ownership and status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingShakedown, error: fetchError } = await (supabase as any)
      .from('shakedowns')
      .select('id, owner_id, status')
      .eq('id', shakedownId)
      .single();

    if (fetchError || !existingShakedown) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Check ownership
    if (existingShakedown.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to reopen this shakedown' },
        { status: 403 }
      );
    }

    // Check status and provide appropriate error message
    if (existingShakedown.status === 'open') {
      return NextResponse.json(
        { error: 'Shakedown is already open' },
        { status: 409 }
      );
    }

    if (existingShakedown.status === 'archived') {
      return NextResponse.json(
        { error: 'Archived shakedowns cannot be reopened' },
        { status: 409 }
      );
    }

    // Status must be 'completed' at this point - proceed with update
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedShakedown, error: updateError } = await (supabase as any)
      .from('shakedowns')
      .update({
        status: 'open',
        completed_at: null,
      })
      .eq('id', shakedownId)
      .eq('status', 'completed') // Safety check: only update if still completed
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

    if (updateError || !updatedShakedown) {
      console.error('[API] Failed to reopen shakedown:', updateError);
      return NextResponse.json(
        { error: 'Failed to reopen shakedown' },
        { status: 500 }
      );
    }

    // Fetch loadout for response
    const { data: loadout, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('name, total_weight_grams, item_count')
      .eq('id', updatedShakedown.loadout_id)
      .single();

    if (loadoutError || !loadout) {
      console.error('[API] Failed to fetch loadout:', loadoutError);
      return NextResponse.json(
        { error: 'Failed to fetch loadout data' },
        { status: 500 }
      );
    }

    // Build response
    const response: ReopenResponse = {
      shakedown: mapDbRowToShakedownWithAuthor(
        updatedShakedown as ShakedownDbRow,
        loadout as unknown as LoadoutSummary
      ),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Shakedown reopen error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
