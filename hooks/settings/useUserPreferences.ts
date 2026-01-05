/**
 * User Preferences Hook
 *
 * Feature: settings-update
 * Main hook for reading and writing user preferences to Supabase.
 * Follows Feature-Sliced Light pattern with all business logic in hooks.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  UserPreferences,
  UserPreferencesRow,
  UnitSystem,
} from '@/types/settings';
import {
  DEFAULT_USER_PREFERENCES,
  METRIC_DEFAULTS,
  IMPERIAL_DEFAULTS,
} from '@/types/settings';

// Re-export defaults for convenience
export { DEFAULT_USER_PREFERENCES } from '@/types/settings';

interface UseUserPreferencesReturn {
  preferences: UserPreferences;
  isLoading: boolean;
  error: string | null;
  updatePreference: <K extends keyof UserPreferences>(
    key: K,
    value: UserPreferences[K]
  ) => Promise<void>;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  setUnitSystem: (system: UnitSystem) => Promise<void>;
  resetToDefaults: () => Promise<void>;
  refetch: () => Promise<void>;
}

/**
 * Convert database row (snake_case) to UserPreferences (camelCase)
 */
function rowToPreferences(row: Partial<UserPreferencesRow>): Partial<UserPreferences> {
  return {
    preferredLocale: row.preferred_locale,
    unitSystem: row.unit_system,
    preferredWeightUnit: row.preferred_weight_unit,
    preferredDistanceUnit: row.preferred_distance_unit,
    preferredTemperatureUnit: row.preferred_temperature_unit,
    preferredDimensionUnit: row.preferred_dimension_unit,
    preferredCurrency: row.preferred_currency,
    currencyPosition: row.currency_position,
    showOriginalPrice: row.show_original_price,
    autoConvertPrices: row.auto_convert_prices,
    dateFormat: row.date_format,
    timeFormat: row.time_format,
    weekStartsOn: row.week_starts_on,
    timezone: row.timezone,
    displayDensity: row.display_density,
    reduceAnimations: row.reduce_animations,
    showWeightBreakdown: row.show_weight_breakdown,
    startPage: row.start_page,
    notificationPreferences: row.notification_preferences,
  };
}

/**
 * Convert UserPreferences key to database column name
 */
function keyToColumn(key: keyof UserPreferences): string {
  const mapping: Record<keyof UserPreferences, string> = {
    preferredLocale: 'preferred_locale',
    unitSystem: 'unit_system',
    preferredWeightUnit: 'preferred_weight_unit',
    preferredDistanceUnit: 'preferred_distance_unit',
    preferredTemperatureUnit: 'preferred_temperature_unit',
    preferredDimensionUnit: 'preferred_dimension_unit',
    preferredCurrency: 'preferred_currency',
    currencyPosition: 'currency_position',
    showOriginalPrice: 'show_original_price',
    autoConvertPrices: 'auto_convert_prices',
    dateFormat: 'date_format',
    timeFormat: 'time_format',
    weekStartsOn: 'week_starts_on',
    timezone: 'timezone',
    displayDensity: 'display_density',
    reduceAnimations: 'reduce_animations',
    showWeightBreakdown: 'show_weight_breakdown',
    startPage: 'start_page',
    notificationPreferences: 'notification_preferences',
  };
  return mapping[key];
}

/**
 * Hook for managing user preferences
 */
