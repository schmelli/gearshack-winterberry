/**
 * Shakedown Utility Functions
 *
 * Feature: 001-community-shakedowns
 * Utility functions for feedback tree building, date formatting, and validation
 */

import type { FeedbackWithAuthor, FeedbackNode } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';

// =============================================================================
// Feedback Tree Building
// =============================================================================

/**
 * Builds a tree structure from flat feedback array
 * @param feedback - Flat array of feedback with parentId references
 * @returns Array of root-level feedback nodes with nested children
 */
export function buildFeedbackTree(feedback: FeedbackWithAuthor[]): FeedbackNode[] {
  const map = new Map<string, FeedbackNode>();
  const roots: FeedbackNode[] = [];

  // First pass: create nodes with empty children arrays
  feedback.forEach((f) => {
    map.set(f.id, { ...f, children: [] });
  });

  // Second pass: build tree by linking children to parents
  feedback.forEach((f) => {
    const node = map.get(f.id)!;
    if (f.parentId && map.has(f.parentId)) {
      map.get(f.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort children by createdAt (oldest first for natural conversation flow)
  const sortChildren = (nodes: FeedbackNode[]) => {
    nodes.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    nodes.forEach((node) => sortChildren(node.children));
  };
  sortChildren(roots);

  return roots;
}

// =============================================================================
// Edit Window Validation
// =============================================================================

/**
 * Checks if feedback can still be edited (within 30-minute window)
 * @param createdAt - ISO timestamp of feedback creation
 * @returns boolean - true if within edit window
 */
export function canEditFeedback(createdAt: string): boolean {
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const windowMs = SHAKEDOWN_CONSTANTS.EDIT_WINDOW_MINUTES * 60 * 1000;
  return now - createdTime < windowMs;
}

/**
 * Gets remaining edit time in minutes
 * @param createdAt - ISO timestamp of feedback creation
 * @returns Number of minutes remaining, or 0 if window expired
 */
export function getRemainingEditMinutes(createdAt: string): number {
  const createdTime = new Date(createdAt).getTime();
  const now = Date.now();
  const windowMs = SHAKEDOWN_CONSTANTS.EDIT_WINDOW_MINUTES * 60 * 1000;
  const remainingMs = windowMs - (now - createdTime);
  return Math.max(0, Math.ceil(remainingMs / (60 * 1000)));
}

// =============================================================================
// Date Formatting
// =============================================================================

/**
 * Formats shakedown date range for display
 * @param startDate - ISO date string
 * @param endDate - ISO date string
 * @param locale - Locale string (e.g., 'en-US', 'de-DE')
 * @returns Formatted date range string
 */
export function formatShakedownDateRange(
  startDate: string,
  endDate: string,
  locale: string = 'en-US'
): string {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
  };

  // If same year, only show year once
  if (start.getFullYear() === end.getFullYear()) {
    if (start.getMonth() === end.getMonth()) {
      // Same month: "Dec 15-20, 2025"
      return `${start.toLocaleDateString(locale, { month: 'short' })} ${start.getDate()}-${end.getDate()}, ${start.getFullYear()}`;
    } else {
      // Different months: "Dec 15 - Jan 5, 2025"
      return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}, ${start.getFullYear()}`;
    }
  } else {
    // Different years: "Dec 28, 2025 - Jan 5, 2026"
    const fullOptions: Intl.DateTimeFormatOptions = { ...options, year: 'numeric' };
    return `${start.toLocaleDateString(locale, fullOptions)} - ${end.toLocaleDateString(locale, fullOptions)}`;
  }
}

/**
 * Calculates the trip duration in days
 * @param startDate - ISO date string
 * @param endDate - ISO date string
 * @returns Number of days (inclusive), or 0 if dates are invalid
 */
export function calculateTripDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Validate dates are valid
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    console.warn('[calculateTripDuration] Invalid date format:', { startDate, endDate });
    return 0;
  }

  const diffMs = end.getTime() - start.getTime();

  // Handle negative duration (end before start)
  if (diffMs < 0) {
    console.warn('[calculateTripDuration] End date before start date:', { startDate, endDate });
    return 0;
  }

  return Math.ceil(diffMs / (24 * 60 * 60 * 1000)) + 1; // +1 for inclusive
}

// =============================================================================
// Archival Utilities
// =============================================================================

/**
 * Calculates days until a shakedown is archived
 * @param completedAt - ISO timestamp of completion
 * @returns Number of days remaining, or null if not completed
 */
export function daysUntilArchive(completedAt: string | null): number | null {
  if (!completedAt) return null;

  const completedTime = new Date(completedAt).getTime();
  const archiveTime =
    completedTime + SHAKEDOWN_CONSTANTS.ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const daysRemaining = Math.ceil((archiveTime - now) / (24 * 60 * 60 * 1000));
  return Math.max(0, daysRemaining);
}

// =============================================================================
// Status Checks
// =============================================================================

/**
 * Checks if a user can add feedback to a shakedown
 * @param status - Current shakedown status
 * @returns boolean - true if feedback can be added
 */
export function canAddFeedback(status: string): boolean {
  return status === 'open';
}

/**
 * Checks if a reply can be added at the given depth
 * @param parentDepth - Depth of the parent feedback (1, 2, or 3)
 * @returns boolean - true if reply depth is allowed
 */
export function canReplyAtDepth(parentDepth: number): boolean {
  return parentDepth < SHAKEDOWN_CONSTANTS.MAX_REPLY_DEPTH;
}

// =============================================================================
// Share Token Generation
// =============================================================================

/**
 * Generates a random share token for public shakedowns
 * @returns 32-character alphanumeric token
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// =============================================================================
// Content Validation
// =============================================================================

/**
 * Validates feedback content length
 * @param content - The feedback content to validate
 * @returns Object with isValid boolean and optional error message
 */
export function validateFeedbackContent(content: string): {
  isValid: boolean;
  error?: string;
} {
  const trimmed = content.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Content cannot be empty' };
  }

  if (trimmed.length > SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH) {
    return {
      isValid: false,
      error: `Content exceeds maximum length of ${SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH} characters`,
    };
  }

  return { isValid: true };
}

/**
 * Gets character count info for content input
 * @param content - Current content
 * @returns Object with count, remaining, and warning threshold status
 */
export function getCharacterCountInfo(content: string): {
  count: number;
  remaining: number;
  isNearLimit: boolean;
  isOverLimit: boolean;
} {
  const count = content.length;
  const max = SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH;
  const warningThreshold = Math.floor(max * 0.9); // 90% of max

  return {
    count,
    remaining: max - count,
    isNearLimit: count >= warningThreshold && count <= max,
    isOverLimit: count > max,
  };
}
