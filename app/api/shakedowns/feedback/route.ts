/**
 * API Route: Shakedown Feedback
 *
 * Feature: 001-community-shakedowns
 * Tasks: T028, T078
 *
 * POST /api/shakedowns/feedback - Create feedback on a shakedown
 *
 * T078: Added notification triggers for:
 *   - shakedown_feedback: Notify owner when someone comments
 *   - shakedown_reply: Notify parent author when someone replies
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createFeedbackSchema } from '@/lib/shakedown-schemas';
import type { FeedbackWithAuthor, ShakedownPrivacy } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface CreateFeedbackResponse {
  feedback: FeedbackWithAuthor;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row from shakedowns table for access checks
 */
interface ShakedownAccessRow {
  id: string;
  owner_id: string;
  privacy: ShakedownPrivacy;
  status: 'open' | 'completed' | 'archived';
  is_hidden: boolean;
  loadout_id: string;
  trip_name: string;
}

/**
 * Database row from shakedown_feedback table
 */
interface FeedbackDbRow {
  id: string;
  shakedown_id: string;
  author_id: string;
  parent_id: string | null;
  gear_item_id: string | null;
  content: string;
  content_html: string | null;
  depth: 1 | 2 | 3;
  helpful_count: number;
  is_hidden: boolean;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Database row from v_shakedown_feedback_with_author view
 */
interface FeedbackViewRow extends FeedbackDbRow {
  author_name: string;
  author_avatar: string | null;
  author_reputation: number;
  gear_item_name: string | null;
}

/**
 * Insert payload for shakedown_feedback table
 */
interface FeedbackInsertPayload {
  shakedown_id: string;
  author_id: string;
  parent_id: string | null;
  gear_item_id: string | null;
  content: string;
  depth: 1 | 2 | 3;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps view row to FeedbackWithAuthor type (snake_case to camelCase)
 */
function mapViewRowToFeedback(row: FeedbackViewRow): FeedbackWithAuthor {
  return {
    id: row.id,
    shakedownId: row.shakedown_id,
    authorId: row.author_id,
    parentId: row.parent_id,
    gearItemId: row.gear_item_id,
    content: row.content,
    contentHtml: row.content_html,
    depth: row.depth,
    helpfulCount: row.helpful_count,
    isHidden: row.is_hidden,
    isEdited: row.is_edited,
    editedAt: row.edited_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    // Author info from view
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorReputation: row.author_reputation,
    gearItemName: row.gear_item_name,
  };
}

/**
 * Checks if two users are friends
 */
async function checkAreFriends(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId1: string,
  userId2: string
): Promise<boolean> {
  // Canonical ordering: smaller ID first
  const [user1, user2] = userId1 < userId2
    ? [userId1, userId2]
    : [userId2, userId1];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('friendships')
    .select('id')
    .eq('user_id', user1)
    .eq('friend_id', user2)
    .maybeSingle();

  if (error) {
    console.error('[API] Error checking friendship:', error);
    return false;
  }

  return !!data;
}

/**
 * Checks if user can access a shakedown based on privacy settings
 */
async function canAccessShakedown(
  supabase: Awaited<ReturnType<typeof createClient>>,
  shakedown: ShakedownAccessRow,
  userId: string
): Promise<boolean> {
  // Owner always has access
  if (shakedown.owner_id === userId) {
    return true;
  }

  // Check privacy
  switch (shakedown.privacy) {
    case 'public':
      return true;
    case 'friends_only':
      return await checkAreFriends(supabase, shakedown.owner_id, userId);
    case 'private':
      return false;
    default:
      return false;
  }
}

// =============================================================================
// POST Handler - Create Feedback
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateFeedbackResponse | ErrorResponse>> {
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

    const validation = createFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { shakedownId, content, parentId, gearItemId } = validation.data;

    // Fetch shakedown to verify access and status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedown, error: shakedownError } = await (supabase as any)
      .from('shakedowns')
      .select('id, owner_id, privacy, status, is_hidden, loadout_id, trip_name')
      .eq('id', shakedownId)
      .single();

    if (shakedownError || !shakedown) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const typedShakedown = shakedown as ShakedownAccessRow;

    // Check if shakedown is hidden
    if (typedShakedown.is_hidden) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    // Check if shakedown is open for feedback
    if (typedShakedown.status !== 'open') {
      return NextResponse.json(
        { error: 'Cannot add feedback to a closed shakedown' },
        { status: 403 }
      );
    }

    // Check if user can access this shakedown
    const hasAccess = await canAccessShakedown(supabase, typedShakedown, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Cannot access shakedown' },
        { status: 403 }
      );
    }

    // Calculate depth for replies
    let depth: 1 | 2 | 3 = 1;
    let parentAuthorId: string | null = null;
    if (parentId) {
      // Fetch parent feedback to get its depth and author
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: parentFeedback, error: parentError } = await (supabase as any)
        .from('shakedown_feedback')
        .select('id, depth, shakedown_id, author_id')
        .eq('id', parentId)
        .single();

      if (parentError || !parentFeedback) {
        return NextResponse.json(
          { error: 'Parent feedback not found' },
          { status: 404 }
        );
      }

      // Verify parent belongs to the same shakedown
      if (parentFeedback.shakedown_id !== shakedownId) {
        return NextResponse.json(
          { error: 'Parent feedback does not belong to this shakedown' },
          { status: 400 }
        );
      }

      // Capture parent author for notification
      parentAuthorId = parentFeedback.author_id as string;

      const parentDepth = parentFeedback.depth as 1 | 2 | 3;

