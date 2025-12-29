/**
 * API Route: Shakedown Bookmarks
 *
 * Feature: 001-community-shakedowns
 * Task: T060, T061
 *
 * GET /api/shakedowns/bookmarks - List user's bookmarked shakedowns
 * POST /api/shakedowns/bookmarks - Add a bookmark to a shakedown
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { bookmarkSchema } from '@/lib/shakedown-schemas';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
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

interface ListBookmarksResponse {
  bookmarks: BookmarkedShakedown[];
  nextCursor: string | null;
}

interface CreateBookmarkResponse {
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

/**
 * Database row from shakedowns table for access checks
 */
interface ShakedownAccessRow {
  id: string;
  owner_id: string;
  privacy: ShakedownPrivacy;
  is_hidden: boolean;
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

/**
 * Checks if two users are friends (canonical ordering)
 */
async function checkAreFriends(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId1: string,
  userId2: string
): Promise<boolean> {
  const [user1, user2] =
    userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

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

  // Hidden shakedowns are inaccessible
  if (shakedown.is_hidden) {
    return false;
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
// GET Handler - List User's Bookmarks
// =============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<ListBookmarksResponse | ErrorResponse>> {
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const cursor = searchParams.get('cursor');
    const limitParam = searchParams.get('limit');
    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || SHAKEDOWN_CONSTANTS.ITEMS_PER_PAGE, 1), 50)
      : SHAKEDOWN_CONSTANTS.ITEMS_PER_PAGE;

    // Request one extra to determine if there are more results
    const queryLimit = limit + 1;

    // Build query for user's bookmarks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('shakedown_bookmarks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    // Apply cursor-based pagination
    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    query = query.limit(queryLimit);

    // Execute query
    const { data: bookmarkRows, error: bookmarksError } = await query;

    if (bookmarksError) {
      console.error('[API] Failed to fetch bookmarks:', bookmarksError);
      return NextResponse.json(
        { error: 'Failed to fetch bookmarks' },
        { status: 500 }
      );
    }

    const bookmarks = (bookmarkRows || []) as BookmarkDbRow[];

    // Determine if there are more results
    const hasMore = bookmarks.length > limit;
    const resultBookmarks = hasMore ? bookmarks.slice(0, limit) : bookmarks;

    // If no bookmarks, return empty result
    if (resultBookmarks.length === 0) {
      return NextResponse.json({ bookmarks: [], nextCursor: null });
    }

    // Get shakedown IDs to fetch full data
    const shakedownIds = resultBookmarks.map((b) => b.shakedown_id);

    // Fetch shakedown data from feed view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownRows, error: shakedownsError } = await (supabase as any)
      .from('v_shakedowns_feed')
      .select('*')
      .in('id', shakedownIds);

    if (shakedownsError) {
      console.error('[API] Failed to fetch shakedown data:', shakedownsError);
      return NextResponse.json(
        { error: 'Failed to fetch shakedown data' },
        { status: 500 }
      );
    }

    // Create a map of shakedown data by ID
    const shakedownMap = new Map<string, ShakedownFeedDbRow>();
    for (const row of (shakedownRows || []) as ShakedownFeedDbRow[]) {
      shakedownMap.set(row.id, row);
    }

    // Combine bookmarks with shakedown data, filtering out any missing shakedowns
    const bookmarkedShakedowns: BookmarkedShakedown[] = [];
    for (const bookmark of resultBookmarks) {
      const shakedown = shakedownMap.get(bookmark.shakedown_id);
      if (shakedown) {
        bookmarkedShakedowns.push(combineBookmarkAndShakedown(bookmark, shakedown));
      }
    }

    // Determine next cursor
    let nextCursor: string | null = null;
    if (hasMore && resultBookmarks.length > 0) {
      const lastBookmark = resultBookmarks[resultBookmarks.length - 1];
      nextCursor = lastBookmark.created_at;
    }

    return NextResponse.json({
      bookmarks: bookmarkedShakedowns,
      nextCursor,
    });
  } catch (error) {
    console.error('[API] List bookmarks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST Handler - Add Bookmark
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateBookmarkResponse | ErrorResponse>> {
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
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const validation = bookmarkSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { shakedownId, note } = validation.data;

    // Verify shakedown exists and is accessible
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownRow, error: shakedownError } = await (supabase as any)
      .from('shakedowns')
      .select('id, owner_id, privacy, is_hidden')
      .eq('id', shakedownId)
      .single();

    if (shakedownError || !shakedownRow) {
      return NextResponse.json(
        { error: 'Shakedown not found' },
        { status: 404 }
      );
    }

    const shakedown = shakedownRow as ShakedownAccessRow;

    // Check accessibility
    const hasAccess = await canAccessShakedown(supabase, shakedown, user.id);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Cannot access this shakedown' },
        { status: 403 }
      );
    }

    // Check for existing bookmark (duplicate)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingBookmark } = await (supabase as any)
      .from('shakedown_bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('shakedown_id', shakedownId)
      .maybeSingle();

    if (existingBookmark) {
      return NextResponse.json(
        { error: 'Shakedown already bookmarked', code: 'DUPLICATE_BOOKMARK' },
        { status: 409 }
      );
    }

    // Insert bookmark
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: insertedBookmark, error: insertError } = await (supabase as any)
      .from('shakedown_bookmarks')
      .insert({
        user_id: user.id,
        shakedown_id: shakedownId,
        note: note || null,
      })
      .select('*')
      .single();

    if (insertError) {
      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Shakedown already bookmarked', code: 'DUPLICATE_BOOKMARK' },
          { status: 409 }
        );
      }
      console.error('[API] Failed to create bookmark:', insertError);
      return NextResponse.json(
        { error: 'Failed to create bookmark' },
        { status: 500 }
      );
    }

    // Fetch shakedown data from feed view for response
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: shakedownFeedRow, error: feedError } = await (supabase as any)
      .from('v_shakedowns_feed')
      .select('*')
      .eq('id', shakedownId)
      .single();

    if (feedError || !shakedownFeedRow) {
      console.error('[API] Failed to fetch shakedown feed data:', feedError);

      // Return bookmark with minimal shakedown data if feed fetch fails
      const minimalBookmark: BookmarkedShakedown = {
        ...mapDbRowToBookmark(insertedBookmark as BookmarkDbRow),
        shakedown: {
          id: shakedownId,
          ownerId: shakedown.owner_id,
          tripName: 'Unknown',
          tripStartDate: '',
          tripEndDate: '',
          experienceLevel: 'beginner',
          privacy: shakedown.privacy,
          status: 'open',
          feedbackCount: 0,
          helpfulCount: 0,
          createdAt: '',
          authorName: 'Unknown',
          authorAvatar: null,
          loadoutName: 'Unknown',
          totalWeightGrams: 0,
          itemCount: 0,
        },
      };

      return NextResponse.json({ bookmark: minimalBookmark }, { status: 201 });
    }

    const bookmarkedShakedown = combineBookmarkAndShakedown(
      insertedBookmark as BookmarkDbRow,
      shakedownFeedRow as ShakedownFeedDbRow
    );

    return NextResponse.json({ bookmark: bookmarkedShakedown }, { status: 201 });
  } catch (error) {
    console.error('[API] Create bookmark error:', error);

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
