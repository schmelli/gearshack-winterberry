# API Contract: Community Bulletin Board

**Feature**: 051-community-bulletin-board
**Date**: 2025-12-29
**Backend**: Supabase (PostgreSQL + RPC functions)

## Overview

This feature uses Supabase directly from the client (no custom API routes required). All operations go through Supabase client with RLS policies enforcing access control.

## TypeScript Types

```typescript
// types/bulletin.ts

// ============================================================================
// Enums
// ============================================================================

export type PostTag =
  | 'question'
  | 'shakedown'
  | 'trade'
  | 'trip_planning'
  | 'gear_advice'
  | 'other';

export type LinkedContentType =
  | 'loadout'
  | 'shakedown'
  | 'marketplace_item';

export type ReportReason =
  | 'spam'
  | 'harassment'
  | 'off_topic'
  | 'other';

export type ReportStatus =
  | 'pending'
  | 'resolved'
  | 'dismissed';

export type ModerationAction =
  | 'delete_content'
  | 'warn_user'
  | 'ban_1d'
  | 'ban_7d'
  | 'ban_permanent'
  | 'dismiss';

// ============================================================================
// Core Entities
// ============================================================================

export interface BulletinPost {
  id: string;
  author_id: string;
  content: string;
  tag: PostTag | null;
  linked_content_type: LinkedContentType | null;
  linked_content_id: string | null;
  is_deleted: boolean;
  is_archived: boolean;
  reply_count: number;
  created_at: string;
  updated_at: string;
}

export interface BulletinPostWithAuthor extends BulletinPost {
  author_name: string;
  author_avatar: string | null;
}

export interface BulletinReply {
  id: string;
  post_id: string;
  author_id: string;
  parent_reply_id: string | null;
  content: string;
  depth: 1 | 2;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface BulletinReplyWithAuthor extends BulletinReply {
  author_name: string;
  author_avatar: string | null;
}

export interface BulletinReport {
  id: string;
  reporter_id: string;
  target_type: 'post' | 'reply';
  target_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  action_taken: ModerationAction | null;
  created_at: string;
}

export interface UserBulletinBan {
  id: string;
  user_id: string;
  banned_by: string;
  reason: string;
  expires_at: string | null;
  created_at: string;
}

// ============================================================================
// Linked Content Preview
// ============================================================================

export interface LinkedContentPreview {
  type: LinkedContentType;
  id: string;
  title: string;
  thumbnail_url: string | null;
  stats: Record<string, string | number>;
}

// ============================================================================
// Input Types (for mutations)
// ============================================================================

export interface CreatePostInput {
  content: string;
  tag?: PostTag;
  linked_content_type?: LinkedContentType;
  linked_content_id?: string;
}

export interface UpdatePostInput {
  content: string;
  tag?: PostTag | null;
}

export interface CreateReplyInput {
  post_id: string;
  parent_reply_id?: string;
  content: string;
}

export interface UpdateReplyInput {
  content: string;
}

export interface CreateReportInput {
  target_type: 'post' | 'reply';
  target_id: string;
  reason: ReportReason;
  details?: string;
}

// ============================================================================
// Query Types
// ============================================================================

export interface PostsQueryParams {
  tag?: PostTag;
  search?: string;
  cursor?: string;  // created_at of last item
  limit?: number;   // default 20
}

export interface RepliesQueryParams {
  post_id: string;
}

// ============================================================================
// Response Types
// ============================================================================

export interface PaginatedPosts {
  posts: BulletinPostWithAuthor[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface RateLimitError {
  type: 'rate_limit';
  limit: number;
  resetAt: string;
  message: string;
}

export interface DuplicateError {
  type: 'duplicate';
  message: string;
}

export type PostError = RateLimitError | DuplicateError;
```

## Supabase Queries

### Posts

#### Fetch Posts (paginated, filtered)

```typescript
// lib/supabase/bulletin-queries.ts

export async function fetchBulletinPosts(
  supabase: SupabaseClient,
  params: PostsQueryParams
): Promise<PaginatedPosts> {
  const limit = params.limit ?? 20;

  let query = supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .eq('is_archived', false)
    .order('created_at', { ascending: false })
    .limit(limit + 1);  // +1 to detect hasMore

  if (params.tag) {
    query = query.eq('tag', params.tag);
  }

  if (params.search) {
    query = query.textSearch('content_tsvector', params.search);
  }

  if (params.cursor) {
    query = query.lt('created_at', params.cursor);
  }

  const { data, error } = await query;

  if (error) throw error;

  const hasMore = data.length > limit;
  const posts = hasMore ? data.slice(0, limit) : data;
  const nextCursor = hasMore ? posts[posts.length - 1].created_at : null;

  return { posts, hasMore, nextCursor };
}
```

#### Fetch Single Post (by ID, includes archived)

```typescript
export async function fetchBulletinPost(
  supabase: SupabaseClient,
  postId: string
): Promise<BulletinPostWithAuthor | null> {
  const { data, error } = await supabase
    .from('v_bulletin_posts_with_author')
    .select('*')
    .eq('id', postId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}
```

#### Create Post