      // Check max depth (3 levels)
      if (parentDepth >= SHAKEDOWN_CONSTANTS.MAX_REPLY_DEPTH) {
        return NextResponse.json(
          { error: 'Maximum reply depth exceeded' },
          { status: 422 }
        );
      }

      depth = (parentDepth + 1) as 1 | 2 | 3;
    }

    // If gearItemId provided, verify it belongs to the shakedown's loadout
    if (gearItemId) {
      // First, verify the gear item exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: gearItem, error: gearError } = await (supabase as any)
        .from('gear_items')
        .select('id')
        .eq('id', gearItemId)
        .maybeSingle();

      if (gearError || !gearItem) {
        return NextResponse.json(
          { error: 'Gear item not found', code: 'GEAR_NOT_FOUND' },
          { status: 404 }
        );
      }

      // Then verify the gear item is part of the shakedown's loadout via loadout_items join table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: loadoutItem, error: loadoutItemError } = await (supabase as any)
        .from('loadout_items')
        .select('id')
        .eq('loadout_id', typedShakedown.loadout_id)
        .eq('gear_item_id', gearItemId)
        .maybeSingle();

      if (loadoutItemError) {
        console.error('[API] Error checking loadout_items:', loadoutItemError);
        return NextResponse.json(
          { error: 'Failed to verify gear item' },
          { status: 500 }
        );
      }

      if (!loadoutItem) {
        return NextResponse.json(
          { error: 'Gear item not found in this loadout', code: 'INVALID_GEAR_ITEM' },
          { status: 422 }
        );
      }
    }

    // Build insert payload
    const insertPayload: FeedbackInsertPayload = {
      shakedown_id: shakedownId,
      author_id: user.id,
      parent_id: parentId || null,
      gear_item_id: gearItemId || null,
      content: content.trim(),
      depth,
    };

    // Insert feedback into database
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedFeedback, error: insertError } = await (supabase as any)
      .from('shakedown_feedback')
      .insert(insertPayload)
      .select('id')
      .single();

    if (insertError) {
      console.error('[API] Failed to create feedback:', insertError);
      return NextResponse.json(
        { error: 'Failed to create feedback' },
        { status: 500 }
      );
    }

    // Fetch the created feedback with author info from the view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedbackView, error: viewError } = await (supabase as any)
      .from('v_shakedown_feedback_with_author')
      .select('*')
      .eq('id', insertedFeedback.id)
      .single();

    if (viewError || !feedbackView) {
      console.error('[API] Failed to fetch created feedback:', viewError);

      // Return minimal feedback data if view fetch fails
      // This should rarely happen, but provides graceful degradation
      // Empty authorName allows client-side i18n to display "Unknown" in user's language
      const minimalFeedback: FeedbackWithAuthor = {
        id: insertedFeedback.id,
        shakedownId,
        authorId: user.id,
        parentId: parentId || null,
        gearItemId: gearItemId || null,
        content: content.trim(),
        contentHtml: null,
        depth,
        helpfulCount: 0,
        isHidden: false,
        isEdited: false,
        editedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        authorName: '',
        authorAvatar: null,
        authorReputation: 0,
        gearItemName: null,
      };

      // Send notifications even in graceful degradation (non-blocking)
      try {
        // Notify shakedown owner (if feedback author is not the owner)
        if (typedShakedown.owner_id !== user.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('notifications').insert({
            user_id: typedShakedown.owner_id,
            type: 'shakedown_feedback',
            reference_type: 'shakedown',
            reference_id: typedShakedown.id,
            message: `Someone commented on your shakedown "${typedShakedown.trip_name}"`,
          });
        }

        // Notify parent author (if this is a reply and reply author is not the parent author)
        if (parentId && parentAuthorId && parentAuthorId !== user.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase as any).from('notifications').insert({
            user_id: parentAuthorId,
            type: 'shakedown_reply',
            reference_type: 'shakedown_feedback',
            reference_id: minimalFeedback.id,
            message: 'Someone replied to your comment',
          });
        }
      } catch (notifError) {
        console.error('[API] Failed to create feedback notification:', notifError);
      }

      return NextResponse.json({ feedback: minimalFeedback }, { status: 201 });
    }

    // Map to typed response
    const feedback = mapViewRowToFeedback(feedbackView as FeedbackViewRow);

    // Send notifications (non-blocking - failures don't affect the response)
    try {
      const authorName = feedback.authorName || 'Someone';

      // Notify shakedown owner (if feedback author is not the owner)
      if (typedShakedown.owner_id !== user.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('notifications').insert({
          user_id: typedShakedown.owner_id,
          type: 'shakedown_feedback',
          reference_type: 'shakedown',
          reference_id: typedShakedown.id,
          message: `${authorName} commented on your shakedown "${typedShakedown.trip_name}"`,
        });
      }

      // Notify parent author (if this is a reply and reply author is not the parent author)
      if (parentId && parentAuthorId && parentAuthorId !== user.id) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).from('notifications').insert({
          user_id: parentAuthorId,
          type: 'shakedown_reply',
          reference_type: 'shakedown_feedback',
          reference_id: feedback.id,
          message: `${authorName} replied to your comment`,
        });
      }
    } catch (notifError) {
      // Log but don't fail the request if notification creation fails
      console.error('[API] Failed to create feedback notification:', notifError);
    }

    return NextResponse.json({ feedback }, { status: 201 });
  } catch (error) {
    console.error('[API] Feedback creation error:', error);

    // Handle Zod validation errors (from schema refinements)
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
