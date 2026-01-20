/**
 * useAdminFeatureFlags Hook
 *
 * Feature: Admin Feature Activation
 *
 * Admin-specific hook for managing feature flags.
 * Provides CRUD operations and hierarchical feature organization.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { toast } from 'sonner';
import type {
  FeatureFlag,
  FeatureFlagWithChildren,
  FeatureFlagLoadingState,
  UpdateFeatureFlagInput,
  CreateFeatureFlagInput,
  UseAdminFeatureFlagsReturn,
} from '@/types/feature-flags';

/**
 * Hook for admin management of feature flags
 *
 * @example
 * ```tsx
 * const { features, updateFeature, loadingState } = useAdminFeatureFlags();
 *
 * const handleToggle = async (featureKey: string, enabled: boolean) => {
 *   await updateFeature({
 *     featureKey,
 *     isEnabled: enabled,
 *     allowedGroups: [],
 *   });
 * };
 * ```
 */
export function useAdminFeatureFlags(): UseAdminFeatureFlagsReturn {
  const { profile } = useAuthContext();
  const [flatFeatures, setFlatFeatures] = useState<FeatureFlag[]>([]);
  const [loadingState, setLoadingState] = useState<FeatureFlagLoadingState>('idle');
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const currentUserId = profile.mergedUser?.uid;

  // Build hierarchical structure from flat list
  const features = useMemo((): FeatureFlagWithChildren[] => {
    // Get root features (no parent)
    const rootFeatures = flatFeatures.filter((f) => !f.parent_feature_key);

    // Map each root feature with its children
    return rootFeatures.map((root) => ({
      ...root,
      children: flatFeatures.filter((f) => f.parent_feature_key === root.feature_key),
    }));
  }, [flatFeatures]);

  // Fetch all feature flags
  const fetchFeatures = useCallback(async () => {
    try {
      setLoadingState('loading');
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('feature_flags')
        .select('*')
        .order('feature_key');

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setFlatFeatures(data as FeatureFlag[]);
      setLoadingState('idle');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load feature flags';
      setError(message);
      setLoadingState('error');
      console.error('[useAdminFeatureFlags] Error fetching features:', err);
    }
  }, [supabase]);

  // Initial fetch
  useEffect(() => {
    fetchFeatures();
  }, [fetchFeatures]);

  // Update a feature flag
  const updateFeature = useCallback(
    async (input: UpdateFeatureFlagInput): Promise<void> => {
      try {
        setLoadingState('submitting');
        setError(null);

        // Find the existing feature to get its name for the toast
        const existingFeature = flatFeatures.find(
          (f) => f.feature_key === input.featureKey
        );

        const { error: updateError } = await supabase
          .from('feature_flags')
          .update({
            is_enabled: input.isEnabled,
            allowed_groups: input.allowedGroups,
            updated_by: currentUserId,
            updated_at: new Date().toISOString(),
          })
          .eq('feature_key', input.featureKey);

        if (updateError) {
          throw new Error(updateError.message);
        }

        // Log admin activity
        await supabase.from('admin_activity_logs').insert({
          admin_id: currentUserId,
          action_type: 'feature_flag_update',
          target_resource_type: 'feature_flag',
          target_resource_id: existingFeature?.id,
          old_value: existingFeature
            ? {
                is_enabled: existingFeature.is_enabled,
                allowed_groups: existingFeature.allowed_groups,
              }
            : null,
          new_value: {
            is_enabled: input.isEnabled,
            allowed_groups: input.allowedGroups,
          },
        });

        // Refresh data
        await fetchFeatures();

        toast.success(
          `Feature "${existingFeature?.feature_name || input.featureKey}" updated`
        );
        setLoadingState('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update feature';
        setError(message);
        setLoadingState('error');
        toast.error(message);
        console.error('[useAdminFeatureFlags] Error updating feature:', err);
        throw err;
      }
    },
    [supabase, currentUserId, flatFeatures, fetchFeatures]
  );

  // Create a new feature flag
  const createFeature = useCallback(
    async (input: CreateFeatureFlagInput): Promise<void> => {
      try {
        setLoadingState('submitting');
        setError(null);

        const { error: insertError } = await supabase.from('feature_flags').insert({
          feature_key: input.featureKey,
          feature_name: input.featureName,
          description: input.description || null,
          parent_feature_key: input.parentFeatureKey || null,
          is_enabled: input.isEnabled,
          allowed_groups: input.allowedGroups,
          created_by: currentUserId,
          updated_by: currentUserId,
        });

        if (insertError) {
          throw new Error(insertError.message);
        }

        // Refresh data
        await fetchFeatures();

        toast.success(`Feature "${input.featureName}" created`);
        setLoadingState('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create feature';
        setError(message);
        setLoadingState('error');
        toast.error(message);
        console.error('[useAdminFeatureFlags] Error creating feature:', err);
        throw err;
      }
    },
    [supabase, currentUserId, fetchFeatures]
  );

  // Delete a feature flag
  const deleteFeature = useCallback(
    async (featureKey: string): Promise<void> => {
      try {
        setLoadingState('submitting');
        setError(null);

        // Find the feature to get its name for the toast
        const feature = flatFeatures.find((f) => f.feature_key === featureKey);

        // Check if feature has children
        const hasChildren = flatFeatures.some(
          (f) => f.parent_feature_key === featureKey
        );

        if (hasChildren) {
          throw new Error(
            'Cannot delete feature with child features. Delete children first.'
          );
        }

        const { error: deleteError } = await supabase
          .from('feature_flags')
          .delete()
          .eq('feature_key', featureKey);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        // Refresh data
        await fetchFeatures();

        toast.success(`Feature "${feature?.feature_name || featureKey}" deleted`);
        setLoadingState('idle');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to delete feature';
        setError(message);
        setLoadingState('error');
        toast.error(message);
        console.error('[useAdminFeatureFlags] Error deleting feature:', err);
        throw err;
      }
    },
    [supabase, flatFeatures, fetchFeatures]
  );

  return {
    features,
    flatFeatures,
    loadingState,
    error,
    updateFeature,
    createFeature,
    deleteFeature,
    refetch: fetchFeatures,
  };
}
