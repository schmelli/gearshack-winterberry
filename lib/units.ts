/**
 * Unit Conversion Utilities
 *
 * Feature: settings-update
 * Utility functions for converting between metric and imperial units.
 */

import type { WeightUnit, DistanceUnit, TemperatureUnit, DimensionUnit } from '@/types/settings';

// =============================================================================
// Weight Conversions
// =============================================================================

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;
const GRAMS_PER_KG = 1000;

/**
 * Convert weight to grams (base unit)
 */
export function toGrams(value: number, fromUnit: WeightUnit): number {
  switch (fromUnit) {
    case 'g':
      return value;
    case 'kg':
      return value * GRAMS_PER_KG;
    case 'oz':
      return value * GRAMS_PER_OZ;
    case 'lb':
      return value * GRAMS_PER_LB;
    default:
      return value;
  }
}

/**
 * Convert grams to target unit
 */
export function fromGrams(grams: number, toUnit: WeightUnit): number {
  switch (toUnit) {
    case 'g':
      return grams;
    case 'kg':
      return grams / GRAMS_PER_KG;
    case 'oz':
      return grams / GRAMS_PER_OZ;
    case 'lb':
      return grams / GRAMS_PER_LB;
    default:
      return grams;
  }
}

/**
 * Convert weight between any units
 */
export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit): number {
  if (fromUnit === toUnit) return value;
  const grams = toGrams(value, fromUnit);
  return fromGrams(grams, toUnit);
}

/**
 * Format weight with unit label
 */
export function formatWeight(
  grams: number,
  displayUnit: WeightUnit,
  options?: { decimals?: number; showUnit?: boolean }
): string {
  const { decimals = 1, showUnit = true } = options ?? {};
  const value = fromGrams(grams, displayUnit);
  const formatted = value.toFixed(decimals);
  return showUnit ? `${formatted} ${displayUnit}` : formatted;
}

/**
 * Get appropriate weight unit label
 */
export function getWeightLabel(unit: WeightUnit): string {
  const labels: Record<WeightUnit, string> = {
    g: 'grams',
    kg: 'kilograms',
    oz: 'ounces',
    lb: 'pounds',
  };
  return labels[unit];
}

// =============================================================================
// Distance Conversions
// =============================================================================

const KM_PER_MILE = 1.60934;

/**
 * Convert kilometers to miles
 */
export function kmToMiles(km: number): number {
  return km / KM_PER_MILE;
}

/**
 * Convert miles to kilometers
 */
export function milesToKm(miles: number): number {
  return miles * KM_PER_MILE;
}

/**
 * Convert distance between units
 */
export function convertDistance(
  value: number,
  fromUnit: DistanceUnit,
  toUnit: DistanceUnit
): number {
  if (fromUnit === toUnit) return value;
  return fromUnit === 'km' ? kmToMiles(value) : milesToKm(value);
}

/**
 * Format distance with unit label
 */
export function formatDistance(
  km: number,
  displayUnit: DistanceUnit,
  options?: { decimals?: number; showUnit?: boolean }
): string {
  const { decimals = 1, showUnit = true } = options ?? {};
  const value = displayUnit === 'km' ? km : kmToMiles(km);
  const formatted = value.toFixed(decimals);
  return showUnit ? `${formatted} ${displayUnit}` : formatted;
}

// =============================================================================
// Temperature Conversions
// =============================================================================

/**
 * Convert Celsius to Fahrenheit
 */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/**
 * Convert Fahrenheit to Celsius
 */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/**
 * Convert temperature between units
 */
export function convertTemperature(
  value: number,
  fromUnit: TemperatureUnit,
  toUnit: TemperatureUnit
): number {
  if (fromUnit === toUnit) return value;
  return fromUnit === 'C' ? celsiusToFahrenheit(value) : fahrenheitToCelsius(value);
}

/**
 * Format temperature with unit label
 */
export function formatTemperature(
  celsius: number,
  displayUnit: TemperatureUnit,
  options?: { decimals?: number; showUnit?: boolean }
): string {
  const { decimals = 0, showUnit = true } = options ?? {};
  const value = displayUnit === 'C' ? celsius : celsiusToFahrenheit(celsius);
  const formatted = value.toFixed(decimals);
  const symbol = displayUnit === 'C' ? '\u00B0C' : '\u00B0F';
  return showUnit ? `${formatted}${symbol}` : formatted;
}

// =============================================================================
// Dimension Conversions
// =============================================================================

const CM_PER_INCH = 2.54;

/**
 * Convert centimeters to inches
 */
export function cmToInches(cm: number): number {
  return cm / CM_PER_INCH;
}

/**
 * Convert inches to centimeters
 */
export function inchesToCm(inches: number): number {
  return inches * CM_PER_INCH;
}

/**
 * Convert dimension between units
 */
export function convertDimension(
  value: number,
  fromUnit: DimensionUnit,
  toUnit: DimensionUnit
): number {
  if (fromUnit === toUnit) return value;
  return fromUnit === 'cm' ? cmToInches(value) : inchesToCm(value);
}

/**
 * Format dimension with unit label
 */
export function formatDimension(
  cm: number,
  displayUnit: DimensionUnit,
  options?: { decimals?: number; showUnit?: boolean }
): string {
  const { decimals = 1, showUnit = true } = options ?? {};
  const value = displayUnit === 'cm' ? cm : cmToInches(cm);
  const formatted = value.toFixed(decimals);
  const label = displayUnit === 'cm' ? 'cm' : 'in';
  return showUnit ? `${formatted} ${label}` : formatted;
}

/**
 * Format dimensions (L x W x H)
 */
export function formatDimensions(
  lengthCm: number | null,
  widthCm: number | null,
  heightCm: number | null,
  displayUnit: DimensionUnit,
  options?: { decimals?: number }
): string | null {
  const { decimals = 1 } = options ?? {};
  const parts: string[] = [];

  if (lengthCm != null) {
    parts.push(formatDimension(lengthCm, displayUnit, { decimals, showUnit: false }));
  }
  if (widthCm != null) {
    parts.push(formatDimension(widthCm, displayUnit, { decimals, showUnit: false }));
  }
  if (heightCm != null) {
    parts.push(formatDimension(heightCm, displayUnit, { decimals, showUnit: false }));
  }

  if (parts.length === 0) return null;

  const unit = displayUnit === 'cm' ? 'cm' : 'in';
  return `${parts.join(' \u00D7 ')} ${unit}`;
}
