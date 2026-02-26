/* eslint-disable @typescript-eslint/no-explicit-any -- shakedowns tables not in generated types */
/**
 * API Route: Shakedown Helpful Votes
 *
 * Feature: 001-community-shakedowns
 * Tasks: T043, T044
 *
 * POST /api/shakedowns/helpful - Mark feedback as helpful (shakedown owner only)
 * DELETE /api/shakedowns/helpful - Remove helpful vote
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { helpfulVoteSchema } from '@/lib/shakedown-schemas';
import type { Badge, ShakedownBadge } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface PostSuccessResponse {
  success: true;
  feedbackId: string;
  newHelpfulCount: number;
  badgeAwarded?: Badge;
}

interface DeleteSuccessResponse {
  success: true;
  feedbackId: string;
  newHelpfulCount: number;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row from shakedown_feedback table
 */
interface FeedbackDbRow {
  id: string;
  shakedown_id: string;
  author_id: string;
  helpful_count: number;
}

/**
 * Database row from shakedowns table for owner verification
 */
interface ShakedownOwnerRow {
  id: string;
  owner_id: string;
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

/**
 * Database row from shakedown_helpful_votes table
 */
interface HelpfulVoteDbRow {
  id: string;
  feedback_id: string;
  voter_id: string;
  created_at: string;
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
 * Checks if a new badge was awarded after incrementing helpful count
 * Returns the newly awarded badge if applicable
 */
async function checkForNewBadge(
   
  supabase: any,
  authorId: string,
  previousHelpfulCount: number
): Promise<Badge | undefined> {
  // Get current helpful count from profile
  const { data: profile, error: profileError } = await (supabase as any)
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
      const { data: badge, error: badgeError } = await (supabase as any)
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
// POST Handler - Mark Feedback as Helpful
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<PostSuccessResponse | ErrorResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validation = helpfulVoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { feedbackId } = validation.data;

    // Fetch feedback with shakedown info for authorization
     
    const { data: feedback, error: feedbackError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('id, shakedown_id, author_id, helpful_count')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const typedFeedback = feedback as FeedbackDbRow;

    // Fetch shakedown to verify ownership
     
    const { data: shakedown, error: shakedownError } = await (supabase as any)
      .from('shakedowns')
      .select('id, owner_id')
      .eq('id', typedFeedback.shakedown_id)
      .single();

    if (shakedownError || !shakedown) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const typedShakedown = shakedown as ShakedownOwnerRow;

    // Authorization: Only shakedown owner can mark feedback as helpful
    if (typedShakedown.owner_id !== user.id) {
      return NextResponse.json(
        { error: 'Only the shakedown owner can mark feedback as helpful' },
        { status: 403 }
      );
    }

    // Cannot vote on own feedback
    if (typedFeedback.author_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot mark your own feedback as helpful', code: 'SELF_VOTE' },
        { status: 400 }
      );
    }

    // Get previous helpful count for badge check
     
    const { data: authorProfile } = await (supabase as any)
      .from('profiles')
      .select('shakedown_helpful_received')
      .eq('id', typedFeedback.author_id)
      .single();

    const previousHelpfulCount = authorProfile?.shakedown_helpful_received ?? 0;

    // Insert the vote (will fail with unique constraint if already voted)
     
    const { error: insertError } = await (supabase as any)
      .from('shakedown_helpful_votes')
      .insert({
        feedback_id: feedbackId,
        voter_id: user.id,
      });

    if (insertError) {
      // Check for unique constraint violation (already voted)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already marked this feedback as helpful', code: 'ALREADY_VOTED' },
          { status: 409 }
        );
      }

      console.error('[API] Failed to insert helpful vote:', insertError);
      return NextResponse.json(
        { error: 'Failed to mark feedback as helpful' },
        { status: 500 }
      );
    }

    // Fetch updated helpful count from feedback
    // (The trigger has already updated it)
     
    const { data: updatedFeedback, error: fetchError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('helpful_count')
      .eq('id', feedbackId)
      .single();

    if (fetchError) {
      console.error('[API] Failed to fetch updated feedback:', fetchError);
    }

    const newHelpfulCount = updatedFeedback?.helpful_count ?? typedFeedback.helpful_count + 1;

    // Check if a badge was awarded
    const badgeAwarded = await checkForNewBadge(
      supabase,
      typedFeedback.author_id,
      previousHelpfulCount
    );

    const response: PostSuccessResponse = {
      success: true,
      feedbackId,
      newHelpfulCount,
    };

    if (badgeAwarded) {
      response.badgeAwarded = badgeAwarded;

      // Create notification for badge award (T072)
      try {
         
        await (supabase as any).from('notifications').insert({
          user_id: typedFeedback.author_id,
          type: 'shakedown_badge',
          reference_type: 'shakedown_badge',
          reference_id: badgeAwarded.id,
          message: `You earned the ${badgeAwarded.badgeType.replace(/_/g, ' ')} badge for your helpful shakedown feedback!`,
        });
      } catch (notifError) {
        // Log but don't fail the request if notification creation fails
        console.error('[API] Failed to create badge award notification:', notifError);
      }
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API] Helpful vote creation error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
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

// =============================================================================
// DELETE Handler - Remove Helpful Vote
// =============================================================================

export async function DELETE(
  request: NextRequest
): Promise<NextResponse<DeleteSuccessResponse | ErrorResponse>> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    const validation = helpfulVoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { feedbackId } = validation.data;

    // Check if the vote exists and belongs to the user
     
    const { data: existingVote, error: voteError } = await (supabase as any)
      .from('shakedown_helpful_votes')
      .select('id, feedback_id, voter_id, created_at')
      .eq('feedback_id', feedbackId)
      .eq('voter_id', user.id)
      .single();

    if (voteError || !existingVote) {
      return NextResponse.json(
        { error: 'No vote to remove', code: 'VOTE_NOT_FOUND' },
        { status: 400 }
      );
    }

    const typedVote = existingVote as HelpfulVoteDbRow;

    // Verify the voter is the current user (double-check)
    if (typedVote.voter_id !== user.id) {
      return NextResponse.json(
        { error: 'Cannot remove another user\'s vote' },
        { status: 403 }
      );
    }

    // Check feedback exists before deletion
     
    const { data: feedback, error: feedbackError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('id, helpful_count')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const typedFeedback = feedback as FeedbackDbRow;

    // Delete the vote
     
    const { error: deleteError } = await (supabase as any)
      .from('shakedown_helpful_votes')
      .delete()
      .eq('id', typedVote.id);

    if (deleteError) {
      console.error('[API] Failed to delete helpful vote:', deleteError);
      return NextResponse.json(
        { error: 'Failed to remove vote' },
        { status: 500 }
      );
    }

    // Fetch updated helpful count
    // (The trigger has already decremented it)
     
    const { data: updatedFeedback, error: fetchError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('helpful_count')
      .eq('id', feedbackId)
      .single();

    if (fetchError) {
      console.error('[API] Failed to fetch updated feedback:', fetchError);
    }

    const newHelpfulCount = updatedFeedback?.helpful_count ??
      Math.max(0, typedFeedback.helpful_count - 1);

    return NextResponse.json({
      success: true,
      feedbackId,
      newHelpfulCount,
    });
  } catch (error) {
    console.error('[API] Helpful vote deletion error:', error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
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