export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  /**
   * Fetch preferences from database
   */
  const fetchPreferences = useCallback(async () => {
    if (!user?.id) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select(
          `
          preferred_locale,
          unit_system,
          preferred_weight_unit,
          preferred_distance_unit,
          preferred_temperature_unit,
          preferred_dimension_unit,
          preferred_currency,
          currency_position,
          show_original_price,
          auto_convert_prices,
          date_format,
          time_format,
          week_starts_on,
          timezone,
          display_density,
          reduce_animations,
          show_weight_breakdown,
          start_page,
          notification_preferences
        `
        )
        .eq('id', user.id)
        .single();

      if (fetchError) {
        // If columns don't exist yet, use defaults
        if (fetchError.code === 'PGRST116' || fetchError.message.includes('column')) {
          setPreferences(DEFAULT_USER_PREFERENCES);
        } else {
          throw fetchError;
        }
      } else if (data) {
        const parsed = rowToPreferences(data as Partial<UserPreferencesRow>);
        setPreferences({
          ...DEFAULT_USER_PREFERENCES,
          ...Object.fromEntries(
            Object.entries(parsed).filter(([, v]) => v !== undefined && v !== null)
          ),
        } as UserPreferences);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch preferences';
      setError(message);
      console.error('Error fetching preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, supabase]);

  /**
   * Update a single preference
   */
  const updatePreference = useCallback(
    async <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => {
      if (!user?.id) {
        setError('Not authenticated');
        return;
      }

      // Optimistic update
      const previousValue = preferences[key];
      setPreferences((prev) => ({ ...prev, [key]: value }));
      setError(null);

      try {
        const column = keyToColumn(key);
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ [column]: value })
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      } catch (err) {
        // Rollback on error
        setPreferences((prev) => ({ ...prev, [key]: previousValue }));
        const message = err instanceof Error ? err.message : 'Failed to update preference';
        setError(message);
        console.error('Error updating preference:', err);
      }
    },
    [user?.id, preferences, supabase]
  );

  /**
   * Update multiple preferences at once
   */
  const updatePreferences = useCallback(
    async (updates: Partial<UserPreferences>) => {
      if (!user?.id) {
        setError('Not authenticated');
        return;
      }

      // Optimistic update
      const previousPreferences = { ...preferences };
      setPreferences((prev) => ({ ...prev, ...updates }));
      setError(null);

      try {
        // Convert to database columns
        const dbUpdates: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(updates)) {
          const column = keyToColumn(key as keyof UserPreferences);
          dbUpdates[column] = value;
        }

        const { error: updateError } = await supabase
          .from('profiles')
          .update(dbUpdates)
          .eq('id', user.id);

        if (updateError) {
          throw updateError;
        }
      } catch (err) {
        // Rollback on error
        setPreferences(previousPreferences);
        const message = err instanceof Error ? err.message : 'Failed to update preferences';
        setError(message);
        console.error('Error updating preferences:', err);
      }
    },
    [user?.id, preferences, supabase]
  );

  /**
   * Set unit system and auto-configure related units
   */
  const setUnitSystem = useCallback(
    async (system: UnitSystem) => {
      const updates: Partial<UserPreferences> = { unitSystem: system };

      if (system === 'metric') {
        updates.preferredWeightUnit = METRIC_DEFAULTS.weightUnit;
        updates.preferredDistanceUnit = METRIC_DEFAULTS.distanceUnit;
        updates.preferredTemperatureUnit = METRIC_DEFAULTS.temperatureUnit;
        updates.preferredDimensionUnit = METRIC_DEFAULTS.dimensionUnit;
      } else if (system === 'imperial') {
        updates.preferredWeightUnit = IMPERIAL_DEFAULTS.weightUnit;
        updates.preferredDistanceUnit = IMPERIAL_DEFAULTS.distanceUnit;
        updates.preferredTemperatureUnit = IMPERIAL_DEFAULTS.temperatureUnit;
        updates.preferredDimensionUnit = IMPERIAL_DEFAULTS.dimensionUnit;
      }
      // 'custom' keeps current individual settings

      await updatePreferences(updates);
    },
    [updatePreferences]
  );

  /**
   * Reset all preferences to defaults
   */
  const resetToDefaults = useCallback(async () => {
    await updatePreferences(DEFAULT_USER_PREFERENCES);
  }, [updatePreferences]);

  // Fetch on mount and when user changes
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  return {
    preferences,
    isLoading,
    error,
    updatePreference,
    updatePreferences,
    setUnitSystem,
    resetToDefaults,
    refetch: fetchPreferences,
  };
}
