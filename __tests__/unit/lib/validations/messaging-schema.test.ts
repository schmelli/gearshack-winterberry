/**
 * Messaging Schema Validation Tests
 *
 * Tests for user messaging system validation schemas including
 * messages, conversations, privacy settings, and reactions.
 */

import { describe, it, expect } from 'vitest';
import {
  messageTypeSchema,
  messagingPrivacySchema,
  reportReasonSchema,
  reactionEmojiSchema,
  gearTradeStatusSchema,
  rsvpStatusSchema,
  imageMetadataSchema,
  voiceMetadataSchema,
  locationMetadataSchema,
  gearReferenceMetadataSchema,
  gearTradeItemSchema,
  sendTextMessageSchema,
  sendMessageSchema,
  startConversationSchema,
  createGroupSchema,
  privacySettingsSchema,
  userSearchSchema,
  messageSearchSchema,
  reportSchema,
  addReactionSchema,
  conversationIdSchema,
  messageIdSchema,
  userIdSchema,
  paginationSchema,
} from '@/lib/validations/messaging-schema';

// =============================================================================
// Test Constants
// =============================================================================

const validUUID = '550e8400-e29b-41d4-a716-446655440000';

// =============================================================================
// Enum Schema Tests
// =============================================================================

describe('Messaging Enum Schemas', () => {
  describe('messageTypeSchema', () => {
    const validTypes = ['text', 'image', 'voice', 'location', 'gear_reference', 'gear_trade', 'trip_invitation'];

    validTypes.forEach((type) => {
      it(`should accept ${type} message type`, () => {
        expect(messageTypeSchema.safeParse(type).success).toBe(true);
      });
    });

    it('should reject invalid type', () => {
      expect(messageTypeSchema.safeParse('video').success).toBe(false);
    });
  });

  describe('messagingPrivacySchema', () => {
    const validOptions = ['everyone', 'friends_only', 'nobody'];

    validOptions.forEach((option) => {
      it(`should accept ${option} privacy option`, () => {
        expect(messagingPrivacySchema.safeParse(option).success).toBe(true);
      });
    });
  });

  describe('reportReasonSchema', () => {
    const validReasons = ['spam', 'harassment', 'inappropriate_content', 'other'];

    validReasons.forEach((reason) => {
      it(`should accept ${reason} report reason`, () => {
        expect(reportReasonSchema.safeParse(reason).success).toBe(true);
      });
    });
  });

  describe('reactionEmojiSchema', () => {
    const validEmojis = ['👍', '❤️', '😂', '😮', '😢'];

    validEmojis.forEach((emoji) => {
      it(`should accept ${emoji} reaction`, () => {
        expect(reactionEmojiSchema.safeParse(emoji).success).toBe(true);
      });
    });

    it('should reject invalid emoji', () => {
      expect(reactionEmojiSchema.safeParse('🔥').success).toBe(false);
    });
  });

  describe('gearTradeStatusSchema', () => {
    it('should accept open status', () => {
      expect(gearTradeStatusSchema.safeParse('open').success).toBe(true);
    });

    it('should accept accepted status', () => {
      expect(gearTradeStatusSchema.safeParse('accepted').success).toBe(true);
    });

    it('should accept declined status', () => {
      expect(gearTradeStatusSchema.safeParse('declined').success).toBe(true);
    });
  });

  describe('rsvpStatusSchema', () => {
    const validStatuses = ['going', 'maybe', 'not_going'];

    validStatuses.forEach((status) => {
      it(`should accept ${status} RSVP status`, () => {
        expect(rsvpStatusSchema.safeParse(status).success).toBe(true);
      });
    });
  });
});

// =============================================================================
// Metadata Schema Tests
// =============================================================================

