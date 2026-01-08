/**
 * Admin Types
 *
 * Feature: Admin Section Enhancement
 *
 * Type definitions for admin features including user management,
 * wiki administration, and dashboard analytics.
 */

// ============================================================================
// Account Status Types
// ============================================================================

export type AccountStatus = 'active' | 'suspended' | 'banned';

export const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
};

export const ACCOUNT_STATUS_COLORS: Record<AccountStatus, string> = {
  active: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  suspended: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  banned: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
};

// ============================================================================
// User Management Types
// ============================================================================

/**
 * Extended profile view for admin user management
 */
export interface AdminUserView {
  id: string;
  email: string | null;
  display_name: string | null;
  trail_name: string | null;
  avatar_url: string | null;
  location_name: string | null;
  role: 'user' | 'admin';
  subscription_tier: string | null;
  account_type: 'standard' | 'vip' | 'merchant' | null;
  account_status: AccountStatus;
  suspended_at: string | null;
  suspended_until: string | null;
  suspension_reason: string | null;
  suspended_by: string | null;
  created_at: string;
  updated_at: string;
  // Computed stats (populated separately)
  gear_items_count?: number;
  loadouts_count?: number;
  posts_count?: number;
  wiki_edits_count?: number;
}

/**
 * Activity log entry for admin actions
 */
export interface AdminActivityLog {
  id: string;
  admin_id: string;
  action_type: AdminActionType;
  target_user_id: string | null;
  target_resource_type: string | null;
  target_resource_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  reason: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
  // Joined data
  admin?: {
    display_name: string | null;
    avatar_url: string | null;
  };
  target_user?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

export type AdminActionType =
  | 'role_change'
  | 'tier_change'
  | 'suspend'
  | 'unsuspend'
  | 'ban'
  | 'unban'
  | 'profile_edit'
  | 'wiki_lock'
  | 'wiki_unlock'
  | 'report_resolve';

export const ADMIN_ACTION_LABELS: Record<AdminActionType, string> = {
  role_change: 'Role Change',
  tier_change: 'Tier Change',
  suspend: 'Suspended',
  unsuspend: 'Unsuspended',
  ban: 'Banned',
  unban: 'Unbanned',
  profile_edit: 'Profile Edited',
  wiki_lock: 'Wiki Page Locked',
  wiki_unlock: 'Wiki Page Unlocked',
  report_resolve: 'Report Resolved',
};

// ============================================================================
// User Management Inputs
// ============================================================================

export interface ChangeRoleInput {
  userId: string;
  newRole: 'user' | 'admin';
  reason?: string;
}

export interface ChangeTierInput {
  userId: string;
  newTier: 'standard' | 'trailblazer';
  reason?: string;
}

export type SuspensionDuration = 'indefinite' | '1d' | '7d' | '30d' | '90d';

export interface SuspendUserInput {
  userId: string;
  reason: string;
  duration: SuspensionDuration;
}

export interface BanUserInput {
  userId: string;
  reason: string;
}

// ============================================================================
// User Filter & Sort Types
// ============================================================================

export interface UserFilter {
  role?: 'user' | 'admin' | 'all';
  tier?: 'standard' | 'trailblazer' | 'all';
  status?: AccountStatus | 'all';
  accountType?: 'standard' | 'vip' | 'merchant' | 'all';
}

export interface UserSort {
  field: 'created_at' | 'display_name' | 'email' | 'updated_at';
  direction: 'asc' | 'desc';
}

// ============================================================================
// Wiki Admin Types
// ============================================================================

/**
 * Wiki analytics dashboard stats
 */
export interface WikiAdminStats {
  totalPages: number;
  totalViews: number;
  totalRevisions: number;
  pendingReportsCount: number;
  publishedPages: number;
  draftPages: number;
  lockedPages: number;
  mostViewedPages: WikiPageSummary[];
  recentActivity: WikiActivityItem[];
  categoryBreakdown: WikiCategoryStats[];
}

export interface WikiPageSummary {
  id: string;
  title: string;
  slug: string;
  view_count: number;
  status: 'draft' | 'published' | 'archived';
  is_locked: boolean;
}

export interface WikiActivityItem {
  id: string;
  page_id: string;
  page_title: string;
  page_slug: string;
  editor_id: string;
  editor_name: string | null;
  editor_avatar: string | null;
  edit_summary: string | null;
  revision_number: number;
  created_at: string;
}

export interface WikiCategoryStats {
  category_id: string;
  category_name: string;
  category_slug: string;
  page_count: number;
  total_views: number;
}

// ============================================================================
// Wiki Generation Types
// ============================================================================

export interface WikiGenerationInput {
  sourceUrl: string;
  targetCategoryId?: string;
}

export interface SimilarWikiArticle {
  id: string;
  slug: string;
  title_en: string;
  title_de: string;
  status: string;
  similarity: number;
  matchReason: string;
}

export interface WikiGenerationResult {
  title_en: string;
  title_de: string;
  content_en: string;
  content_de: string;
  suggestedCategory?: string;
  keyTopics?: string[];
  sourceSummary?: string;
  // Duplicate detection
  similarArticles?: SimilarWikiArticle[];
  hasPotentialDuplicates?: boolean;
}

export type WikiGenerationStatus =
  | 'idle'
  | 'fetching'
  | 'generating'
  | 'success'
  | 'error';

// ============================================================================
// Admin Dashboard Types
// ============================================================================

/**
 * Supabase-sourced dashboard statistics
 */
export interface AdminDashboardStats {
  // User stats
  totalUsers: number;
  newUsers7d: number;
  newUsers30d: number;
  activeUsers7d: number;
  adminCount: number;
  trailblazerCount: number;
  vipCount: number;
  merchantCount: number;
  suspendedCount: number;
  bannedCount: number;

