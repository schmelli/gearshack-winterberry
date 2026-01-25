/**
 * Feature Flags Types
 *
 * Feature: Admin Feature Activation
 *
 * Type definitions for the feature flag system that allows
 * admins to enable/disable features globally or per user group.
 */

// ============================================================================
// User Group Types
// ============================================================================

/**
 * User groups that can be used for feature restrictions
 * - 'all': No restriction, available to everyone when enabled
 * - 'admins': Only admin users
 * - 'trailblazer': Users with trailblazer subscription tier
 * - 'beta': Beta testers (determined by profile flag)
 * - 'vip': VIP account holders
 * - 'merchant': Merchant accounts
 */
export type FeatureUserGroup =
  | 'all'
  | 'admins'
  | 'trailblazer'
  | 'beta'
  | 'vip'
  | 'merchant';

export const FEATURE_USER_GROUP_LABELS = {
  all: 'Everyone',
  admins: 'Admins',
  trailblazer: 'Trailblazer',
  beta: 'Beta Users',
  vip: 'VIP',
  merchant: 'Merchants',
} as const satisfies Record<FeatureUserGroup, string>;

export const FEATURE_USER_GROUP_DESCRIPTIONS = {
  all: 'All registered users',
  admins: 'Users with admin role',
  trailblazer: 'Users with Trailblazer subscription',
  beta: 'Users participating in beta testing',
  vip: 'VIP account holders',
  merchant: 'Merchant account holders',
} as const satisfies Record<FeatureUserGroup, string>;

// ============================================================================
// Feature Flag Types
// ============================================================================

/**
 * A feature flag configuration
 */
export interface FeatureFlag {
  id: string;
  feature_key: string;
  feature_name: string;
  description: string | null;
  parent_feature_key: string | null;
  is_enabled: boolean;
  allowed_groups: FeatureUserGroup[];
  created_at: string;
  updated_at: string;
  created_by: string | null;
  updated_by: string | null;
}

/**
 * Feature flag with child features for hierarchical display
 */
export interface FeatureFlagWithChildren extends FeatureFlag {
  children: FeatureFlag[];
}

/**
 * Known feature keys in the system
 */
export type FeatureKey =
  | 'community'
  | 'community_bulletin'
  | 'community_shakedowns'
  | 'community_social'
  | 'community_wiki'
  | 'ai_gear_assistant'
  | 'messaging';

/**
 * Feature metadata for UI display
 */
export const FEATURE_METADATA: Record<
  FeatureKey,
  { icon: string; color: string }
> = {
  community: { icon: 'Users', color: 'blue' },
  community_bulletin: { icon: 'MessageSquare', color: 'blue' },
  community_shakedowns: { icon: 'Scale', color: 'blue' },
  community_social: { icon: 'UserPlus', color: 'blue' },
  community_wiki: { icon: 'BookOpen', color: 'blue' },
  ai_gear_assistant: { icon: 'Bot', color: 'purple' },
  messaging: { icon: 'Mail', color: 'green' },
};

// ============================================================================
// Input Types for Admin Operations
// ============================================================================

/**
 * Input for updating a feature flag
 */
export interface UpdateFeatureFlagInput {
  featureKey: string;
  isEnabled: boolean;
  allowedGroups: FeatureUserGroup[];
}

/**
 * Input for creating a new feature flag
 */
export interface CreateFeatureFlagInput {
  featureKey: string;
  featureName: string;
  description?: string;
  parentFeatureKey?: string;
  isEnabled: boolean;
  allowedGroups: FeatureUserGroup[];
}

// ============================================================================
// Hook Return Types
// ============================================================================

export type FeatureFlagLoadingState = 'idle' | 'loading' | 'submitting' | 'error';

/**
 * Return type for useFeatureFlags hook (app-wide feature checking)
 */
export interface UseFeatureFlagsReturn {
  /** Check if a feature is enabled for the current user */
  isFeatureEnabled: (featureKey: string) => boolean;
  /** All feature flags */
  features: FeatureFlag[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh feature flags */
  refetch: () => Promise<void>;
}

/**
 * Return type for useAdminFeatureFlags hook (admin management)
 */
export interface UseAdminFeatureFlagsReturn {
  /** All feature flags with hierarchical structure */
  features: FeatureFlagWithChildren[];
  /** Flat list of all feature flags */
  flatFeatures: FeatureFlag[];
  /** Loading state */
  loadingState: FeatureFlagLoadingState;
  /** Error message */
  error: string | null;
  /** Update a feature flag */
  updateFeature: (input: UpdateFeatureFlagInput) => Promise<void>;
  /** Create a new feature flag */
  createFeature: (input: CreateFeatureFlagInput) => Promise<void>;
  /** Delete a feature flag */
  deleteFeature: (featureKey: string) => Promise<void>;
  /** Refresh feature flags */
  refetch: () => Promise<void>;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * User context needed for feature flag checks
 */
export interface FeatureFlagUserContext {
  isAdmin: boolean;
  isTrailblazer: boolean;
  isBeta: boolean;
  isVip: boolean;
  isMerchant: boolean;
}
