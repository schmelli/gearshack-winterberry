/**
 * Messaging Validation Schemas
 *
 * Feature: 046-user-messaging-system
 * Zod schemas for messaging forms and API validation
 */

import { z } from 'zod';

// ----- Enums -----

export const messageTypeSchema = z.enum([
  'text',
  'image',
  'voice',
  'location',
  'gear_reference',
  'gear_trade',
  'trip_invitation',
]);

export const messagingPrivacySchema = z.enum([
  'everyone',
  'friends_only',
  'nobody',
]);

export const reportReasonSchema = z.enum([
  'spam',
  'harassment',
  'inappropriate_content',
  'other',
]);

export const reactionEmojiSchema = z.enum(['👍', '❤️', '😂', '😮', '😢']);

export const gearTradeStatusSchema = z.enum(['open', 'accepted', 'declined']);

export const rsvpStatusSchema = z.enum(['going', 'maybe', 'not_going']);

// ----- Message Metadata Schemas -----

export const imageMetadataSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
  thumbnail_url: z.string().url(),
});

export const voiceMetadataSchema = z.object({
  duration_seconds: z.number().positive().max(300), // 5 min max
  waveform: z.array(z.number()),
});

export const locationMetadataSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  place_name: z.string().min(1).max(200),
});

export const gearReferenceMetadataSchema = z.object({
  gear_item_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  image_url: z.string().url().optional(),
});

export const gearTradeItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(200),
});

export const gearTradeMetadataSchema = z.object({
  offered_items: z.array(gearTradeItemSchema).min(1).max(10),
  wanted_items: z.array(gearTradeItemSchema).max(10),
  conditions: z.string().max(1000),
  status: gearTradeStatusSchema,
});

export const tripInvitationMetadataSchema = z.object({
  dates: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  location: z.object({
    name: z.string().min(1).max(200),
    lat: z.number().min(-90).max(90).optional(),
    lng: z.number().min(-180).max(180).optional(),
  }),
  activity_type: z.string().min(1).max(100),
  gear_suggestions: z.array(z.string().max(100)).max(20),
  rsvp_status: z.record(z.string().uuid(), rsvpStatusSchema),
});

// ----- Form Schemas -----

/**
 * Send text message form
 */
export const sendTextMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z
    .string()
    .min(1, 'Message cannot be empty')
    .max(10000, 'Message is too long'),
});

export type SendTextMessageFormData = z.infer<typeof sendTextMessageSchema>;

/**
 * Send message with any type
 */
export const sendMessageSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
  content: z.string().max(10000).optional(),
  messageType: messageTypeSchema,
  mediaUrl: z.string().url().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export type SendMessageFormData = z.infer<typeof sendMessageSchema>;

/**
 * Create direct conversation
 */
export const startConversationSchema = z.object({
  recipientId: z.string().uuid('Invalid recipient ID'),
  initialMessage: z.string().max(10000).optional(),
});

export type StartConversationFormData = z.infer<typeof startConversationSchema>;

/**
 * Create group conversation
 */
export const createGroupSchema = z.object({
  name: z
    .string()
    .min(1, 'Group name is required')
    .max(100, 'Group name is too long'),
  participantIds: z
    .array(z.string().uuid())
    .min(1, 'At least one participant required')
    .max(49, 'Maximum 50 participants (including you)'),
});

export type CreateGroupFormData = z.infer<typeof createGroupSchema>;

/**
 * Privacy settings form
 */
export const privacySettingsSchema = z.object({
  messagingPrivacy: messagingPrivacySchema,
  onlineStatusPrivacy: messagingPrivacySchema,
  discoverable: z.boolean(),
  readReceiptsEnabled: z.boolean(),
});

export type PrivacySettingsFormData = z.infer<typeof privacySettingsSchema>;

/**
 * User search query
 */
export const userSearchSchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(100, 'Search query is too long'),
  limit: z.number().int().positive().max(50).optional().default(20),
});

export type UserSearchFormData = z.infer<typeof userSearchSchema>;

/**
 * Message search query
 */
export const messageSearchSchema = z.object({
  query: z
    .string()
    .min(2, 'Search query must be at least 2 characters')
    .max(200, 'Search query is too long'),
  conversationId: z.string().uuid().optional(),
  limit: z.number().int().positive().max(100).optional().default(50),
});

export type MessageSearchFormData = z.infer<typeof messageSearchSchema>;

/**
 * Report user/message form
 */
export const reportSchema = z.object({
  reportedUserId: z.string().uuid('Invalid user ID'),
  messageId: z.string().uuid().optional(),
  reason: reportReasonSchema,
  details: z.string().max(2000, 'Details are too long').optional(),
});

export type ReportFormData = z.infer<typeof reportSchema>;

/**
 * Add reaction to message
 */
export const addReactionSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
  emoji: reactionEmojiSchema,
});

export type AddReactionFormData = z.infer<typeof addReactionSchema>;

/**
 * Gear trade post creation
 */
export const gearTradePostSchema = z.object({
  offeredItems: z.array(gearTradeItemSchema).min(1, 'Offer at least one item'),
  wantedItems: z.array(gearTradeItemSchema),
  conditions: z.string().max(1000, 'Conditions are too long'),
});

export type GearTradePostFormData = z.infer<typeof gearTradePostSchema>;

/**
 * Trip invitation post creation
 */
export const tripInvitationPostSchema = z.object({
  startDate: z.string().datetime('Invalid start date'),
  endDate: z.string().datetime('Invalid end date'),
  locationName: z.string().min(1, 'Location is required').max(200),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  activityType: z.string().min(1, 'Activity type is required').max(100),
  gearSuggestions: z.array(z.string().max(100)).max(20),
});

export type TripInvitationPostFormData = z.infer<
  typeof tripInvitationPostSchema
>;

// ----- API Request Validation -----

/**
 * Validate conversation ID parameter
 */
export const conversationIdSchema = z.object({
  conversationId: z.string().uuid('Invalid conversation ID'),
});

/**
 * Validate message ID parameter
 */
export const messageIdSchema = z.object({
  messageId: z.string().uuid('Invalid message ID'),
});

/**
 * Validate user ID parameter
 */
export const userIdSchema = z.object({
  userId: z.string().uuid('Invalid user ID'),
});

/**
 * Pagination parameters
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().positive().max(100).optional().default(50),
  offset: z.coerce.number().int().nonnegative().optional().default(0),
});

export type PaginationParams = z.infer<typeof paginationSchema>;
