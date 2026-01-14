/**
 * Supabase Query Functions for Community Bulletin Board
 *
 * Feature: 051-community-bulletin-board
 *
 * All bulletin board database operations using Supabase client.
 * Includes rate limiting, duplicate detection, and pagination.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  BulletinPost,
  BulletinPostWithAuthor,
  BulletinReply,
  BulletinReplyWithAuthor,
  BulletinReport,
  CreatePostInput,
  UpdatePostInput,
  CreateReplyInput,
  CreateReportInput,
  PostsQueryParams,
  PaginatedPosts,
  PostError,
} from '@/types/bulletin';
import { BULLETIN_CONSTANTS } from '@/types/bulletin';

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// Ban Check Functions
// ============================================================================

/**
 * Check if user is banned from the bulletin board
 */
export async function isUserBulletinBanned(
  supabase: SupabaseClientType,
  userId: string
): Promise<boolean> {
  const { data } = await supabase.rpc('is_user_bulletin_banned', {
    p_user_id: userId,
  });
  return data === true;
}

/**
 * Create a BannedError for throwing when user is banned
 */
function createBannedError(): PostError {
  return {
    type: 'banned' as const,
    message: 'You are currently banned from the bulletin board',
  };
}

// ============================================================================
// Posts Queries
// ============================================================================

/**
 * Fetch paginated bulletin posts with optional filters
 * Uses cursor-based pagination for efficient infinite scroll
 */
export async function fetchBulletinPosts(
  supabase: SupabaseClientType,
  params: PostsQueryParams = {}
): Promise<PaginatedPosts> {
  const limit = params.limit ?? BULLETIN_CONSTANTS.POSTS_PER_PAGE;

  // Debug logging to help identify "All posts" filter issue
  console.log('[fetchBulletinPosts] Called with params:', {
    tag: params.tag,
    search: params.search,
    cursor: params.cursor,
    limit,
  });

  let query = supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 to detect hasMore

  if (params.tag) {
    console.log('[fetchBulletinPosts] Adding tag filter:', params.tag);
    query = query.eq('tag', params.tag);
  } else {
    console.log('[fetchBulletinPosts] No tag filter - fetching ALL posts');
  }

  if (params.search) {
    query = query.textSearch('content_tsvector', params.search, {
      type: 'websearch',
      config: 'english',
    });
  }

  if (params.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[fetchBulletinPosts] Query error:', error);
    throw error;
  }

  const posts = data as BulletinPostWithAuthor[];
  const hasMore = posts.length > limit;
  const resultPosts = hasMore ? posts.slice(0, limit) : posts;
  const nextCursor = hasMore
    ? resultPosts[resultPosts.length - 1].created_at
    : null;

  // Debug logging for results
  console.log('[fetchBulletinPosts] Results:', {
    totalReturned: posts.length,
    hasMore,
    postIds: resultPosts.map((p) => ({ id: p.id, tag: p.tag })),
  });

  return { posts: resultPosts, hasMore, nextCursor };
}

/**
 * Fetch a single post by ID (includes archived posts for direct links)
 */
