// lib/validations/bulletin.ts
// Zod validation schemas for Community Bulletin Board

import { z } from 'zod';
import { BULLETIN_CONSTANTS } from '@/types/bulletin';

// ============================================================================
// Enum Schemas
// ============================================================================

export const postTagSchema = z.enum([
  'question',
  'shakedown',
  'trade',
  'trip_planning',
  'gear_advice',
  'other',
]);

export const linkedContentTypeSchema = z.enum([
  'loadout',
  'shakedown',
  'marketplace_item',
]);

export const reportReasonSchema = z.enum([
  'spam',
  'harassment',
  'off_topic',
  'other',
]);

export const targetTypeSchema = z.enum(['post', 'reply']);

// ============================================================================
// Post Schemas
// ============================================================================

export const createPostSchema = z
  .object({
    content: z
      .string()
      .min(1, 'bulletin.errors.postEmpty')
      .max(
        BULLETIN_CONSTANTS.MAX_POST_LENGTH,
        'bulletin.errors.postTooLong'
      ),
    tag: postTagSchema.optional(),
    linked_content_type: linkedContentTypeSchema.optional(),
    linked_content_id: z.string().uuid().optional(),
  })
  .refine(
    (data) =>
      (data.linked_content_type !== undefined) ===
      (data.linked_content_id !== undefined),
    {
      message: 'bulletin.errors.linkedContentIncomplete',
      path: ['linked_content_id'],
    }
  );

export const updatePostSchema = z.object({
  content: z
    .string()
    .min(1, 'bulletin.errors.postEmpty')
    .max(
      BULLETIN_CONSTANTS.MAX_POST_LENGTH,
      'bulletin.errors.postTooLong'
    ),
  tag: postTagSchema.nullable().optional(),
});

// ============================================================================
// Reply Schemas
// ============================================================================

export const createReplySchema = z.object({
  post_id: z.string().uuid('bulletin.errors.invalidPostId'),
  parent_reply_id: z.string().uuid().optional(),
  content: z.string().min(1, 'bulletin.errors.replyEmpty'),
});

export const updateReplySchema = z.object({
  content: z.string().min(1, 'bulletin.errors.replyEmpty'),
});

// ============================================================================
// Report Schemas
// ============================================================================

export const createReportSchema = z.object({
  target_type: targetTypeSchema,
  target_id: z.string().uuid('bulletin.errors.invalidTargetId'),
  reason: reportReasonSchema,
  details: z
    .string()
    .max(500, 'bulletin.errors.detailsTooLong')
    .optional(),
});

// ============================================================================
// Query Schemas
// ============================================================================

export const postsQuerySchema = z.object({
  tag: postTagSchema.optional(),
  search: z.string().max(100).optional(),
  cursor: z.string().datetime().optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(BULLETIN_CONSTANTS.POSTS_PER_PAGE),
});

// ============================================================================
// Type Exports (inferred from schemas)
// ============================================================================

export type CreatePostSchema = z.infer<typeof createPostSchema>;
export type UpdatePostSchema = z.infer<typeof updatePostSchema>;
export type CreateReplySchema = z.infer<typeof createReplySchema>;
export type UpdateReplySchema = z.infer<typeof updateReplySchema>;
export type CreateReportSchema = z.infer<typeof createReportSchema>;
export type PostsQuerySchema = z.infer<typeof postsQuerySchema>;
