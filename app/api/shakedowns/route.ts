/* eslint-disable @typescript-eslint/no-explicit-any -- shakedowns tables not in generated types */
/**
 * API Route: Shakedowns
 *
 * Feature: 001-community-shakedowns
 * Task: T018 (POST), T026 (GET)
 *
 * POST /api/shakedowns - Create a new shakedown request
 * GET /api/shakedowns - List shakedowns with pagination and filters
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  createShakedownSchema,
  shakedownsQuerySchema,
} from '@/lib/shakedown-schemas';
import { generateShareToken } from '@/lib/shakedown-utils';
import type {
  Shakedown,
  ShakedownWithAuthor,
  ExperienceLevel,
  ShakedownPrivacy,
  ShakedownStatus,
  PaginatedShakedowns,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

interface CreateShakedownResponse {
  shakedown: Shakedown;
  shareUrl?: string;
}

interface ErrorResponse {
  error: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Database row type for shakedowns table
 * Note: This is defined here until Supabase types are regenerated
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
}

/**
 * Database row type for v_shakedowns_feed view
 */
interface ShakedownFeedDbRow {
  id: string;
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  status: ShakedownStatus;
  feedback_count: number;
  helpful_count: number;
  created_at: string;
  updated_at: string;
  // Author info from view
  author_name: string;
  author_avatar: string | null;
  // Loadout info from view
  loadout_name: string;
  total_weight_grams: number;
  item_count: number;
}

/**
 * Insert payload for shakedowns table
 */
interface ShakedownInsertPayload {
  owner_id: string;
  loadout_id: string;
  trip_name: string;
  trip_start_date: string;
  trip_end_date: string;
  experience_level: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  share_token: string | null;
  status: 'open';
  feedback_count: number;
  helpful_count: number;
  is_hidden: boolean;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Maps database row to Shakedown type (snake_case to camelCase)
 */
function mapDbRowToShakedown(row: ShakedownDbRow): Shakedown {
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
  };
}

/**
 * Maps feed view row to ShakedownWithAuthor type
 */
function mapFeedRowToShakedownWithAuthor(
  row: ShakedownFeedDbRow
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
    shareToken: null, // Not included in feed view for security
    status: row.status,
    feedbackCount: row.feedback_count,
    helpfulCount: row.helpful_count,
    isHidden: false, // View filters hidden items
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: null, // Not included in feed view
    archivedAt: null, // Not included in feed view
    // Author info
    authorName: row.author_name,
    authorAvatar: row.author_avatar,
    // Loadout info
    loadoutName: row.loadout_name,
    totalWeightGrams: row.total_weight_grams,
    itemCount: row.item_count,
  };
}

/**
 * Generates the share URL for a public shakedown
 */
function getShareUrl(shareToken: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return `${baseUrl}/shakedown/${shareToken}`;
}

// =============================================================================
// GET Handler - List Shakedowns
// =============================================================================