```typescript
export async function createBulletinPost(
  supabase: SupabaseClient,
  input: CreatePostInput
): Promise<BulletinPost> {
  // Check rate limit
  const { data: canPost } = await supabase
    .rpc('check_bulletin_rate_limit', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_action_type: 'post'
    });

  if (!canPost) {
    throw { type: 'rate_limit', limit: 10, message: 'Daily post limit reached' };
  }

  // Check for duplicates
  const { data: isUnique } = await supabase
    .rpc('check_duplicate_bulletin_post', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_content: input.content
    });

  if (!isUnique) {
    throw { type: 'duplicate', message: 'You already posted this content' };
  }

  const { data, error } = await supabase
    .from('bulletin_posts')
    .insert({
      author_id: (await supabase.auth.getUser()).data.user?.id,
      content: input.content,
      tag: input.tag ?? null,
      linked_content_type: input.linked_content_type ?? null,
      linked_content_id: input.linked_content_id ?? null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

#### Update Post

```typescript
export async function updateBulletinPost(
  supabase: SupabaseClient,
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
  return data;
}
```

#### Delete Post (soft)

```typescript
export async function deleteBulletinPost(
  supabase: SupabaseClient,
  postId: string
): Promise<void> {
  const { error } = await supabase
    .from('bulletin_posts')
    .update({ is_deleted: true })
    .eq('id', postId);

  if (error) throw error;
}
```

### Replies

#### Fetch Replies for Post

```typescript
export async function fetchBulletinReplies(
  supabase: SupabaseClient,
  postId: string
): Promise<BulletinReplyWithAuthor[]> {
  const { data, error } = await supabase
    .from('bulletin_replies')
    .select(`
      *,
      profiles!author_id (
        display_name,
        avatar_url
      )
    `)
    .eq('post_id', postId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true });

  if (error) throw error;

  return data.map(reply => ({
    ...reply,
    author_name: reply.profiles.display_name,
    author_avatar: reply.profiles.avatar_url,
  }));
}
```

#### Create Reply

```typescript
export async function createBulletinReply(
  supabase: SupabaseClient,
  input: CreateReplyInput
): Promise<BulletinReply> {
  // Check rate limit
  const { data: canReply } = await supabase
    .rpc('check_bulletin_rate_limit', {
      p_user_id: (await supabase.auth.getUser()).data.user?.id,
      p_action_type: 'reply'
    });

  if (!canReply) {
    throw { type: 'rate_limit', limit: 50, message: 'Daily reply limit reached' };
  }

  // Determine depth
  let depth = 1;
  if (input.parent_reply_id) {
    const { data: parent } = await supabase
      .from('bulletin_replies')
      .select('depth')
      .eq('id', input.parent_reply_id)
      .single();

    depth = parent ? Math.min(parent.depth + 1, 2) : 1;
  }

  const { data, error } = await supabase
    .from('bulletin_replies')
    .insert({
      post_id: input.post_id,
      author_id: (await supabase.auth.getUser()).data.user?.id,
      parent_reply_id: input.parent_reply_id ?? null,
      content: input.content,
      depth,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}
```

### Reports

#### Create Report

```typescript
export async function createBulletinReport(
  supabase: SupabaseClient,
  input: CreateReportInput
): Promise<BulletinReport> {
  const { data, error } = await supabase
    .from('bulletin_reports')
    .insert({
      reporter_id: (await supabase.auth.getUser()).data.user?.id,
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
      throw { type: 'duplicate', message: 'You already reported this content' };
    }
    throw error;
  }

  return data;
}
```

### Search

#### Full-Text Search

```typescript
export async function searchBulletinPosts(
  supabase: SupabaseClient,
  query: string,
  limit = 20
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
  return data;
}
```

## Zod Validation Schemas

```typescript
// lib/validations/bulletin.ts

import { z } from 'zod';

export const postTagSchema = z.enum([
  'question',
  'shakedown',
  'trade',
  'trip_planning',
  'gear_advice',
  'other',
]);

export const createPostSchema = z.object({
  content: z.string()
    .min(1, 'Post cannot be empty')
    .max(500, 'Post must be 500 characters or less'),
  tag: postTagSchema.optional(),
  linked_content_type: z.enum(['loadout', 'shakedown', 'marketplace_item']).optional(),
  linked_content_id: z.string().uuid().optional(),
}).refine(
  (data) => (data.linked_content_type !== undefined) === (data.linked_content_id !== undefined),
  { message: 'Both linked_content_type and linked_content_id must be provided together' }
);

export const updatePostSchema = z.object({
  content: z.string()
    .min(1, 'Post cannot be empty')
    .max(500, 'Post must be 500 characters or less'),
  tag: postTagSchema.nullable().optional(),
});

export const createReplySchema = z.object({
  post_id: z.string().uuid(),
  parent_reply_id: z.string().uuid().optional(),
  content: z.string().min(1, 'Reply cannot be empty'),
});

export const createReportSchema = z.object({
  target_type: z.enum(['post', 'reply']),
  target_id: z.string().uuid(),
  reason: z.enum(['spam', 'harassment', 'off_topic', 'other']),
  details: z.string().max(500).optional(),
});
```

## Notification Integration

When creating replies, trigger notification if within first 3 replies:

```typescript
// In createBulletinReply, after successful insert:

// Check if this is one of the first 3 replies
const { count } = await supabase
  .from('bulletin_replies')
  .select('*', { count: 'exact', head: true })
  .eq('post_id', input.post_id);

if (count && count <= 3) {
  // Get post author
  const { data: post } = await supabase
    .from('bulletin_posts')
    .select('author_id')
    .eq('id', input.post_id)
    .single();

  if (post && post.author_id !== currentUserId) {
    // Create notification
    await supabase.from('notifications').insert({
      user_id: post.author_id,
      type: 'bulletin_reply',
      data: {
        post_id: input.post_id,
        reply_id: data.id,
        replier_id: currentUserId,
      },
    });
  }
}
```

## Error Handling

All queries should handle these error types:

| Error Code | Meaning | User Message |
|------------|---------|--------------|
| `PGRST116` | Not found | "Post not found" |
| `23505` | Unique violation | "You already reported this content" |
| `42501` | RLS violation | "You don't have permission to do that" |
| `rate_limit` | Custom | "You've reached your daily limit" |
| `duplicate` | Custom | "You already posted this" |
