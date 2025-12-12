/**
 * Weight Unit Conversion Utilities
 *
 * Feature: 040-supabase-migration
 * Task: T032
 *
 * Helper functions for converting between weight units (g, oz, lb)
 * per FR-012: System MUST store weight in grams and support display
 * in grams, ounces, or pounds.
 */

import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Constants
// =============================================================================

/** Grams per ounce */
const GRAMS_PER_OUNCE = 28.3495;

/** Grams per pound */
const GRAMS_PER_POUND = 453.592;

/** Ounces per pound */
const OUNCES_PER_POUND = 16;

// =============================================================================
// Conversion Functions
// =============================================================================

/**
 * Convert grams to ounces
 */
export function gramsToOunces(grams: number): number {
  return grams / GRAMS_PER_OUNCE;
}

/**
 * Convert grams to pounds
 */
export function gramsToPounds(grams: number): number {
  return grams / GRAMS_PER_POUND;
}

/**
 * Convert ounces to grams
 */
export function ouncesToGrams(ounces: number): number {
  return ounces * GRAMS_PER_OUNCE;
}

/**
 * Convert pounds to grams
 */
export function poundsToGrams(pounds: number): number {
  return pounds * GRAMS_PER_POUND;
}

/**
 * Convert ounces to pounds
 */
export function ouncesToPounds(ounces: number): number {
  return ounces / OUNCES_PER_POUND;
}

/**
 * Convert pounds to ounces
 */
export function poundsToOunces(pounds: number): number {
  return pounds * OUNCES_PER_POUND;
}

// =============================================================================
// Generic Conversion
// =============================================================================

/**
 * Convert a weight value from one unit to another
 */
export function convertWeight(value: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return value;

  // First convert to grams
  let grams: number;
  switch (from) {
    case 'g':
      grams = value;
      break;
    case 'oz':
      grams = ouncesToGrams(value);
      break;
    case 'lb':
      grams = poundsToGrams(value);
      break;
    default:
      throw new Error(`Unknown weight unit: ${from}`);
  }

  // Then convert to target unit
  switch (to) {
    case 'g':
      return grams;
    case 'oz':
      return gramsToOunces(grams);
    case 'lb':
      return gramsToPounds(grams);
    default:
      throw new Error(`Unknown weight unit: ${to}`);
  }
}

/**
 * Convert a weight value to grams (for storage)
 */
export function toGrams(value: number, unit: WeightUnit): number {
  return convertWeight(value, unit, 'g');
}

/**
 * Convert a weight value from grams (for display)
 */
export function fromGrams(grams: number, unit: WeightUnit): number {
  return convertWeight(grams, 'g', unit);
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format a weight value with its unit suffix
 *
 * @param value - The weight value
 * @param unit - The weight unit
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted string like "123.4 g" or "4.3 oz"
 */
export function formatWeight(value: number, unit: WeightUnit, precision: number = 1): string {
  const formatted = value.toFixed(precision);
  return `${formatted} ${unit}`;
}

/**
 * Format a weight value stored in grams for display in a specific unit
 *
 * @param grams - The weight in grams
 * @param displayUnit - The unit to display in
 * @param precision - Number of decimal places (default: 1)
 * @returns Formatted string like "123.4 g" or "4.3 oz"
 */
export function formatWeightFromGrams(
  grams: number,
  displayUnit: WeightUnit,
  precision: number = 1
): string {
  const value = fromGrams(grams, displayUnit);
  return formatWeight(value, displayUnit, precision);
}

/**
 * Parse a weight string to a number
 * Handles various formats: "123", "123.4", "123.4g", "123.4 g", etc.
 *
 * @param input - The input string
 * @returns The parsed number, or null if invalid
 */
export function parseWeight(input: string): number | null {
  if (!input) return null;

  // Remove unit suffix and whitespace
  const cleaned = input.replace(/\s*(g|oz|lb)s?\s*$/i, '').trim();

  // Parse as float
  const value = parseFloat(cleaned);

  if (isNaN(value) || !isFinite(value)) {
    return null;
  }

  return value;
}

// =============================================================================
// Weight Summary for Loadouts
// =============================================================================

export interface WeightSummary {
  /** Total weight of all items */
  totalWeight: number;
  /** Base weight (total - worn - consumable) */
  baseWeight: number;
  /** Weight of worn items */
  wornWeight: number;
  /** Weight of consumable items */
  consumableWeight: number;
}

/**
 * Calculate a weight summary with all values in grams
 */
export function calculateWeightSummary(
  totalGrams: number,
  wornGrams: number,
  consumableGrams: number
): WeightSummary {
  return {
    totalWeight: totalGrams,
    baseWeight: totalGrams - wornGrams - consumableGrams,
    wornWeight: wornGrams,
    consumableWeight: consumableGrams,
  };
}