export async function fetchBulletinPost(
  supabase: SupabaseClientType,
  postId: string
): Promise<BulletinPostWithAuthor | null> {
  const { data, error } = await supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .eq('id', postId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as BulletinPostWithAuthor | null;
}

/**
 * Create a new bulletin post with rate limit and duplicate checks
 */
export async function createBulletinPost(
  supabase: SupabaseClientType,
  input: CreatePostInput
): Promise<BulletinPost> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is banned (T064)
  const isBanned = await isUserBulletinBanned(supabase, user.id);
  if (isBanned) throw createBannedError();

  // Check rate limit
  const { data: canPost } = await supabase.rpc('check_bulletin_rate_limit', {
    p_user_id: user.id,
    p_action_type: 'post',
  });

  if (!canPost) {
    const error: PostError = {
      type: 'rate_limit',
      limit: BULLETIN_CONSTANTS.DAILY_POST_LIMIT,
      resetAt: getNextMidnight().toISOString(),
      message: 'Daily post limit reached',
    };
    throw error;
  }

  // Check for duplicates
  const { data: isUnique } = await supabase.rpc('check_duplicate_bulletin_post', {
    p_user_id: user.id,
    p_content: input.content,
  });

  if (!isUnique) {
    const error: PostError = {
      type: 'duplicate',
      message: 'You already posted this content',
    };
    throw error;
  }

  // Create the post
  const { data, error } = await supabase
    .from('bulletin_posts')
    .insert({
      author_id: user.id,
      content: input.content,
      tag: input.tag ?? null,
      linked_content_type: input.linked_content_type ?? null,
      linked_content_id: input.linked_content_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data as BulletinPost;
}

/**
 * Update an existing post (content and/or tag)
 */
export async function updateBulletinPost(
  supabase: SupabaseClientType,
  postId: string,
  input: UpdatePostInput
): Promise<BulletinPost> {
  const { data, error } = await supabase
    .from('bulletin_posts')
    .update({
      content: input.content,
      tag: input.tag,
      updated_at: new Date().toISOString(),
    })
    .eq('id', postId)
    .select()
    .single();

  if (error) throw error;
  return data as BulletinPost;
}

/**
 * Soft delete a post (sets is_deleted = true)
 */
export async function deleteBulletinPost(
  supabase: SupabaseClientType,
  postId: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletin_posts')
    .update({ is_deleted: true })
    .eq('id', postId);

  if (error) throw error;
}

// ============================================================================
// Replies Queries
// ============================================================================

/**
 * Fetch all replies for a post with author info
 */
export async function fetchBulletinReplies(
  supabase: SupabaseClientType,
  postId: string
): Promise<BulletinReplyWithAuthor[]> {
  const { data, error } = await supabase
    .from('v_bulletin_replies_with_author')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data as BulletinReplyWithAuthor[];
}

/**
 * Create a reply with rate limit check and notification trigger
 */
export async function createBulletinReply(
  supabase: SupabaseClientType,
  input: CreateReplyInput
): Promise<BulletinReply> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if user is banned (T064)
  const isBanned = await isUserBulletinBanned(supabase, user.id);
  if (isBanned) throw createBannedError();

  // Check rate limit
  const { data: canReply } = await supabase.rpc('check_bulletin_rate_limit', {
    p_user_id: user.id,
    p_action_type: 'reply',
  });

  if (!canReply) {
    const error: PostError = {
      type: 'rate_limit',
      limit: BULLETIN_CONSTANTS.DAILY_REPLY_LIMIT,
      resetAt: getNextMidnight().toISOString(),
      message: 'Daily reply limit reached',
    };
    throw error;
  }

  // Determine depth
  let depth: 1 | 2 = 1;
  if (input.parent_reply_id) {
    const { data: parent } = await supabase
      .from('bulletin_replies')
      .select('depth')
      .eq('id', input.parent_reply_id)
      .single();

    depth = parent ? (Math.min(parent.depth + 1, 2) as 1 | 2) : 1;
  }

  // Create the reply
  const { data, error } = await supabase
    .from('bulletin_replies')
    .insert({
      post_id: input.post_id,
      author_id: user.id,
      parent_reply_id: input.parent_reply_id ?? null,
      content: input.content,
      depth,
    })
    .select()
    .single();

  if (error) throw error;

  // Trigger notification for first 3 replies
  await triggerReplyNotification(supabase, input.post_id, data.id, user.id);

  return data as BulletinReply;
}

/**
 * Update a reply's content
 */
export async function updateBulletinReply(
  supabase: SupabaseClientType,
  replyId: string,
  content: string
): Promise<BulletinReply> {
  const { data, error } = await supabase
    .from('bulletin_replies')
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', replyId)
    .select()
    .single();

  if (error) throw error;
  return data as BulletinReply;
}

/**
 * Soft delete a reply
 */
export async function deleteBulletinReply(
  supabase: SupabaseClientType,
  replyId: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletin_replies')
    .update({ is_deleted: true })
    .eq('id', replyId);

  if (error) throw error;
}

// ============================================================================
// Reports Queries
// ============================================================================

/**
 * Create a report for a post or reply
 */
export async function createBulletinReport(
  supabase: SupabaseClientType,
  input: CreateReportInput
): Promise<BulletinReport> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('bulletin_reports')
    .insert({
      reporter_id: user.id,
      target_type: input.target_type,
      target_id: input.target_id,
      reason: input.reason,
      details: input.details ?? null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      // Unique constraint violation - already reported
      const dupError: PostError = {
        type: 'duplicate',
        message: 'You already reported this content',
      };
      throw dupError;
    }
    throw error;
  }

  return data as BulletinReport;
}

// ============================================================================
// Search Queries
// ============================================================================

/**
 * Full-text search across bulletin posts
 */
export async function searchBulletinPosts(
  supabase: SupabaseClientType,
  query: string,
  limit = BULLETIN_CONSTANTS.POSTS_PER_PAGE
): Promise<BulletinPostWithAuthor[]> {
  const { data, error } = await supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .textSearch('content_tsvector', query, {
      type: 'websearch',
      config: 'english',
    })
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data as BulletinPostWithAuthor[];
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the next midnight for rate limit reset time
 */
function getNextMidnight(): Date {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow;
}

/**
 * Trigger notification for first 3 replies to a post
 */
async function triggerReplyNotification(
  supabase: SupabaseClientType,
  postId: string,
  replyId: string,
  replierId: string
): Promise<void> {
  // Count existing replies
  const { count } = await supabase
    .from('bulletin_replies')
    .select('*', { count: 'exact', head: true })
    .eq('post_id', postId);

  if (count && count <= BULLETIN_CONSTANTS.NOTIFICATION_REPLY_LIMIT) {
    // Get post author
    const { data: post } = await supabase
      .from('bulletin_posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (post && post.author_id !== replierId) {
      // Create notification (if notifications table exists)
      try {
        await supabase.from('notifications').insert({
          user_id: post.author_id,
          type: 'bulletin_reply',
          data: {
            post_id: postId,
            reply_id: replyId,
            replier_id: replierId,
          },
        });
      } catch {
        // Silently fail if notifications table doesn't exist
        console.warn('Could not create notification - table may not exist');
      }
    }
  }
}

/**
 * Check if user can edit a post (within 15-min window)
 */
export async function canEditBulletinPost(
  supabase: SupabaseClientType,
  postId: string
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase.rpc('can_edit_bulletin_post', {
    p_post_id: postId,
    p_user_id: user.id,
  });

  return data === true;
}

/**
 * Get rate limit status for current user
 */
export async function getRateLimitStatus(supabase: SupabaseClientType) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase.rpc('get_bulletin_rate_limit_status', {
    p_user_id: user.id,
  });

  if (error) throw error;
  return data;
}
