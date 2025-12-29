/**
 * API Route: Shakedown Bookmark Detail
 *
 * Feature: 001-community-shakedowns
 * Task: T062
 *
 * DELETE /api/shakedowns/bookmarks/[id] - Remove a bookmark
 * PATCH /api/shakedowns/bookmarks/[id] - Update bookmark note
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { updateBookmarkSchema } from '@/lib/shakedown-schemas';
import type {
  ShakedownBookmark,
  ShakedownPrivacy,
  ShakedownStatus,
  ExperienceLevel,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

/**
 * Extended bookmark type including full shakedown data
 */
interface BookmarkedShakedown extends ShakedownBookmark {
  shakedown: {
    id: string;
    ownerId: string;
    tripName: string;
    tripStartDate: string;
    tripEndDate: string;
    experienceLevel: ExperienceLevel;
    privacy: ShakedownPrivacy;
    status: ShakedownStatus;
    feedbackCount: number;
    helpfulCount: number;
    createdAt: string;
    authorName: string;
    authorAvatar: string | null;
    loadoutName: string;
    totalWeightGrams: number;
    itemCount: number;
  };
}

interface DeleteBookmarkResponse {
  success: true;
}

interface UpdateBookmarkResponse {
  bookmark: BookmarkedShakedown;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row from shakedown_bookmarks table
 */
interface BookmarkDbRow {
  id: string;
  user_id: string;
  shakedown_id: string;
  note: string | null;
  created_at: string;
}

/**
 * Database row from v_shakedowns_feed view
 */
interface ShakedownFeedDbRow {
  id: string;
  owner_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: ExperienceLevel;
  privacy: ShakedownPrivacy;
  status: ShakedownStatus;
  feedback_count: number;
  helpful_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  loadout_name: string;
  total_weight_grams: number;
  item_count: number;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps database bookmark row to ShakedownBookmark type (snake_case to camelCase)
 */
function mapDbRowToBookmark(row: BookmarkDbRow): ShakedownBookmark {
  return {
    id: row.id,
    userId: row.user_id,
    shakedownId: row.shakedown_id,
    note: row.note,
    createdAt: row.created_at,
  };
}

/**
 * Combines bookmark and shakedown data into BookmarkedShakedown
 */
function combineBookmarkAndShakedown(
  bookmark: BookmarkDbRow,
  shakedown: ShakedownFeedDbRow
): BookmarkedShakedown {
  return {
    ...mapDbRowToBookmark(bookmark),
    shakedown: {
      id: shakedown.id,
      ownerId: shakedown.owner_id,
      tripName: shakedown.trip_name,
      tripStartDate: shakedown.trip_start_date,
      tripEndDate: shakedown.trip_end_date,
      experienceLevel: shakedown.experience_level,
      privacy: shakedown.privacy,
      status: shakedown.status,
      feedbackCount: shakedown.feedback_count,
      helpfulCount: shakedown.helpful_count,
      createdAt: shakedown.created_at,
      authorName: shakedown.author_name,
      authorAvatar: shakedown.author_avatar,
      loadoutName: shakedown.loadout_name,
      totalWeightGrams: shakedown.total_weight_grams,
      itemCount: shakedown.item_count,
    },
  };
}

// =============================================================================
// DELETE Handler - Remove Bookmark
// =============================================================================

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<DeleteBookmarkResponse | ErrorResponse>> {
  try {
    const { id: bookmarkId } = await params;

    // Validate bookmark ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookmarkId)) {
      return NextResponse.json(
        { error: 'Invalid bookmark ID format' },
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

    // Verify bookmark exists and belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookmark, error: fetchError } = await (supabase as any)
      .from('shakedown_bookmarks')
      .select('id, user_id')
      .eq('id', bookmarkId)
      .single();

    if (fetchError || !bookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (bookmark.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Delete bookmark
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from('shakedown_bookmarks')
      .delete()
      .eq('id', bookmarkId);

    if (deleteError) {
      console.error('[API] Failed to delete bookmark:', deleteError);
      return NextResponse.json(
        { error: 'Failed to delete bookmark' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API] Delete bookmark error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH Handler - Update Bookmark Note
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<UpdateBookmarkResponse | ErrorResponse>> {
  try {
    const { id: bookmarkId } = await params;

    // Validate bookmark ID format (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(bookmarkId)) {
      return NextResponse.json(
        { error: 'Invalid bookmark ID format' },
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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = updateBookmarkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { note } = validation.data;

    // Verify bookmark exists and belongs to user
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingBookmark, error: fetchError } = await (supabase as any)
      .from('shakedown_bookmarks')
      .select('id, user_id, shakedown_id')
      .eq('id', bookmarkId)
      .single();

    if (fetchError || !existingBookmark) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Verify ownership
    if (existingBookmark.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Bookmark not found' },
        { status: 404 }
      );
    }

    // Update bookmark note
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: updatedBookmark, error: updateError } = await (supabase as any)
      .from('shakedown_bookmarks')
      .update({ note: note ?? null })
      .eq('id', bookmarkId)
      .select('*')
      .single();

    if (updateError) {
      console.error('[API] Failed to update bookmark:', updateError);
      return NextResponse.json(
        { error: 'Failed to update bookmark' },
        { status: 500 }
      );
    }

    // Fetch shakedown data from feed view for response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownFeedRow, error: feedError } = await (supabase as any)
      .from('v_shakedowns_feed')
      .select('*')
      .eq('id', existingBookmark.shakedown_id)
      .single();

    if (feedError || !shakedownFeedRow) {
      console.error('[API] Failed to fetch shakedown feed data:', feedError);

      // Return bookmark with minimal shakedown data if feed fetch fails
      // Empty strings allow client-side i18n to display "Unknown" in user's language
      const minimalBookmark: BookmarkedShakedown = {
        ...mapDbRowToBookmark(updatedBookmark as BookmarkDbRow),
        shakedown: {
          id: existingBookmark.shakedown_id,
          ownerId: '',
          tripName: '',
          tripStartDate: '',
          tripEndDate: '',
          experienceLevel: 'beginner',
          privacy: 'public',
          status: 'open',
          feedbackCount: 0,
          helpfulCount: 0,
          createdAt: '',
          authorName: '',
          authorAvatar: null,
          loadoutName: '',
          totalWeightGrams: 0,
          itemCount: 0,
        },
      };

      return NextResponse.json({ bookmark: minimalBookmark });
    }

    const bookmarkedShakedown = combineBookmarkAndShakedown(
      updatedBookmark as BookmarkDbRow,
      shakedownFeedRow as ShakedownFeedDbRow
    );

    return NextResponse.json({ bookmark: bookmarkedShakedown });
  } catch (error) {
    console.error('[API] Update bookmark error:', error);

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
