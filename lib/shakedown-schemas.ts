/**
 * Zod Validation Schemas for Community Shakedowns
 *
 * Feature: 001-community-shakedowns
 * Used for API route validation and form validation
 */

import { z } from 'zod';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';

// ============================================================================
// Enum Schemas
// ============================================================================

export const shakedownPrivacySchema = z.enum(['public', 'friends_only', 'private']);

export const shakedownStatusSchema = z.enum(['open', 'completed', 'archived']);

export const experienceLevelSchema = z.enum([
  'beginner',
  'intermediate',
  'experienced',
  'expert',
]);

export const shakedownBadgeSchema = z.enum([
  'shakedown_helper',
  'trail_expert',
  'community_legend',
]);

export const reportReasonSchema = z.enum(['spam', 'harassment', 'off_topic', 'other']);

export const sortOptionSchema = z.enum(['recent', 'popular', 'unanswered']);

// ============================================================================
// Shakedown Schemas
// ============================================================================

/**
 * Schema for creating a new shakedown
 */
export const createShakedownSchema = z.object({
  loadoutId: z.string().uuid('Invalid loadout ID'),
  tripName: z
    .string()
    .min(1, 'Trip name is required')
    .max(100, 'Trip name must be 100 characters or less'),
  tripStartDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid start date',
  }),
  tripEndDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid end date',
  }),
  experienceLevel: experienceLevelSchema,
  concerns: z
    .string()
    .max(1000, 'Concerns must be 1000 characters or less')
    .optional()
    .nullable(),
  privacy: shakedownPrivacySchema.default('friends_only'),
}).refine(
  (data) => {
    const start = new Date(data.tripStartDate);
    const end = new Date(data.tripEndDate);
    return end >= start;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['tripEndDate'],
  }
);

/**
 * Schema for updating an existing shakedown
 */
export const updateShakedownSchema = z.object({
  tripName: z
    .string()
    .min(1, 'Trip name is required')
    .max(100, 'Trip name must be 100 characters or less')
    .optional(),
  tripStartDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid start date',
    })
    .optional(),
  tripEndDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid end date',
    })
    .optional(),
  experienceLevel: experienceLevelSchema.optional(),
  concerns: z
    .string()
    .max(1000, 'Concerns must be 1000 characters or less')
    .optional()
    .nullable(),
  privacy: shakedownPrivacySchema.optional(),
});

// ============================================================================
// Feedback Schemas
// ============================================================================

/**
 * Schema for creating feedback on a shakedown
 */
export const createFeedbackSchema = z.object({
  shakedownId: z.string().uuid('Invalid shakedown ID'),
  content: z
    .string()
    .min(1, 'Feedback content is required')
    .max(
      SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH,
      `Feedback must be ${SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH} characters or less`
    ),
  parentId: z.string().uuid('Invalid parent feedback ID').optional().nullable(),
  gearItemId: z.string().uuid('Invalid gear item ID').optional().nullable(),
});

/**
 * Schema for updating existing feedback
 */
export const updateFeedbackSchema = z.object({
  content: z
    .string()
    .min(1, 'Feedback content is required')
    .max(
      SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH,
      `Feedback must be ${SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH} characters or less`
    ),
});

/**
 * Schema for reporting feedback
 */
export const reportFeedbackSchema = z.object({
  reason: reportReasonSchema,
  details: z.string().max(500, 'Details must be 500 characters or less').optional(),
});

// ============================================================================
// Query Schemas
// ============================================================================

/**
 * Schema for shakedowns list query parameters
 */
export const shakedownsQuerySchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce
    .number()
    .min(1)
    .max(50)
    .default(SHAKEDOWN_CONSTANTS.ITEMS_PER_PAGE),
  status: shakedownStatusSchema.optional(),
  experienceLevel: experienceLevelSchema.optional(),
  search: z.string().max(100).optional(),
  sort: sortOptionSchema.default('recent'),
  friendsFirst: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
  season: z.string().optional(),
  tripType: z.string().optional(),
});

// ============================================================================
// Action Schemas
// ============================================================================

/**
 * Schema for completing a shakedown
 */
export const completeShakedownSchema = z.object({
  helpfulFeedbackIds: z.array(z.string().uuid()).optional(),
});

/**
 * Schema for helpful vote
 */
export const helpfulVoteSchema = z.object({
  feedbackId: z.string().uuid('Invalid feedback ID'),
});

/**
 * Schema for bookmark
 */
export const bookmarkSchema = z.object({
  shakedownId: z.string().uuid('Invalid shakedown ID'),
  note: z.string().max(200, 'Note must be 200 characters or less').optional().nullable(),
});

/**
 * Schema for updating bookmark
 */
export const updateBookmarkSchema = z.object({
  note: z.string().max(200, 'Note must be 200 characters or less').optional().nullable(),
});

// ============================================================================
// Type Exports
// ============================================================================

export type CreateShakedownInput = z.infer<typeof createShakedownSchema>;
export type UpdateShakedownInput = z.infer<typeof updateShakedownSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type ReportFeedbackInput = z.infer<typeof reportFeedbackSchema>;
export type ShakedownsQueryInput = z.infer<typeof shakedownsQuerySchema>;
export type CompleteShakedownInput = z.infer<typeof completeShakedownSchema>;
export type HelpfulVoteInput = z.infer<typeof helpfulVoteSchema>;
export type BookmarkInput = z.infer<typeof bookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
