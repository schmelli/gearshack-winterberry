/**
 * Unit Conversion Hook
 *
 * Feature: settings-update
 * Hook for converting and formatting values based on user preferences.
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useUserPreferences } from './useUserPreferences';
import {
  formatWeight,
  formatDistance,
  formatTemperature,
  formatDimension,
  formatDimensions,
  convertWeight,
  convertDistance,
  convertTemperature,
  convertDimension,
} from '@/lib/units';
import type { WeightUnit, DistanceUnit, TemperatureUnit, DimensionUnit } from '@/types/settings';

interface FormatOptions {
  decimals?: number;
  showUnit?: boolean;
}

interface UseUnitConversionReturn {
  // Current preferences
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  temperatureUnit: TemperatureUnit;
  dimensionUnit: DimensionUnit;

  // Formatters (use user's preferred unit)
  formatWeight: (grams: number, options?: FormatOptions) => string;
  formatDistance: (km: number, options?: FormatOptions) => string;
  formatTemperature: (celsius: number, options?: FormatOptions) => string;
  formatDimension: (cm: number, options?: FormatOptions) => string;
  formatDimensions: (
    lengthCm: number | null,
    widthCm: number | null,
    heightCm: number | null,
    options?: { decimals?: number }
  ) => string | null;

  // Converters (convert to user's preferred unit)
  convertToPreferredWeight: (grams: number) => number;
  convertToPreferredDistance: (km: number) => number;
  convertToPreferredTemperature: (celsius: number) => number;
  convertToPreferredDimension: (cm: number) => number;

  // Converters (convert from user's preferred unit to base)
  convertFromPreferredWeight: (value: number) => number;
  convertFromPreferredDistance: (value: number) => number;
  convertFromPreferredTemperature: (value: number) => number;
  convertFromPreferredDimension: (value: number) => number;
}

/**
 * Hook for unit conversion based on user preferences
 */
export function useUnitConversion(): UseUnitConversionReturn {
  const { preferences } = useUserPreferences();

  const weightUnit = preferences.preferredWeightUnit;
  const distanceUnit = preferences.preferredDistanceUnit;
  const temperatureUnit = preferences.preferredTemperatureUnit;
  const dimensionUnit = preferences.preferredDimensionUnit;

  // Memoized formatters
  const formatWeightFn = useCallback(
    (grams: number, options?: FormatOptions) => {
      return formatWeight(grams, weightUnit, options);
    },
    [weightUnit]
  );

  const formatDistanceFn = useCallback(
    (km: number, options?: FormatOptions) => {
      return formatDistance(km, distanceUnit, options);
    },
    [distanceUnit]
  );

  const formatTemperatureFn = useCallback(
    (celsius: number, options?: FormatOptions) => {
      return formatTemperature(celsius, temperatureUnit, options);
    },
    [temperatureUnit]
  );

  const formatDimensionFn = useCallback(
    (cm: number, options?: FormatOptions) => {
      return formatDimension(cm, dimensionUnit, options);
    },
    [dimensionUnit]
  );

  const formatDimensionsFn = useCallback(
    (
      lengthCm: number | null,
      widthCm: number | null,
      heightCm: number | null,
      options?: { decimals?: number }
    ) => {
      return formatDimensions(lengthCm, widthCm, heightCm, dimensionUnit, options);
    },
    [dimensionUnit]
  );

  // Memoized converters to preferred unit
  const convertToPreferredWeight = useCallback(
    (grams: number) => {
      return convertWeight(grams, 'g', weightUnit);
    },
    [weightUnit]
  );

  const convertToPreferredDistance = useCallback(
    (km: number) => {
      return convertDistance(km, 'km', distanceUnit);
    },
    [distanceUnit]
  );

  const convertToPreferredTemperature = useCallback(
    (celsius: number) => {
      return convertTemperature(celsius, 'C', temperatureUnit);
    },
    [temperatureUnit]
  );

  const convertToPreferredDimension = useCallback(
    (cm: number) => {
      return convertDimension(cm, 'cm', dimensionUnit);
    },
    [dimensionUnit]
  );

  // Memoized converters from preferred unit to base
  const convertFromPreferredWeight = useCallback(
    (value: number) => {
      return convertWeight(value, weightUnit, 'g');
    },
    [weightUnit]
  );

  const convertFromPreferredDistance = useCallback(
    (value: number) => {
      return convertDistance(value, distanceUnit, 'km');
    },
    [distanceUnit]
  );

  const convertFromPreferredTemperature = useCallback(
    (value: number) => {
      return convertTemperature(value, temperatureUnit, 'C');
    },
    [temperatureUnit]
  );

  const convertFromPreferredDimension = useCallback(
    (value: number) => {
      return convertDimension(value, dimensionUnit, 'cm');
    },
    [dimensionUnit]
  );

  return useMemo(
    () => ({
      weightUnit,
      distanceUnit,
      temperatureUnit,
      dimensionUnit,
      formatWeight: formatWeightFn,
      formatDistance: formatDistanceFn,
      formatTemperature: formatTemperatureFn,
      formatDimension: formatDimensionFn,
      formatDimensions: formatDimensionsFn,
      convertToPreferredWeight,
      convertToPreferredDistance,
      convertToPreferredTemperature,
      convertToPreferredDimension,
      convertFromPreferredWeight,
      convertFromPreferredDistance,
      convertFromPreferredTemperature,
      convertFromPreferredDimension,
    }),
    [
      weightUnit,
      distanceUnit,
      temperatureUnit,
      dimensionUnit,
      formatWeightFn,
      formatDistanceFn,
      formatTemperatureFn,
      formatDimensionFn,
      formatDimensionsFn,
      convertToPreferredWeight,
      convertToPreferredDistance,
      convertToPreferredTemperature,
      convertToPreferredDimension,
      convertFromPreferredWeight,
      convertFromPreferredDistance,
      convertFromPreferredTemperature,
      convertFromPreferredDimension,
    ]
  );
}
