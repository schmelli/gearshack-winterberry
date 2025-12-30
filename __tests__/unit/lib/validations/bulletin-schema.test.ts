/**
 * Bulletin Schema Validation Tests
 *
 * Tests for community bulletin board validation schemas including
 * posts, replies, reports, and query parameters.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  postTagSchema,
  linkedContentTypeSchema,
  reportReasonSchema,
  targetTypeSchema,
  createPostSchema,
  updatePostSchema,
  createReplySchema,
  updateReplySchema,
  createReportSchema,
  postsQuerySchema,
} from '@/lib/validations/bulletin';

// Mock the constants since they're from external module
vi.mock('@/types/bulletin', () => ({
  BULLETIN_CONSTANTS: {
    MAX_POST_LENGTH: 5000,
    POSTS_PER_PAGE: 20,
  },
}));

// =============================================================================
// Enum Schema Tests
// =============================================================================

describe('Bulletin Enum Schemas', () => {
  describe('postTagSchema', () => {
    const validTags = ['question', 'shakedown', 'trade', 'trip_planning', 'gear_advice', 'other'];

    validTags.forEach((tag) => {
      it(`should accept ${tag} tag`, () => {
        const result = postTagSchema.safeParse(tag);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid tag', () => {
      const result = postTagSchema.safeParse('invalid');
      expect(result.success).toBe(false);
    });
  });

  describe('linkedContentTypeSchema', () => {
    const validTypes = ['loadout', 'shakedown', 'marketplace_item'];

    validTypes.forEach((type) => {
      it(`should accept ${type} content type`, () => {
        const result = linkedContentTypeSchema.safeParse(type);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid content type', () => {
      const result = linkedContentTypeSchema.safeParse('gear');
      expect(result.success).toBe(false);
    });
  });

  describe('reportReasonSchema', () => {
    const validReasons = ['spam', 'harassment', 'off_topic', 'other'];

    validReasons.forEach((reason) => {
      it(`should accept ${reason} reason`, () => {
        const result = reportReasonSchema.safeParse(reason);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid reason', () => {
      const result = reportReasonSchema.safeParse('inappropriate');
      expect(result.success).toBe(false);
    });
  });

  describe('targetTypeSchema', () => {
    it('should accept post target', () => {
      const result = targetTypeSchema.safeParse('post');
      expect(result.success).toBe(true);
    });

    it('should accept reply target', () => {
      const result = targetTypeSchema.safeParse('reply');
      expect(result.success).toBe(true);
    });

    it('should reject invalid target', () => {
      const result = targetTypeSchema.safeParse('comment');
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Create Post Schema Tests
// =============================================================================

describe('Create Post Schema', () => {
  describe('Content Validation', () => {
    it('should accept valid post', () => {
      const result = createPostSchema.safeParse({
        content: 'Looking for advice on my PCT gear list',
        tag: 'gear_advice',
      });
      expect(result.success).toBe(true);
    });

    it('should reject empty content', () => {
      const result = createPostSchema.safeParse({
        content: '',
      });
      expect(result.success).toBe(false);
    });

    it('should reject content over max length', () => {
      const result = createPostSchema.safeParse({
        content: 'a'.repeat(5001),
      });
      expect(result.success).toBe(false);
    });

    it('should accept content at max length', () => {
      const result = createPostSchema.safeParse({
        content: 'a'.repeat(5000),
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Tag Validation', () => {
    it('should accept post without tag', () => {
      const result = createPostSchema.safeParse({
        content: 'General discussion about gear',
      });
      expect(result.success).toBe(true);
    });

    it('should accept post with valid tag', () => {
      const result = createPostSchema.safeParse({
        content: 'Help me choose a tent',
        tag: 'question',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('Linked Content Validation', () => {
    it('should accept post with both linked content fields', () => {
      const result = createPostSchema.safeParse({
        content: 'Check out my loadout!',
        linked_content_type: 'loadout',
        linked_content_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('should accept post without any linked content fields', () => {
      const result = createPostSchema.safeParse({
        content: 'Just a text post',
      });
      expect(result.success).toBe(true);
    });

    it('should reject post with only linked_content_type', () => {
      const result = createPostSchema.safeParse({
        content: 'Missing content ID',
        linked_content_type: 'loadout',
      });
      expect(result.success).toBe(false);
    });

    it('should reject post with only linked_content_id', () => {
      const result = createPostSchema.safeParse({
        content: 'Missing content type',
        linked_content_id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid linked content UUID', () => {
      const result = createPostSchema.safeParse({
        content: 'Invalid UUID',
        linked_content_type: 'loadout',
        linked_content_id: 'not-a-uuid',
      });
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Update Post Schema Tests
// =============================================================================

describe('Update Post Schema', () => {
  it('should accept valid update', () => {
    const result = updatePostSchema.safeParse({
      content: 'Updated content',
      tag: 'question',
    });
    expect(result.success).toBe(true);
  });

  it('should accept update with null tag', () => {
    const result = updatePostSchema.safeParse({
      content: 'Updated content',
      tag: null,
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const result = updatePostSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject content over max length', () => {
    const result = updatePostSchema.safeParse({
      content: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Reply Schema Tests
// =============================================================================

describe('Create Reply Schema', () => {
  const validPostId = '550e8400-e29b-41d4-a716-446655440000';

  it('should accept valid reply', () => {
    const result = createReplySchema.safeParse({
      post_id: validPostId,
      content: 'Great post!',
    });
    expect(result.success).toBe(true);
  });

  it('should accept reply with parent_reply_id', () => {
    const result = createReplySchema.safeParse({
      post_id: validPostId,
      parent_reply_id: '550e8400-e29b-41d4-a716-446655440001',
      content: 'I agree with this comment',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid post_id', () => {
    const result = createReplySchema.safeParse({
      post_id: 'not-a-uuid',
      content: 'Reply',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty content', () => {
    const result = createReplySchema.safeParse({
      post_id: validPostId,
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid parent_reply_id', () => {
    const result = createReplySchema.safeParse({
      post_id: validPostId,
      parent_reply_id: 'not-a-uuid',
      content: 'Reply',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Update Reply Schema Tests
// =============================================================================

describe('Update Reply Schema', () => {
  it('should accept valid update', () => {
    const result = updateReplySchema.safeParse({
      content: 'Updated reply content',
    });
    expect(result.success).toBe(true);
  });

  it('should reject empty content', () => {
    const result = updateReplySchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Create Report Schema Tests
// =============================================================================

describe('Create Report Schema', () => {
  const validReport = {
    target_type: 'post' as const,
    target_id: '550e8400-e29b-41d4-a716-446655440000',
    reason: 'spam' as const,
  };

  it('should accept valid report', () => {
    const result = createReportSchema.safeParse(validReport);
    expect(result.success).toBe(true);
  });

  it('should accept report with details', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      details: 'This post is promoting a scam product',
    });
    expect(result.success).toBe(true);
  });

  it('should accept report for reply', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      target_type: 'reply',
    });
    expect(result.success).toBe(true);
  });

  it('should reject invalid target_id', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      target_id: 'not-a-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('should reject details over 500 characters', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      details: 'd'.repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it('should accept details at exactly 500 characters', () => {
    const result = createReportSchema.safeParse({
      ...validReport,
      details: 'd'.repeat(500),
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Posts Query Schema Tests
// =============================================================================

describe('Posts Query Schema', () => {
  it('should accept empty query (defaults apply)', () => {
    const result = postsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(20); // Default value
    }
  });

  it('should accept query with tag filter', () => {
    const result = postsQuerySchema.safeParse({
      tag: 'question',
    });
    expect(result.success).toBe(true);
  });

  it('should accept query with search term', () => {
    const result = postsQuerySchema.safeParse({
      search: 'ultralight tent',
    });
    expect(result.success).toBe(true);
  });

  it('should accept query with cursor', () => {
    const result = postsQuerySchema.safeParse({
      cursor: '2024-01-15T12:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('should accept query with custom limit', () => {
    const result = postsQuerySchema.safeParse({
      limit: 10,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.limit).toBe(10);
    }
  });

  it('should reject search over 100 characters', () => {
    const result = postsQuerySchema.safeParse({
      search: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit below 1', () => {
    const result = postsQuerySchema.safeParse({
      limit: 0,
    });
    expect(result.success).toBe(false);
  });

  it('should reject limit above 50', () => {
    const result = postsQuerySchema.safeParse({
      limit: 51,
    });
    expect(result.success).toBe(false);
  });

  it('should reject non-integer limit', () => {
    const result = postsQuerySchema.safeParse({
      limit: 10.5,
    });
    expect(result.success).toBe(false);
  });

  it('should accept limit at boundaries', () => {
    const min = postsQuerySchema.safeParse({ limit: 1 });
    const max = postsQuerySchema.safeParse({ limit: 50 });
    expect(min.success).toBe(true);
    expect(max.success).toBe(true);
  });
});
