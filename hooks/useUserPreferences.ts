/**
 * useUserPreferences Hook
 *
 * Feature: 012-automatic-unit-conversion
 * Task: subtask-2-1
 *
 * Provides user preference state and methods for application settings.
 * Wraps useSupabaseProfile to provide convenient accessors for user preferences.
 */

'use client';

import { useCallback } from 'react';
import { useSupabaseProfile } from './useSupabaseProfile';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface UseUserPreferencesReturn {
  /** User's preferred weight unit (defaults to 'g' if not set) */
  preferredWeightUnit: WeightUnit;
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Update preferred weight unit */
  setPreferredWeightUnit: (unit: WeightUnit) => Promise<{ error: string | null }>;
  /** Refresh preferences from database */
  refreshPreferences: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing user preferences with Supabase persistence.
 *
 * @param userId - User ID to fetch preferences for
 * @returns User preferences state and setter functions
 *
 * @example
 * ```tsx
 * const { preferredWeightUnit, setPreferredWeightUnit } = useUserPreferences(user?.id);
 *
 * // Display weight in user's preferred unit
 * const displayWeight = convertWeight(weightGrams, 'g', preferredWeightUnit);
 *
 * // Update preference
 * await setPreferredWeightUnit('oz');
 * ```
 */
export function useUserPreferences(userId: string | null): UseUserPreferencesReturn {
  const { profile, isLoading, error, updateProfile, refreshProfile } = useSupabaseProfile(userId);

  // Extract preferred weight unit from profile (default to 'g')
  // Note: preferred_weight_unit column may not exist in all database schemas
  // Using type assertion to handle potential schema differences
  const profileData = profile as Record<string, unknown> | null;
  const preferredWeightUnit: WeightUnit = (profileData?.preferred_weight_unit as WeightUnit) ?? 'g';

  // Update preferred weight unit in Supabase
  const setPreferredWeightUnit = useCallback(
    async (unit: WeightUnit): Promise<{ error: string | null }> => {
      if (!userId) {
        return { error: 'No user ID provided' };
      }

      // Validate unit
      if (!['g', 'oz', 'lb'].includes(unit)) {
        return { error: 'Invalid weight unit. Must be g, oz, or lb.' };
      }

      // Update profile with new weight unit preference
      // Note: preferred_weight_unit column may not exist in all database schemas
      // Using type assertion to handle potential schema differences
      const result = await updateProfile({
        preferred_weight_unit: unit,
      } as unknown as Parameters<typeof updateProfile>[0]);

      return result;
    },
    [userId, updateProfile]
  );

  // Refresh preferences (alias for refreshProfile)
  const refreshPreferences = useCallback(async () => {
    await refreshProfile();
  }, [refreshProfile]);

  return {
    preferredWeightUnit,
    isLoading,
    error,
    setPreferredWeightUnit,
    refreshPreferences,
  };
}