  // Content stats
  totalGearItems: number;
  totalLoadouts: number;
  totalWikiPages: number;
  totalBulletinPosts: number;
  totalShakedowns: number;

  // Recent activity stats
  newGearItems7d: number;
  newLoadouts7d: number;
  newPosts7d: number;

  // Averages
  avgGearPerUser: number;
  avgLoadoutsPerUser: number;
}

/**
 * Vercel Analytics data (if available)
 */
export interface VercelAnalytics {
  pageViews24h: number;
  pageViews7d: number;
  pageViews30d: number;
  uniqueVisitors24h: number;
  uniqueVisitors7d: number;
  topPages: Array<{
    path: string;
    views: number;
  }>;
  webVitals?: {
    lcp: number;
    fid: number;
    cls: number;
  };
}

/**
 * Sentry error metrics (if available)
 */
export interface SentryMetrics {
  errors24h: number;
  errors7d: number;
  unresolvedIssues: number;
  criticalIssues: number;
  errorTrend: 'up' | 'down' | 'stable';
  topErrors: Array<{
    title: string;
    count: number;
    level: 'error' | 'warning' | 'info';
  }>;
}

// ============================================================================
// Hook Return Types
// ============================================================================

export type AdminLoadingState =
  | 'idle'
  | 'loading'
  | 'submitting'
  | 'deleting'
  | 'error';

export interface UseAdminUsersReturn {
  users: AdminUserView[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  searchQuery: string;
  filter: UserFilter;
  sort: UserSort;
  // Actions
  search: (query: string) => void;
  setFilter: (filter: UserFilter) => void;
  setSort: (sort: UserSort) => void;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
  // User management actions
  changeRole: (input: ChangeRoleInput) => Promise<void>;
  changeTier: (input: ChangeTierInput) => Promise<void>;
  suspendUser: (input: SuspendUserInput) => Promise<void>;
  unsuspendUser: (userId: string, reason?: string) => Promise<void>;
  banUser: (input: BanUserInput) => Promise<void>;
  unbanUser: (userId: string, reason?: string) => Promise<void>;
}

export interface UseWikiAdminReturn {
  stats: WikiAdminStats | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseWikiGeneratorReturn {
  status: WikiGenerationStatus;
  result: WikiGenerationResult | null;
  error: string | null;
  generate: (input: WikiGenerationInput) => Promise<void>;
  reset: () => void;
}

export interface UseAdminDashboardReturn {
  stats: AdminDashboardStats | null;
  vercelAnalytics: VercelAnalytics | null;
  sentryMetrics: SentryMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export interface UseAdminActivityLogsReturn {
  logs: AdminActivityLog[];
  isLoading: boolean;
  error: string | null;
  total: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refetch: () => Promise<void>;
}
