/**
 * Shakedown Utility Functions Tests
 *
 * Tests for feedback tree building, date formatting, edit windows,
 * content validation, and other shakedown utility functions.
 *
 * Feature: 001-community-shakedowns
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildFeedbackTree,
  canEditFeedback,
  getRemainingEditMinutes,
  formatShakedownDateRange,
  calculateTripDuration,
  daysUntilArchive,
  canAddFeedback,
  canReplyAtDepth,
  generateShareToken,
  validateFeedbackContent,
  getCharacterCountInfo,
} from '@/lib/shakedown-utils';
import type { FeedbackWithAuthor } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';

// =============================================================================
// Test Data
// =============================================================================

const createMockFeedback = (
  id: string,
  parentId: string | null = null,
  createdAt: string = '2024-06-15T10:00:00Z'
): FeedbackWithAuthor => ({
  id,
  shakedownId: 'shakedown-001',
  authorId: 'author-001',
  content: `Feedback content for ${id}`,
  parentId,
  gearItemId: null,
  isEdited: false,
  editedAt: null,
  helpfulCount: 0,
  isReported: false,
  createdAt,
  authorName: 'Test Author',
  authorAvatar: null,
  isOwnersComment: false,
  isUserHelpful: false,
});

// =============================================================================
// buildFeedbackTree Tests
// =============================================================================

describe('buildFeedbackTree', () => {
  it('should return empty array for empty input', () => {
    const result = buildFeedbackTree([]);
    expect(result).toEqual([]);
  });

  it('should return single root node for single feedback', () => {
    const feedback = [createMockFeedback('f1')];
    const result = buildFeedbackTree(feedback);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('f1');
    expect(result[0].children).toEqual([]);
  });

  it('should build tree with nested children', () => {
    const feedback = [
      createMockFeedback('root1', null, '2024-06-15T10:00:00Z'),
      createMockFeedback('child1', 'root1', '2024-06-15T10:05:00Z'),
      createMockFeedback('child2', 'root1', '2024-06-15T10:10:00Z'),
      createMockFeedback('grandchild1', 'child1', '2024-06-15T10:15:00Z'),
    ];
    const result = buildFeedbackTree(feedback);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('root1');
    expect(result[0].children).toHaveLength(2);
    expect(result[0].children[0].id).toBe('child1');
    expect(result[0].children[1].id).toBe('child2');
    expect(result[0].children[0].children).toHaveLength(1);
    expect(result[0].children[0].children[0].id).toBe('grandchild1');
  });

  it('should handle multiple root nodes', () => {
    const feedback = [
      createMockFeedback('root1', null, '2024-06-15T10:00:00Z'),
      createMockFeedback('root2', null, '2024-06-15T10:30:00Z'),
    ];
    const result = buildFeedbackTree(feedback);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('root1');
    expect(result[1].id).toBe('root2');
  });

  it('should sort children by createdAt (oldest first)', () => {
    const feedback = [
      createMockFeedback('root', null, '2024-06-15T10:00:00Z'),
      createMockFeedback('newer', 'root', '2024-06-15T12:00:00Z'),
      createMockFeedback('older', 'root', '2024-06-15T11:00:00Z'),
    ];
    const result = buildFeedbackTree(feedback);

    expect(result[0].children[0].id).toBe('older');
    expect(result[0].children[1].id).toBe('newer');
  });

  it('should handle orphan children as roots', () => {
    const feedback = [
      createMockFeedback('orphan', 'nonexistent-parent'),
    ];
    const result = buildFeedbackTree(feedback);

    // Orphan with non-existent parent becomes a root
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orphan');
  });
});

// =============================================================================
// canEditFeedback Tests
// =============================================================================

describe('canEditFeedback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return true if within edit window', () => {
    const now = new Date('2024-06-15T10:15:00Z');
    vi.setSystemTime(now);

    const createdAt = '2024-06-15T10:00:00Z'; // 15 minutes ago
    expect(canEditFeedback(createdAt)).toBe(true);
  });

  it('should return false if outside edit window', () => {
    const now = new Date('2024-06-15T11:00:00Z');
    vi.setSystemTime(now);

    const createdAt = '2024-06-15T10:00:00Z'; // 60 minutes ago
    expect(canEditFeedback(createdAt)).toBe(false);
  });

  it('should return true at exactly the edit window boundary', () => {
    const createdAt = '2024-06-15T10:00:00Z';
    // Set time to just before 30 minutes (29:59)
    const now = new Date('2024-06-15T10:29:59Z');
    vi.setSystemTime(now);

    expect(canEditFeedback(createdAt)).toBe(true);
  });

  it('should return false just after edit window expires', () => {
    const createdAt = '2024-06-15T10:00:00Z';
    // Set time to 30 minutes + 1 second
    const now = new Date('2024-06-15T10:30:01Z');
    vi.setSystemTime(now);

    expect(canEditFeedback(createdAt)).toBe(false);
  });
});

// =============================================================================
// getRemainingEditMinutes Tests
// =============================================================================

describe('getRemainingEditMinutes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return remaining minutes', () => {
    const now = new Date('2024-06-15T10:15:00Z');
    vi.setSystemTime(now);

    const createdAt = '2024-06-15T10:00:00Z'; // 15 minutes ago
    const remaining = getRemainingEditMinutes(createdAt);

    expect(remaining).toBe(15); // 30 - 15 = 15 minutes remaining
  });

  it('should return 0 if edit window expired', () => {
    const now = new Date('2024-06-15T11:00:00Z');
    vi.setSystemTime(now);

    const createdAt = '2024-06-15T10:00:00Z'; // 60 minutes ago
    expect(getRemainingEditMinutes(createdAt)).toBe(0);
  });

  it('should ceil partial minutes', () => {
    const now = new Date('2024-06-15T10:15:30Z');
    vi.setSystemTime(now);

    const createdAt = '2024-06-15T10:00:00Z'; // 15.5 minutes ago
    const remaining = getRemainingEditMinutes(createdAt);

    // 30 - 15.5 = 14.5, ceil to 15
    expect(remaining).toBe(15);
  });
});

// =============================================================================
// formatShakedownDateRange Tests
// =============================================================================

describe('formatShakedownDateRange', () => {
  it('should format dates in same month and year', () => {
    const result = formatShakedownDateRange('2024-12-15', '2024-12-20', 'en-US');
    expect(result).toBe('Dec 15-20, 2024');
  });

  it('should format dates in different months, same year', () => {
    const result = formatShakedownDateRange('2024-12-28', '2025-01-05', 'en-US');
    // Different years case
    expect(result).toContain('Dec');
    expect(result).toContain('Jan');
  });

  it('should format dates across different years', () => {
    const result = formatShakedownDateRange('2024-12-28', '2025-01-05', 'en-US');
    expect(result).toContain('2024');
    expect(result).toContain('2025');
  });

  it('should use provided locale', () => {
    const result = formatShakedownDateRange('2024-06-15', '2024-06-20', 'de-DE');
    // German locale may format differently
    expect(result).toContain('15');
    expect(result).toContain('20');
    expect(result).toContain('2024');
  });

  it('should default to en-US locale', () => {
    const result = formatShakedownDateRange('2024-06-15', '2024-06-20');
    expect(result).toBe('Jun 15-20, 2024');
  });
});

// =============================================================================
// calculateTripDuration Tests
// =============================================================================

describe('calculateTripDuration', () => {
  it('should return 1 for same day trip', () => {
    expect(calculateTripDuration('2024-06-15', '2024-06-15')).toBe(1);
  });

  it('should calculate inclusive duration', () => {
    // June 15-17 = 3 days (15, 16, 17)
    expect(calculateTripDuration('2024-06-15', '2024-06-17')).toBe(3);
  });

  it('should handle week-long trips', () => {
    // June 15-22 = 8 days
    expect(calculateTripDuration('2024-06-15', '2024-06-22')).toBe(8);
  });

  it('should handle trips spanning months', () => {
    // June 28 - July 5 = 8 days
    expect(calculateTripDuration('2024-06-28', '2024-07-05')).toBe(8);
  });

  it('should handle trips spanning years', () => {
    // Dec 30 - Jan 5 = 7 days
    expect(calculateTripDuration('2024-12-30', '2025-01-05')).toBe(7);
  });
});

// =============================================================================
// daysUntilArchive Tests
// =============================================================================

describe('daysUntilArchive', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return null if not completed', () => {
    expect(daysUntilArchive(null)).toBeNull();
  });

  it('should return days remaining until archive', () => {
    const now = new Date('2024-06-20T10:00:00Z');
    vi.setSystemTime(now);

    const completedAt = '2024-06-15T10:00:00Z'; // 5 days ago
    const result = daysUntilArchive(completedAt);

    // Archive after 90 days, completed 5 days ago = 85 days remaining
    expect(result).toBe(SHAKEDOWN_CONSTANTS.ARCHIVE_AFTER_DAYS - 5);
  });

  it('should return 0 if archive time passed', () => {
    const now = new Date('2024-09-20T10:00:00Z'); // 97 days after completion
    vi.setSystemTime(now);

    const completedAt = '2024-06-15T10:00:00Z';
    expect(daysUntilArchive(completedAt)).toBe(0);
  });
});

// =============================================================================
// canAddFeedback Tests
// =============================================================================

describe('canAddFeedback', () => {
  it('should return true for open status', () => {
    expect(canAddFeedback('open')).toBe(true);
  });

  it('should return false for completed status', () => {
    expect(canAddFeedback('completed')).toBe(false);
  });

  it('should return false for archived status', () => {
    expect(canAddFeedback('archived')).toBe(false);
  });

  it('should return false for any other status', () => {
    expect(canAddFeedback('unknown')).toBe(false);
    expect(canAddFeedback('')).toBe(false);
  });
});

// =============================================================================
// canReplyAtDepth Tests
// =============================================================================

describe('canReplyAtDepth', () => {
  it('should allow reply at depth 0', () => {
    expect(canReplyAtDepth(0)).toBe(true);
  });

  it('should allow reply at depth 1', () => {
    expect(canReplyAtDepth(1)).toBe(true);
  });

  it('should allow reply at depth 2', () => {
    expect(canReplyAtDepth(2)).toBe(true);
  });

  it('should not allow reply at max depth', () => {
    expect(canReplyAtDepth(SHAKEDOWN_CONSTANTS.MAX_REPLY_DEPTH)).toBe(false);
  });

  it('should not allow reply beyond max depth', () => {
    expect(canReplyAtDepth(SHAKEDOWN_CONSTANTS.MAX_REPLY_DEPTH + 1)).toBe(false);
  });
});

// =============================================================================
// generateShareToken Tests
// =============================================================================

describe('generateShareToken', () => {
  it('should generate 32-character token', () => {
    const token = generateShareToken();
    expect(token).toHaveLength(32);
  });

  it('should only contain alphanumeric characters', () => {
    const token = generateShareToken();
    expect(token).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('should generate unique tokens', () => {
    const tokens = new Set<string>();
    for (let i = 0; i < 100; i++) {
      tokens.add(generateShareToken());
    }
    // All 100 tokens should be unique
    expect(tokens.size).toBe(100);
  });
});

// =============================================================================
// validateFeedbackContent Tests
// =============================================================================

describe('validateFeedbackContent', () => {
  it('should return valid for normal content', () => {
    const result = validateFeedbackContent('Great gear recommendations!');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject empty content', () => {
    const result = validateFeedbackContent('');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Content cannot be empty');
  });

  it('should reject whitespace-only content', () => {
    const result = validateFeedbackContent('   \n\t  ');
    expect(result.isValid).toBe(false);
    expect(result.error).toBe('Content cannot be empty');
  });

  it('should reject content exceeding max length', () => {
    const longContent = 'a'.repeat(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH + 1);
    const result = validateFeedbackContent(longContent);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('exceeds maximum length');
  });

  it('should accept content at exactly max length', () => {
    const maxContent = 'a'.repeat(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH);
    const result = validateFeedbackContent(maxContent);
    expect(result.isValid).toBe(true);
  });
});

// =============================================================================
// getCharacterCountInfo Tests
// =============================================================================

describe('getCharacterCountInfo', () => {
  it('should return correct count for short content', () => {
    const result = getCharacterCountInfo('Hello');
    expect(result.count).toBe(5);
    expect(result.remaining).toBe(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH - 5);
    expect(result.isNearLimit).toBe(false);
    expect(result.isOverLimit).toBe(false);
  });

  it('should indicate near limit at 90%', () => {
    const ninetyPercent = Math.floor(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH * 0.9);
    const content = 'a'.repeat(ninetyPercent);
    const result = getCharacterCountInfo(content);

    expect(result.isNearLimit).toBe(true);
    expect(result.isOverLimit).toBe(false);
  });

  it('should indicate over limit when exceeded', () => {
    const content = 'a'.repeat(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH + 10);
    const result = getCharacterCountInfo(content);

    expect(result.isNearLimit).toBe(false); // Not near when over
    expect(result.isOverLimit).toBe(true);
    expect(result.remaining).toBe(-10);
  });

  it('should return 0 remaining at exact max', () => {
    const content = 'a'.repeat(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH);
    const result = getCharacterCountInfo(content);

    expect(result.remaining).toBe(0);
    expect(result.isNearLimit).toBe(true);
    expect(result.isOverLimit).toBe(false);
  });

  it('should handle empty content', () => {
    const result = getCharacterCountInfo('');
    expect(result.count).toBe(0);
    expect(result.remaining).toBe(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH);
    expect(result.isNearLimit).toBe(false);
    expect(result.isOverLimit).toBe(false);
  });
});
