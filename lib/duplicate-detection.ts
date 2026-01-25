/**
 * Duplicate Detection Utilities
 *
 * Feature: XXX-duplicate-detection
 * Constitution: Business logic in lib/, UI in components/
 *
 * Provides similarity scoring and duplicate detection for gear items.
 * Uses weighted scoring across multiple fields with Levenshtein distance
 * for fuzzy name matching.
 */

import type { GearItem, GearItemFormData } from '@/types/gear';
import { calculateSimilarity } from '@/lib/external-apis/fuzzy-matcher';

// =============================================================================
// Types
// =============================================================================

export interface DuplicateMatch {
  /** The existing gear item that matches */
  existingItem: GearItem;
  /** Overall similarity score (0-1) */
  score: number;
  /** Confidence level based on score */
  confidence: 'high' | 'medium';
  /** Human-readable reasons for the match */
  matchReasons: string[];
}

export interface DuplicateDetectionOptions {
  /** Minimum score threshold to consider a duplicate (default: 0.70) */
  threshold?: number;
  /** Maximum number of matches to return (default: 3) */
  maxMatches?: number;
  /** Item ID to exclude from comparison (for editing existing items) */
  excludeId?: string;
}

// =============================================================================
// Constants
// =============================================================================

/** Scoring weights for different fields */
const WEIGHTS = {
  BRAND_MODEL: 0.4, // 40% - Brand + Model exact/fuzzy match
  NAME: 0.35, // 35% - Name similarity
  CATEGORY: 0.15, // 15% - Same product type
  BRAND_ONLY: 0.1, // 10% - Brand similarity alone
} as const;

/** Thresholds for confidence levels */
const THRESHOLDS = {
  HIGH: 0.85,
  MEDIUM: 0.7,
} as const;

/** Active statuses to check for duplicates */
const ACTIVE_STATUSES = ['own', 'wishlist'] as const;

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Normalize a string for comparison
 * - Lowercase
 * - Trim whitespace
 * - Remove extra internal spaces
 * - Handle null/undefined
 */
export function normalizeString(str: string | null | undefined): string {
  if (!str) return '';
  return str.toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Check if two strings are an exact match (case-insensitive)
 */
function isExactMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const normA = normalizeString(a);
  const normB = normalizeString(b);
  return normA !== '' && normB !== '' && normA === normB;
}

// =============================================================================
// Scoring Functions
// =============================================================================

/**
 * Calculate brand + model similarity score
 * - Exact match on both = 1.0
 * - Fuzzy match = average similarity
 */
function calculateBrandModelScore(
  newItem: GearItemFormData,
  existingItem: GearItem
): { score: number; isExact: boolean } {
  const newBrand = normalizeString(newItem.brand);
  const newModel = normalizeString(newItem.modelNumber);
  const existingBrand = normalizeString(existingItem.brand);
  const existingModel = normalizeString(existingItem.modelNumber);

  // Skip if both are empty on new item
  if (!newBrand && !newModel) {
    return { score: 0, isExact: false };
  }

  // Exact match on both brand and model
  if (newBrand && newModel && newBrand === existingBrand && newModel === existingModel) {
    return { score: 1.0, isExact: true };
  }

  // Calculate fuzzy similarity
  let totalScore = 0;
  let count = 0;

  if (newBrand && existingBrand) {
    totalScore += calculateSimilarity(newBrand, existingBrand);
    count++;
  }

  if (newModel && existingModel) {
    totalScore += calculateSimilarity(newModel, existingModel);
    count++;
  }

  const score = count > 0 ? totalScore / count : 0;
  return {
    score: Number.isFinite(score) ? score : 0,
    isExact: false,
  };
}

/**
 * Calculate the overall duplicate score between a new item and an existing item
 */
