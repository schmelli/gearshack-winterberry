/**
 * useWeightConversion Hook
 *
 * Feature: 012-automatic-unit-conversion
 * Task: subtask-3-1
 *
 * Provides weight conversion utilities that respect user preferences.
 */

'use client';

import { useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';
import {
  convertWeight as convertWeightUtil,
  formatWeightFromGrams as formatWeightFromGramsUtil,
  toGrams,
  fromGrams
} from '@/lib/utils/weight';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface UseWeightConversionReturn {
  /** User's preferred weight unit */
  preferredUnit: WeightUnit;
  /** Convert weight from one unit to another (defaults to user's preferred unit) */
  convertWeight: (value: number, from: WeightUnit, to?: WeightUnit) => number;
  /** Format weight for display (defaults to user's preferred unit) */
  formatForDisplay: (grams: number, unit?: WeightUnit, precision?: number) => string;
  /** Convert to grams (for storage) */
  toGrams: (value: number, unit: WeightUnit) => number;
  /** Convert from grams (for display) */
  fromGrams: (grams: number, unit?: WeightUnit) => number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for weight conversion utilities with user preference support.
 *
 * @param userId - User ID to fetch preferences for
 * @returns Weight conversion utilities
 *
 * @example
 * ```tsx
 * const { convertWeight, formatForDisplay, preferredUnit } = useWeightConversion(user?.id);
 *
 * // Convert weight to user's preferred unit
 * const displayWeight = convertWeight(500, 'g'); // Uses preferredUnit as target
 *
 * // Format weight in user's preferred unit
 * const formatted = formatForDisplay(500); // "500.0 g" or "17.6 oz"
 * ```
 */
export function useWeightConversion(userId: string | null): UseWeightConversionReturn {
  const { preferredWeightUnit } = useUserPreferences(userId);

  // Convert weight with optional target unit (defaults to user preference)
  const convertWeight = useCallback(
    (value: number, from: WeightUnit, to?: WeightUnit): number => {
      const targetUnit = to ?? preferredWeightUnit;
      return convertWeightUtil(value, from, targetUnit);
    },
    [preferredWeightUnit]
  );

  // Format weight for display (defaults to user preference)
  const formatForDisplay = useCallback(
    (grams: number, unit?: WeightUnit, precision: number = 1): string => {
      const displayUnit = unit ?? preferredWeightUnit;
      return formatWeightFromGramsUtil(grams, displayUnit, precision);
    },
    [preferredWeightUnit]
  );

  // Convert from grams with optional target unit (defaults to user preference)
  const fromGramsWithPreference = useCallback(
    (grams: number, unit?: WeightUnit): number => {
      const targetUnit = unit ?? preferredWeightUnit;
      return fromGrams(grams, targetUnit);
    },
    [preferredWeightUnit]
  );

  return {
    preferredUnit: preferredWeightUnit,
    convertWeight,
    formatForDisplay,
    toGrams,
    fromGrams: fromGramsWithPreference,
  };
}