describe('Metadata Schemas', () => {
  describe('imageMetadataSchema', () => {
    it('should accept valid image metadata', () => {
      const result = imageMetadataSchema.safeParse({
        width: 1920,
        height: 1080,
        thumbnail_url: 'https://example.com/thumb.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should reject negative dimensions', () => {
      const result = imageMetadataSchema.safeParse({
        width: -100,
        height: 1080,
        thumbnail_url: 'https://example.com/thumb.jpg',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid thumbnail URL', () => {
      const result = imageMetadataSchema.safeParse({
        width: 1920,
        height: 1080,
        thumbnail_url: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('voiceMetadataSchema', () => {
    it('should accept valid voice metadata', () => {
      const result = voiceMetadataSchema.safeParse({
        duration_seconds: 30,
        waveform: [0.1, 0.5, 0.8, 0.3],
      });
      expect(result.success).toBe(true);
    });

    it('should reject duration over 5 minutes', () => {
      const result = voiceMetadataSchema.safeParse({
        duration_seconds: 301,
        waveform: [0.5],
      });
      expect(result.success).toBe(false);
    });

    it('should accept duration at exactly 5 minutes', () => {
      const result = voiceMetadataSchema.safeParse({
        duration_seconds: 300,
        waveform: [0.5],
      });
      expect(result.success).toBe(true);
    });
  });

  describe('locationMetadataSchema', () => {
    it('should accept valid location', () => {
      const result = locationMetadataSchema.safeParse({
        latitude: 39.7392,
        longitude: -104.9903,
        place_name: 'Denver, CO',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid latitude', () => {
      const result = locationMetadataSchema.safeParse({
        latitude: 91,
        longitude: -104.9903,
        place_name: 'Invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid longitude', () => {
      const result = locationMetadataSchema.safeParse({
        latitude: 39.7392,
        longitude: -181,
        place_name: 'Invalid',
      });
      expect(result.success).toBe(false);
    });

    it('should reject empty place name', () => {
      const result = locationMetadataSchema.safeParse({
        latitude: 39.7392,
        longitude: -104.9903,
        place_name: '',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gearReferenceMetadataSchema', () => {
    it('should accept valid gear reference', () => {
      const result = gearReferenceMetadataSchema.safeParse({
        gear_item_id: validUUID,
        name: 'Big Agnes Copper Spur HV UL2',
        image_url: 'https://example.com/tent.jpg',
      });
      expect(result.success).toBe(true);
    });

    it('should accept without image URL', () => {
      const result = gearReferenceMetadataSchema.safeParse({
        gear_item_id: validUUID,
        name: 'MSR PocketRocket',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = gearReferenceMetadataSchema.safeParse({
        gear_item_id: 'invalid',
        name: 'Test',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('gearTradeItemSchema', () => {
    it('should accept valid trade item', () => {
      const result = gearTradeItemSchema.safeParse({
        id: validUUID,
        name: 'Big Agnes Tent',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const result = gearTradeItemSchema.safeParse({
        id: validUUID,
        name: '',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Message Form Schema Tests
// =============================================================================

describe('sendTextMessageSchema', () => {
  it('should accept valid text message', () => {
    const result = sendTextMessageSchema.safeParse({
      conversationId: validUUID,
      content: 'Hey! Want to join my PCT hike?',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const result = sendTextMessageSchema.safeParse({
      conversationId: validUUID,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject content over 10000 chars', () => {
    const result = sendTextMessageSchema.safeParse({
      conversationId: validUUID,
      content: 'a'.repeat(10001),
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid conversation ID', () => {
    const result = sendTextMessageSchema.safeParse({
      conversationId: 'invalid',
      content: 'Test',
    });
    expect(result.success).toBe(false);
  });
});

describe('sendMessageSchema', () => {
  it('should accept text message', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: validUUID,
      content: 'Hello!',
      messageType: 'text',
    });
    expect(result.success).toBe(true);
  });

  it('should accept image message with URL', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: validUUID,
      messageType: 'image',
      mediaUrl: 'https://example.com/image.jpg',
    });
    expect(result.success).toBe(true);
  });

  it('should accept message with metadata', () => {
    const result = sendMessageSchema.safeParse({
      conversationId: validUUID,
      messageType: 'location',
      metadata: { lat: 39.7, lng: -104.9 },
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Conversation Schema Tests
// =============================================================================

describe('startConversationSchema', () => {
  it('should accept valid conversation start', () => {
    const result = startConversationSchema.safeParse({
      recipientId: validUUID,
      initialMessage: 'Hey, nice gear collection!',
    });
    expect(result.success).toBe(true);
  });

  it('should accept without initial message', () => {
    const result = startConversationSchema.safeParse({
      recipientId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid recipient ID', () => {
    const result = startConversationSchema.safeParse({
      recipientId: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });
});

describe('createGroupSchema', () => {
  it('should accept valid group', () => {
    const result = createGroupSchema.safeParse({
      name: 'PCT Class of 2024',
      participantIds: [validUUID],
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty name', () => {
    const result = createGroupSchema.safeParse({
      name: '',
      participantIds: [validUUID],
    });
    expect(result.success).toBe(false);
  });

  it('should reject name over 100 chars', () => {
    const result = createGroupSchema.safeParse({
      name: 'a'.repeat(101),
      participantIds: [validUUID],
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty participants', () => {
    const result = createGroupSchema.safeParse({
      name: 'Test Group',
      participantIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('should reject more than 49 participants', () => {
    const tooManyIds = Array(50).fill(validUUID);
    const result = createGroupSchema.safeParse({
      name: 'Test Group',
      participantIds: tooManyIds,
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Settings Schema Tests
// =============================================================================

describe('privacySettingsSchema', () => {
  it('should accept valid settings', () => {
    const result = privacySettingsSchema.safeParse({
      messagingPrivacy: 'friends_only',
      onlineStatusPrivacy: 'everyone',
      discoverable: true,
      readReceiptsEnabled: true,
    });
    expect(result.success).toBe(true);
  });

  it('should accept restrictive settings', () => {
    const result = privacySettingsSchema.safeParse({
      messagingPrivacy: 'nobody',
      onlineStatusPrivacy: 'nobody',
      discoverable: false,
      readReceiptsEnabled: false,
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Search Schema Tests
// =============================================================================

describe('userSearchSchema', () => {
  it('should accept valid search', () => {
    const result = userSearchSchema.safeParse({
      query: 'trail runner',
      limit: 10,
    });
    expect(result.success).toBe(true);
  });

  it('should apply default limit', () => {
    const result = userSearchSchema.safeParse({
      query: 'hiker',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20);
    }
  });

  it('should reject query under 2 chars', () => {
    const result = userSearchSchema.safeParse({
      query: 'a',
    });
    expect(result.success).toBe(false);
  });
});

describe('messageSearchSchema', () => {
  it('should accept valid search', () => {
    const result = messageSearchSchema.safeParse({
      query: 'tent recommendation',
      conversationId: validUUID,
    });
    expect(result.success).toBe(true);
  });

  it('should accept search without conversation filter', () => {
    const result = messageSearchSchema.safeParse({
      query: 'backpack',
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Report Schema Tests
// =============================================================================

describe('reportSchema', () => {
  it('should accept valid report', () => {
    const result = reportSchema.safeParse({
      reportedUserId: validUUID,
      reason: 'spam',
      details: 'Promoting scam products',
    });
    expect(result.success).toBe(true);
  });

  it('should accept report with message ID', () => {
    const result = reportSchema.safeParse({
      reportedUserId: validUUID,
      messageId: validUUID,
      reason: 'harassment',
    });
    expect(result.success).toBe(true);
  });

  it('should reject details over 2000 chars', () => {
    const result = reportSchema.safeParse({
      reportedUserId: validUUID,
      reason: 'other',
      details: 'd'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Reaction Schema Tests
// =============================================================================

describe('addReactionSchema', () => {
  it('should accept valid reaction', () => {
    const result = addReactionSchema.safeParse({
      messageId: validUUID,
      emoji: '👍',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid emoji', () => {
    const result = addReactionSchema.safeParse({
      messageId: validUUID,
      emoji: '🔥',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// API Parameter Schema Tests
// =============================================================================

describe('API Parameter Schemas', () => {
  describe('conversationIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = conversationIdSchema.safeParse({ conversationId: validUUID });
      expect(result.success).toBe(true);
    });

    it('should reject invalid UUID', () => {
      const result = conversationIdSchema.safeParse({ conversationId: 'invalid' });
      expect(result.success).toBe(false);
    });
  });

  describe('messageIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = messageIdSchema.safeParse({ messageId: validUUID });
      expect(result.success).toBe(true);
    });
  });

  describe('userIdSchema', () => {
    it('should accept valid UUID', () => {
      const result = userIdSchema.safeParse({ userId: validUUID });
      expect(result.success).toBe(true);
    });
  });

  describe('paginationSchema', () => {
    it('should apply defaults', () => {
      const result = paginationSchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
      }
    });

    it('should accept custom values', () => {
      const result = paginationSchema.safeParse({ limit: 20, offset: 40 });
      expect(result.success).toBe(true);
    });

    it('should reject limit over 100', () => {
      const result = paginationSchema.safeParse({ limit: 101 });
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const result = paginationSchema.safeParse({ offset: -1 });
      expect(result.success).toBe(false);
    });
  });
});
