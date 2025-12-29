/**
 * Shakedown Types
 *
 * Feature: 001-community-shakedowns
 * Type definitions for community gear shakedown requests and feedback
 */

// ============================================================================
// Enums
// ============================================================================

export type ShakedownPrivacy = 'public' | 'friends_only' | 'private';

export type ShakedownStatus = 'open' | 'completed' | 'archived';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'experienced' | 'expert';

export type ShakedownBadge = 'shakedown_helper' | 'trail_expert' | 'community_legend';

// ============================================================================
// Core Entities
// ============================================================================

export interface Shakedown {
  id: string;
  ownerId: string;
  loadoutId: string;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  experienceLevel: ExperienceLevel;
  concerns: string | null;
  privacy: ShakedownPrivacy;
  shareToken: string | null;
  status: ShakedownStatus;
  feedbackCount: number;
  helpfulCount: number;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  archivedAt: string | null;
}

export interface ShakedownWithAuthor extends Shakedown {
  authorName: string;
  authorAvatar: string | null;
  loadoutName: string;
  totalWeightGrams: number;
  itemCount: number;
}

export interface ShakedownFeedback {
  id: string;
  shakedownId: string;
  authorId: string;
  parentId: string | null;
  gearItemId: string | null;
  content: string;
  contentHtml: string | null;
  depth: 1 | 2 | 3;
  helpfulCount: number;
  isHidden: boolean;
  isEdited: boolean;
  editedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FeedbackWithAuthor extends ShakedownFeedback {
  authorName: string;
  authorAvatar: string | null;
  authorReputation: number;
  gearItemName: string | null;
}

/**
 * For building reply tree on client
 * Extends FeedbackWithAuthor with nested children array
 */
export interface FeedbackNode extends FeedbackWithAuthor {
  children: FeedbackNode[];
}

export interface ShakedownBookmark {
  id: string;
  userId: string;
  shakedownId: string;
  note: string | null;
  createdAt: string;
}

export interface ShakedownHelpfulVote {
  id: string;
  feedbackId: string;
  voterId: string;
  createdAt: string;
}

export interface Badge {
  id: string;
  userId: string;
  badgeType: ShakedownBadge;
  awardedAt: string;
}

/**
 * Expert profile data for the community experts section
 * Combines profile info with shakedown reputation stats
 */
export interface ShakedownExpert {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  helpfulVotesReceived: number;
  shakedownsReviewed: number;
  highestBadge: ShakedownBadge | null;
}

// ============================================================================
// Input Types
// ============================================================================

export interface CreateShakedownInput {
  loadoutId: string;
  tripName: string;
  tripStartDate: string;
  tripEndDate: string;
  experienceLevel: ExperienceLevel;
  concerns?: string;
  privacy?: ShakedownPrivacy;
}

export interface UpdateShakedownInput {
  tripName?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  experienceLevel?: ExperienceLevel;
  concerns?: string;
  privacy?: ShakedownPrivacy;
}

export interface CreateFeedbackInput {
  shakedownId: string;
  content: string;
  parentId?: string;
  gearItemId?: string;
}

export interface UpdateFeedbackInput {
  content: string;
}

// ============================================================================
// Query Types
// ============================================================================

export interface ShakedownsQueryParams {
  cursor?: string;
  limit?: number;
  status?: ShakedownStatus;
  experienceLevel?: ExperienceLevel;
  search?: string;
  sort?: 'recent' | 'popular' | 'unanswered';
  friendsFirst?: boolean;
}

export interface PaginatedShakedowns {
  shakedowns: ShakedownWithAuthor[];
  hasMore: boolean;
  nextCursor: string | null;
}

// ============================================================================
// State Types
// ============================================================================

export type ShakedownLoadingState = 'idle' | 'loading' | 'loading-more' | 'error';

// ============================================================================
// Error Types
// ============================================================================

export interface ShakedownError {
  type:
    | 'rate_limit'
    | 'not_found'
    | 'forbidden'
    | 'validation'
    | 'depth_exceeded'
    | 'edit_window_expired';
  message: string;
}

// ============================================================================
// Constants
// ============================================================================

export const SHAKEDOWN_CONSTANTS = {
  MAX_CONTENT_LENGTH: 2000,
  MAX_REPLY_DEPTH: 3,
  EDIT_WINDOW_MINUTES: 30,
  DAILY_FEEDBACK_LIMIT: 50,
  ITEMS_PER_PAGE: 20,
  ARCHIVE_AFTER_DAYS: 90,
  BADGE_THRESHOLDS: {
    shakedown_helper: 10,
    trail_expert: 50,
    community_legend: 100,
  },
} as const;

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; labelKey: string }[] = [
  { value: 'beginner', labelKey: 'shakedowns.experience.beginner' },
  { value: 'intermediate', labelKey: 'shakedowns.experience.intermediate' },
  { value: 'experienced', labelKey: 'shakedowns.experience.experienced' },
  { value: 'expert', labelKey: 'shakedowns.experience.expert' },
];

export const PRIVACY_OPTIONS: { value: ShakedownPrivacy; labelKey: string }[] = [
  { value: 'public', labelKey: 'shakedowns.privacy.public' },
  { value: 'friends_only', labelKey: 'shakedowns.privacy.friendsOnly' },
  { value: 'private', labelKey: 'shakedowns.privacy.private' },
];