export async function GET(
  request: NextRequest
): Promise<NextResponse<PaginatedShakedowns | ErrorResponse>> {
  try {
    const supabase = await createClient();

    // Get current user (optional - affects what they can see)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      cursor: searchParams.get('cursor') || undefined,
      limit: searchParams.get('limit') || undefined,
      status: searchParams.get('status') || undefined,
      experienceLevel: searchParams.get('experienceLevel') || undefined,
      search: searchParams.get('search') || undefined,
      sort: searchParams.get('sort') || undefined,
      friendsFirst: searchParams.get('friendsFirst') || undefined,
    };

    // Validate query parameters
    const validation = shakedownsQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid query parameters',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { cursor, limit, status, experienceLevel, search, sort, friendsFirst } =
      validation.data;

    // Request one extra to determine if there are more results
    const queryLimit = limit + 1;

    // Build the base query on the feed view
    // Note: Using type assertion until Supabase types are regenerated
     
    let query = (supabase as any)
      .from('v_shakedowns_feed')
      .select('*');

    // Apply status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Apply experience level filter
    if (experienceLevel) {
      query = query.eq('experience_level', experienceLevel);
    }

    // Apply search filter (trigram search on trip_name)
    if (search && search.trim()) {
      // SECURITY: Comprehensive sanitization for ILIKE search
      // Escape ILIKE wildcards, SQL special characters, and all PostgREST operators
      const sanitizedSearch = search.trim()
        .replace(/\\/g, '\\\\')           // Escape backslashes first
        .replace(/'/g, "''")              // Escape single quotes for SQL
        .replace(/%/g, '\\%')             // Escape % wildcards
        .replace(/_/g, '\\_')             // Escape _ wildcards
        .replace(/[(),\.\|&!<>@]/g, '');  // Remove PostgREST operators (extended set)

      // Additional validation: limit search length to prevent DoS
      const MAX_SEARCH_LENGTH = 100;
      const truncatedSearch = sanitizedSearch.substring(0, MAX_SEARCH_LENGTH);

      if (truncatedSearch.length > 0) {
        // Use ilike for basic search (trigram extension provides fuzzy matching)
        query = query.ilike('trip_name', `%${truncatedSearch}%`);
      }
    }

    // Apply cursor-based pagination
    if (cursor) {
      // Cursor is the created_at timestamp of the last item
      if (sort === 'unanswered') {
        // For unanswered, we sort ASC so get items AFTER cursor
        query = query.gt('created_at', cursor);
      } else {
        // For recent and popular, we sort DESC so get items BEFORE cursor
        query = query.lt('created_at', cursor);
      }
    }

    // Apply sorting
    switch (sort) {
      case 'popular':
        // Sort by feedback count DESC, then created_at DESC for tie-breaking
        query = query
          .order('feedback_count', { ascending: false })
          .order('created_at', { ascending: false });
        break;
      case 'unanswered':
        // Only show items with no feedback, sorted by oldest first
        query = query
          .eq('feedback_count', 0)
          .order('created_at', { ascending: true });
        break;
      case 'recent':
      default:
        // Most recent first
        query = query.order('created_at', { ascending: false });
        break;
    }

    // Apply limit
    query = query.limit(queryLimit);

    // Execute query
    const { data: rows, error: queryError } = await query;

    if (queryError) {
      console.error('[API] Failed to fetch shakedowns:', queryError);
      return NextResponse.json(
        { error: 'Failed to fetch shakedowns' },
        { status: 500 }
      );
    }

    // Type the rows
    const feedRows = (rows || []) as ShakedownFeedDbRow[];

    // Determine if there are more results
    const hasMore = feedRows.length > limit;
    const resultRows = hasMore ? feedRows.slice(0, limit) : feedRows;

    // Map to ShakedownWithAuthor
    let shakedowns = resultRows.map(mapFeedRowToShakedownWithAuthor);

    // If friendsFirst is enabled and user is authenticated, reorder results
    if (friendsFirst && user) {
      // Get user's friend IDs - use separate queries to avoid string interpolation
      // This prevents potential injection if user.id format changes in the future
      const [{ data: friendships1 }, { data: friendships2 }] = await Promise.all([
        (supabase as any)
          .from('friendships')
          .select('user_id, friend_id')
          .eq('user_id', user.id),
        (supabase as any)
          .from('friendships')
          .select('user_id, friend_id')
          .eq('friend_id', user.id),
      ]);
      const friendships = [...(friendships1 || []), ...(friendships2 || [])];

      if (friendships && friendships.length > 0) {
        const friendIds = new Set<string>();
        for (const f of friendships) {
          if (f.user_id === user.id) {
            friendIds.add(f.friend_id);
          } else {
            friendIds.add(f.user_id);
          }
        }

        // Separate friend and non-friend shakedowns
        const friendShakedowns = shakedowns.filter((s) =>
          friendIds.has(s.ownerId)
        );
        const otherShakedowns = shakedowns.filter(
          (s) => !friendIds.has(s.ownerId)
        );

        // Combine with friends first
        shakedowns = [...friendShakedowns, ...otherShakedowns];
      }
    }

    // Determine next cursor
    let nextCursor: string | null = null;
    if (hasMore && resultRows.length > 0) {
      const lastItem = resultRows[resultRows.length - 1];
      nextCursor = lastItem.created_at;
    }

    const response: PaginatedShakedowns = {
      shakedowns,
      hasMore,
      nextCursor,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[API] Shakedowns list error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST Handler - Create Shakedown
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CreateShakedownResponse | ErrorResponse>> {
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
    const validation = createShakedownSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const {
      loadoutId,
      tripName,
      tripStartDate,
      tripEndDate,
      experienceLevel,
      concerns,
      privacy,
    } = validation.data;

    // Verify loadout exists and belongs to user
    const { data: loadout, error: loadoutError } = await (supabase as any)
      .from('loadouts')
      .select('id, user_id')
      .eq('id', loadoutId)
      .single();

    if (loadoutError || !loadout) {
      return NextResponse.json(
        { error: 'Loadout not found' },
        { status: 404 }
      );
    }

    if (loadout.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Loadout not found or not owned by user' },
        { status: 404 }
      );
    }

    // Generate share token for public shakedowns
    const shareToken = privacy === 'public' ? generateShareToken() : null;

    // Build insert payload
    const insertPayload: ShakedownInsertPayload = {
      owner_id: user.id,
      loadout_id: loadoutId,
      trip_name: tripName,
      trip_start_date: tripStartDate,
      trip_end_date: tripEndDate,
      experience_level: experienceLevel,
      concerns: concerns || null,
      privacy,
      share_token: shareToken,
      status: 'open',
      feedback_count: 0,
      helpful_count: 0,
      is_hidden: false,
    };

    // Insert shakedown into database
    // Note: Using type assertion until Supabase types are regenerated with shakedowns table
     
    const { data: shakedown, error: insertError } = await (supabase as any)
      .from('shakedowns')
      .insert(insertPayload)
      .select('*')
      .single();

    if (insertError) {
      console.error('[API] Failed to create shakedown:', insertError);
      return NextResponse.json(
        { error: 'Failed to create shakedown' },
        { status: 500 }
      );
    }

    // Map database row to typed response
    const mappedShakedown = mapDbRowToShakedown(shakedown as unknown as ShakedownDbRow);

    // Build response
    const response: CreateShakedownResponse = {
      shakedown: mappedShakedown,
    };

    // Add share URL for public shakedowns
    if (privacy === 'public' && shareToken) {
      response.shareUrl = getShareUrl(shareToken);
    }

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[API] Shakedown creation error:', error);

    // Handle Zod validation errors (from schema refinements)
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