export function calculateDuplicateScore(
  newItem: GearItemFormData,
  existingItem: GearItem
): DuplicateMatch | null {
  let totalScore = 0;
  const matchReasons: string[] = [];

  // 1. Brand + Model scoring (40%)
  const brandModelResult = calculateBrandModelScore(newItem, existingItem);
  totalScore += brandModelResult.score * WEIGHTS.BRAND_MODEL;

  if (brandModelResult.isExact) {
    matchReasons.push('Exact brand and model');
  } else if (brandModelResult.score > 0.7) {
    matchReasons.push('Similar brand/model');
  }

  // 2. Name similarity (35%)
  const newName = normalizeString(newItem.name);
  const existingName = normalizeString(existingItem.name);

  if (newName && existingName) {
    const nameSimilarity = calculateSimilarity(newName, existingName);
    totalScore += nameSimilarity * WEIGHTS.NAME;

    if (nameSimilarity > 0.8) {
      matchReasons.push(`Similar name (${Math.round(nameSimilarity * 100)}%)`);
    }
  }

  // 3. Category match (15%)
  if (
    newItem.productTypeId &&
    existingItem.productTypeId &&
    newItem.productTypeId === existingItem.productTypeId
  ) {
    totalScore += WEIGHTS.CATEGORY;
    matchReasons.push('Same category');
  }

  // 4. Brand-only similarity (10%)
  const newBrand = normalizeString(newItem.brand);
  const existingBrand = normalizeString(existingItem.brand);

  if (newBrand && existingBrand) {
    const brandSimilarity = calculateSimilarity(newBrand, existingBrand);
    totalScore += brandSimilarity * WEIGHTS.BRAND_ONLY;
  }

  // Determine confidence level
  if (totalScore < THRESHOLDS.MEDIUM) {
    return null; // Below threshold, not a duplicate
  }

  const confidence: 'high' | 'medium' = totalScore >= THRESHOLDS.HIGH ? 'high' : 'medium';

  return {
    existingItem,
    score: totalScore,
    confidence,
    matchReasons,
  };
}

// =============================================================================
// Main Detection Function
// =============================================================================

/**
 * Find potential duplicates for a new/edited gear item
 *
 * @param formData - The form data for the new/edited item
 * @param allItems - All gear items in the user's inventory
 * @param options - Detection options (threshold, maxMatches, excludeId)
 * @returns Array of duplicate matches sorted by score (highest first)
 */
export function findDuplicates(
  formData: GearItemFormData,
  allItems: GearItem[],
  options: DuplicateDetectionOptions = {}
): DuplicateMatch[] {
  const { threshold = THRESHOLDS.MEDIUM, maxMatches = 3, excludeId } = options;

  // Filter to active statuses only and exclude current item if editing
  const candidateItems = allItems.filter((item) => {
    // Exclude the item being edited
    if (excludeId && item.id === excludeId) {
      return false;
    }
    // Only check active items (own, wishlist)
    return ACTIVE_STATUSES.includes(item.status as (typeof ACTIVE_STATUSES)[number]);
  });

  // Early termination: check for exact brand+model match first
  const exactMatch = candidateItems.find(
    (item) =>
      isExactMatch(formData.brand, item.brand) &&
      isExactMatch(formData.modelNumber, item.modelNumber) &&
      formData.brand && // Ensure brand is not empty
      formData.modelNumber // Ensure model is not empty
  );

  if (exactMatch) {
    // Found exact match, return immediately with high confidence
    return [
      {
        existingItem: exactMatch,
        score: 1.0,
        confidence: 'high',
        matchReasons: ['Exact brand and model'],
      },
    ];
  }

  // Calculate scores for all candidates
  const matches: DuplicateMatch[] = [];

  for (const item of candidateItems) {
    const match = calculateDuplicateScore(formData, item);
    if (match && match.score >= threshold) {
      matches.push(match);
    }
  }

  // Sort by score descending and limit results
  return matches.sort((a, b) => b.score - a.score).slice(0, maxMatches);
}

/**
 * Get the best match from a list of duplicates
 */
export function getBestMatch(matches: DuplicateMatch[]): DuplicateMatch | null {
  if (matches.length === 0) return null;
  return matches[0]; // Already sorted by score
}
