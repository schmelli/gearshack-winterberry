/**
 * useFeatureFlags Hook
 *
 * Feature: Admin Feature Activation
 *
 * Provides app-wide feature flag checking with user context awareness.
 * Determines if features are enabled for the current user based on
 * their role, subscription tier, and account type.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import type {
  FeatureFlag,
  FeatureUserGroup,
  UseFeatureFlagsReturn,
} from '@/types/feature-flags';

// Zod schema for runtime validation of feature flags
const featureFlagSchema = z.object({
  id: z.string().uuid(),
  feature_key: z.string(),
  feature_name: z.string(),
  description: z.string().nullable(),
  parent_feature_key: z.string().nullable(),
  is_enabled: z.boolean(),
  allowed_groups: z.array(
    z.enum(['all', 'admins', 'trailblazer', 'beta', 'vip', 'merchant'])
  ),
  created_at: z.string(),
  updated_at: z.string(),
  created_by: z.string().nullable(),
  updated_by: z.string().nullable(),
});

const featureFlagsArraySchema = z.array(featureFlagSchema);

/**
 * Hook for checking feature availability throughout the app
 *
 * @example
 * ```tsx
 * const { isFeatureEnabled, isLoading } = useFeatureFlags();
 *
 * if (!isFeatureEnabled('messaging')) {
 *   return <FeatureDisabledMessage />;
 * }
 * ```
 */
export function useFeatureFlags(): UseFeatureFlagsReturn {
  const { profile } = useAuthContext();
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Supabase client once (no deps needed - createClient returns singleton)
  const supabase = useMemo(() => createClient(), []);

  // Extract user context from profile
  const userContext = useMemo(() => {
    const rawProfile = profile.rawProfile;
    const mergedUser = profile.mergedUser;

    return {
      isAdmin: mergedUser?.isAdmin ?? false,
      isTrailblazer: rawProfile?.subscription_tier === 'trailblazer',
      isBeta: false, // TODO: Add beta flag to profiles if needed
      isVip: rawProfile?.account_type === 'vip',
      isMerchant: rawProfile?.account_type === 'merchant',
    };
  }, [profile.rawProfile, profile.mergedUser]);

  // Fetch feature flags
  const fetchFeatures = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Use 'any' to avoid TypeScript deep instantiation error with Supabase types
      // We validate the data with Zod below, which provides runtime type safety
      const response: any = await (supabase as any)
        .from('feature_flags')
        .select('*')
        .order('feature_key');

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Validate response data with Zod
      const parsedData = featureFlagsArraySchema.safeParse(response.data);
      if (!parsedData.success) {
        console.error('[useFeatureFlags] Failed to parse feature flags:', parsedData.error);
        throw new Error('Invalid feature flags data received from server');
      }

      setFeatures(parsedData.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feature flags';
      setError(message);
      console.error('[useFeatureFlags] Error fetching features:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Check if a user belongs to a specific group
  const userBelongsToGroup = useCallback(
    (group: FeatureUserGroup): boolean => {
      switch (group) {
        case 'all':
          return true;
        case 'admins':
          return userContext.isAdmin;
        case 'trailblazer':
          return userContext.isTrailblazer;
        case 'beta':
          return userContext.isBeta;
        case 'vip':
          return userContext.isVip;
        case 'merchant':
          return userContext.isMerchant;
        default:
          return false;
      }
    },
    [userContext]
  );

  // Check if a feature is enabled for the current user
  const isFeatureEnabled = useCallback(
    (featureKey: string, visited = new Set<string>()): boolean => {
      // Prevent infinite recursion from circular dependencies
      if (visited.has(featureKey)) {
        console.error('[useFeatureFlags] Circular dependency detected:', featureKey);
        return false;
      }
      visited.add(featureKey);

      const feature = features.find((f) => f.feature_key === featureKey);

      // Feature not found - default to disabled
      if (!feature) {
        return false;
      }

      // Feature is globally disabled
      if (!feature.is_enabled) {
        return false;
      }

      // Check parent feature if this is a child
      if (feature.parent_feature_key) {
        const parentEnabled = isFeatureEnabled(feature.parent_feature_key, visited);
        if (!parentEnabled) {
          return false;
        }
      }

      // No group restrictions - available to everyone
      if (!feature.allowed_groups || feature.allowed_groups.length === 0) {
        return true;
      }

      // Check if user belongs to any allowed group
      // Admins always have access to all features
      if (userContext.isAdmin) {
        return true;
      }

      return feature.allowed_groups.some((group) => userBelongsToGroup(group));
    },
    [features, userContext.isAdmin, userBelongsToGroup]
  );

  return {
    isFeatureEnabled,
    features,
    isLoading,
    error,
    refetch: fetchFeatures,
  };
}

/**
 * Standalone function to check feature access without hook
 * Useful for server-side or non-React contexts
 */
export async function checkFeatureAccess(
  featureKey: string,
  userContext: {
    isAdmin: boolean;
    subscriptionTier: string | null;
    accountType: string | null;
  }
): Promise<boolean> {
  const supabase = createClient();

  const { data: feature, error } = await (supabase as any)
    .from('feature_flags')
    .select('*')
    .eq('feature_key', featureKey)
    .single();

  if (error || !feature) {
    return false;
  }

  if (!feature.is_enabled) {
    return false;
  }

  // Check parent
  if (feature.parent_feature_key) {
    const parentEnabled = await checkFeatureAccess(
      feature.parent_feature_key,
      userContext
    );
    if (!parentEnabled) {
      return false;
    }
  }

  // No restrictions
  if (!feature.allowed_groups || feature.allowed_groups.length === 0) {
    return true;
  }

  // Admins always have access
  if (userContext.isAdmin) {
    return true;
  }

  // Check group membership
  const groups = feature.allowed_groups as FeatureUserGroup[];
  return groups.some((group) => {
    switch (group) {
      case 'all':
        return true;
      case 'admins':
        return userContext.isAdmin;
      case 'trailblazer':
        return userContext.subscriptionTier === 'trailblazer';
      case 'beta':
        // TODO: Implement beta flag in profiles table
        return false;
      case 'vip':
        return userContext.accountType === 'vip';
      case 'merchant':
        return userContext.accountType === 'merchant';
      default:
        return false;
    }
  });
}
