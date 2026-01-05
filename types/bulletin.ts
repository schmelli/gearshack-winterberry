// types/bulletin.ts
// TypeScript types for Community Bulletin Board feature

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

export type LinkedContentType = 'loadout' | 'shakedown' | 'marketplace_item';

export type ReportReason = 'spam' | 'harassment' | 'off_topic' | 'other';

export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

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
  cursor?: string; // created_at of last item
  limit?: number; // default 20
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

export interface BannedError {
  type: 'banned';
  message: string;
}

export interface EditWindowExpiredError {
  type: 'edit_window_expired';
  message: string;
}

export type PostError = RateLimitError | DuplicateError | BannedError | EditWindowExpiredError;

// ============================================================================
// Reply Tree Types (for client-side nesting)
// ============================================================================

export interface ReplyNode extends BulletinReplyWithAuthor {
  children: ReplyNode[];
}

// ============================================================================
// Board State Types
// ============================================================================

export type BoardLoadingState = 'idle' | 'loading' | 'loading-more' | 'error';

export interface BoardState {
  posts: BulletinPostWithAuthor[];
  hasMore: boolean;
  nextCursor: string | null;
  loadingState: BoardLoadingState;
  error: string | null;
  activeTag: PostTag | null;
  searchQuery: string;
}

// ============================================================================
// Post Tags Configuration
// ============================================================================

export const POST_TAGS: { value: PostTag; labelKey: string }[] = [
  { value: 'question', labelKey: 'tags.question' },
  { value: 'shakedown', labelKey: 'tags.shakedown' },
  { value: 'trade', labelKey: 'tags.trade' },
  { value: 'trip_planning', labelKey: 'tags.tripPlanning' },
  { value: 'gear_advice', labelKey: 'tags.gearAdvice' },
  { value: 'other', labelKey: 'tags.other' },
];

export const REPORT_REASONS: { value: ReportReason; labelKey: string }[] = [
  { value: 'spam', labelKey: 'report.reasons.spam' },
  { value: 'harassment', labelKey: 'report.reasons.harassment' },
  { value: 'off_topic', labelKey: 'report.reasons.offTopic' },
  { value: 'other', labelKey: 'report.reasons.other' },
];

// ============================================================================
// Constants
// ============================================================================

export const BULLETIN_CONSTANTS = {
  MAX_POST_LENGTH: 500,
  WARNING_THRESHOLD: 450,
  POSTS_PER_PAGE: 20,
  MAX_REPLY_DEPTH: 2,
  EDIT_WINDOW_MINUTES: 15,
  DAILY_POST_LIMIT: 10,
  DAILY_REPLY_LIMIT: 50,
  NEW_ACCOUNT_POST_LIMIT: 3,
  NEW_ACCOUNT_DAYS: 7,
  ARCHIVE_AFTER_DAYS: 90,
  NOTIFICATION_REPLY_LIMIT: 3,
} as const;
