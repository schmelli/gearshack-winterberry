/**
 * API Route: Shakedown Feedback Edit/Delete
 *
 * Feature: 001-community-shakedowns
 * Task: T045
 *
 * PATCH /api/shakedowns/feedback/[id] - Edit feedback (within 30-minute window)
 * DELETE /api/shakedowns/feedback/[id] - Delete feedback (author or admin only)
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { updateFeedbackSchema } from '@/lib/shakedown-schemas';
import { canEditFeedback } from '@/lib/shakedown-utils';
import type { FeedbackWithAuthor } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface UpdateFeedbackResponse {
  feedback: FeedbackWithAuthor;
}

interface DeleteFeedbackResponse {
  success: true;
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
 * Profile row for admin check
 */
interface ProfileRow {
  is_admin: boolean;
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
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    authorReputation: row.author_reputation,
    gearItemName: row.gear_item_name,
  };
}

/**
 * Checks if user is an admin via profile
 */
async function checkIsAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('is_admin')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('[API] Error checking admin status:', error);
    return false;
  }

  const profile = data as ProfileRow | null;
  return profile?.is_admin ?? false;
}

// =============================================================================
// PATCH Handler - Edit Feedback
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateFeedbackResponse | ErrorResponse>> {
  try {
    const { id: feedbackId } = await params;

    // Validate feedback ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(feedbackId)) {
      return NextResponse.json(
        { error: 'Invalid feedback ID format' },
        { status: 400 }
      );
    }

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

    const validation = updateFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { content } = validation.data;

    // Fetch existing feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFeedback, error: fetchError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const feedback = existingFeedback as FeedbackDbRow;

    // Check if feedback is hidden
    if (feedback.is_hidden) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (feedback.author_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only edit your own feedback', code: 'NOT_AUTHOR' },
        { status: 403 }
      );
    }

    // Check if within edit window (30 minutes)
    if (!canEditFeedback(feedback.created_at)) {
      return NextResponse.json(
        {
          error: 'Edit window has expired. Feedback can only be edited within 30 minutes of creation.',
          code: 'EDIT_WINDOW_EXPIRED',
        },
        { status: 403 }
      );
    }

    // Update feedback
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('shakedown_feedback')
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: now,
        updated_at: now,
      })
      .eq('id', feedbackId);

    if (updateError) {
      console.error('[API] Failed to update feedback:', updateError);
      return NextResponse.json(
        { error: 'Failed to update feedback' },
        { status: 500 }
      );
    }

    // Fetch updated feedback with author info from view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedFeedback, error: viewError } = await (supabase as any)
      .from('v_shakedown_feedback_with_author')
      .select('*')
      .eq('id', feedbackId)
      .single();

    if (viewError || !updatedFeedback) {
      console.error('[API] Failed to fetch updated feedback:', viewError);

      // Return minimal feedback data if view fetch fails
      const minimalFeedback: FeedbackWithAuthor = {
        id: feedbackId,
        shakedownId: feedback.shakedown_id,
        authorId: feedback.author_id,
        parentId: feedback.parent_id,
        gearItemId: feedback.gear_item_id,
        content: content.trim(),
        contentHtml: null,
        depth: feedback.depth,
        helpfulCount: feedback.helpful_count,
        isHidden: feedback.is_hidden,
        isEdited: true,
        editedAt: now,
        createdAt: feedback.created_at,
        updatedAt: now,
        authorName: 'Unknown',
        authorAvatar: null,
        authorReputation: 0,
        gearItemName: null,
      };

      return NextResponse.json({ feedback: minimalFeedback });
    }

    const mappedFeedback = mapViewRowToFeedback(updatedFeedback as FeedbackViewRow);

    return NextResponse.json({ feedback: mappedFeedback });
  } catch (error) {
    console.error('[API] Feedback update error:', error);

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
// DELETE Handler - Delete Feedback
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteFeedbackResponse | ErrorResponse>> {
  try {
    const { id: feedbackId } = await params;

    // Validate feedback ID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(feedbackId)) {
      return NextResponse.json(
        { error: 'Invalid feedback ID format' },
        { status: 400 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch existing feedback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingFeedback, error: fetchError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('id, author_id, is_hidden, shakedown_id')
      .eq('id', feedbackId)
      .single();

    if (fetchError || !existingFeedback) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    const feedback = existingFeedback as Pick<
      FeedbackDbRow,
      'id' | 'author_id' | 'is_hidden' | 'shakedown_id'
    >;

    // Check if feedback is already hidden
    if (feedback.is_hidden) {
      return NextResponse.json(
        { error: 'Feedback not found' },
        { status: 404 }
      );
    }

    // Check authorization: must be author OR admin
    const isAuthor = feedback.author_id === user.id;
    const isAdmin = await checkIsAdmin(supabase, user.id);

    if (!isAuthor && !isAdmin) {
      return NextResponse.json(
        {
          error: 'You can only delete your own feedback',
          code: 'NOT_AUTHORIZED',
        },
        { status: 403 }
      );
    }

    // Soft delete: Set is_hidden = true
    // This preserves data for moderation/audit and handles child replies gracefully
    // (child replies will remain visible but orphaned - UI should handle this)
    const now = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('shakedown_feedback')
      .update({
        is_hidden: true,
        updated_at: now,
      })
      .eq('id', feedbackId);

    if (deleteError) {
      console.error('[API] Failed to delete feedback:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      );
    }

    // Note: Child replies are NOT hidden automatically
    // The UI should display "[deleted]" placeholder for hidden parent feedback
    // This preserves the conversation context for child replies

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Feedback delete error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
