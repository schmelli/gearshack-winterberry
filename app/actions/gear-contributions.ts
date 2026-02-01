/**
 * Gear Contributions Server Action
 *
 * Feature: URL-Import & Contributions Pipeline
 *
 * Externalizes the contribution processing pipeline for gear items.
 * Handles GearGraph catalog matching, delta computation, and contribution tracking.
 *
 * Flow:
 * 1. Auth check
 * 2. Rate limit check (50 contributions per user per hour)
 * 3. GearGraph lookup via fuzzy search
 * 4. Determine contribution type based on match score
 * 5. Compute delta between user data and catalog match
 * 6. Transform catalog match to result format
 * 7. Save contribution record for gardener workflow
 */

'use server';

import { createClient } from '@/lib/supabase/server';
import { fuzzyProductSearch } from '@/lib/supabase/catalog';
import { checkAndRecordContribution, HOURLY_LIMIT } from '@/lib/rate-limits/gear-contributions';
import type { CatalogMatchResult } from '@/types/contributions';

// =============================================================================
// Types
// =============================================================================

/**
 * Contribution type based on catalog match quality
 * - new_product: Score < 0.3 - Product not found in catalog
 * - incomplete_match: Score 0.3-0.7 - Partial match, needs review
 * - data_update: Score >= 0.7 - Strong match, user is updating existing data
 */
export type ContributionType = 'new_product' | 'incomplete_match' | 'data_update';

/**
 * Operation type from the gear editor
 * - create: New gear item being added
 * - update: Existing gear item being modified
 * - url_import: Data imported from URL
 */
export type OperationType = 'create' | 'update' | 'url_import';

/**
 * Input data for processing a gear contribution
 */
export interface GearContributionInput {
  userData: {
    name: string;
    brand?: string;
    weightGrams?: number;
    priceValue?: number;
    currency?: string;
    imageUrl?: string;
    description?: string;
    categoryId?: string;
  };
  sourceUrl?: string;
  operationType: OperationType;
  existingItemId?: string;
}

/**
 * Result from processing a contribution
 */
export interface ContributionResult {
  /** UUID of the saved contribution (empty string if save failed) */
  contributionId: string;
  /** Best catalog match, if any */
  catalogMatch: CatalogMatchResult | null;
  /** Determined contribution type */
  contributionType: ContributionType;
  /** Suggested category from catalog match */
  categorySuggestion: string | null;
}

/**
 * Delta record showing differences between user data and catalog
 */
interface DeltaRecord {
  [field: string]: { old: unknown; new: unknown };
}

// =============================================================================
// Score Thresholds
// =============================================================================

/** Below this score, treat as new product (not in catalog) */
const NEW_PRODUCT_THRESHOLD = 0.3;

/** Below this score but >= NEW_PRODUCT_THRESHOLD, treat as incomplete match */
const INCOMPLETE_MATCH_THRESHOLD = 0.7;

/**
 * Minimum Levenshtein distance (normalized) to consider brand names as different.
 * Values below this threshold are considered "close enough" (e.g., case differences).
 * Range: 0-1 where 0 = identical, 1 = completely different
 */
const BRAND_SIMILARITY_THRESHOLD = 0.15;

// =============================================================================
// Main Function
// =============================================================================

/**
 * Process a gear contribution through the catalog matching pipeline.
 *
 * This function:
 * 1. Verifies user authentication
 * 2. Checks rate limit (50 contributions per user per hour)
 * 3. Searches the GearGraph catalog for matching products
 * 4. Determines the contribution type based on match score
 * 5. Computes delta between user data and catalog data
 * 6. Saves the contribution for the gardener workflow
 *
 * @param input - User data and context for the contribution
 * @returns Contribution result with match info and category suggestion
 * @throws Error if rate limit exceeded (with user-friendly message)
 */
export async function processGearContribution(
  input: GearContributionInput
): Promise<ContributionResult> {
  const supabase = await createClient();

  // 1. Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Unauthorized');
  }

  // 2. Rate limit check (50 contributions per hour)
  const rateLimitStatus = await checkAndRecordContribution(user.id);
  if (!rateLimitStatus.allowed) {
    const minutesUntilReset = Math.ceil(
      (rateLimitStatus.resetAt.getTime() - Date.now()) / (60 * 1000)
    );
    throw new Error(
      `Rate limit exceeded. You can submit ${HOURLY_LIMIT} contributions per hour. ` +
        `Please try again in ${minutesUntilReset} minute${minutesUntilReset !== 1 ? 's' : ''}.`
    );
  }

  // 3. GearGraph Lookup
  const searchQuery = `${input.userData.brand || ''} ${input.userData.name}`.trim();
  const catalogMatches = await fuzzyProductSearch(supabase, searchQuery, { limit: 1 });
  const catalogMatch = catalogMatches[0] ?? null;
  const topScore = catalogMatch?.score ?? 0;

  // 4. Contribution-Typ bestimmen
  const contributionType: ContributionType = determineContributionType(topScore);

  // 5. Delta berechnen (bei Match)
  const delta =
    topScore >= NEW_PRODUCT_THRESHOLD ? computeDelta(input.userData, catalogMatch) : null;

  // 6. Transform catalog match to CatalogMatchResult format
  const catalogMatchResult: CatalogMatchResult | null = catalogMatch
    ? {
        id: catalogMatch.id,
        name: catalogMatch.name,
        brand: catalogMatch.brand?.name ?? null,
        categoryMain: catalogMatch.categoryMain,
        subcategory: catalogMatch.subcategory,
        productType: catalogMatch.productType,
        productTypeId: catalogMatch.productTypeId,
        description: catalogMatch.description,
        weightGrams: catalogMatch.weightGrams,
        priceUsd: catalogMatch.priceUsd,
        matchScore: topScore,
      }
    : null;

  // 7. Contribution speichern
  // Build base insert data (columns in generated types)
  const baseInsertData = {
    contributor_hash: await generateContributorHash(user.id),
    brand_name: input.userData.brand || 'Unknown',
    product_name: input.userData.name,
    source_url: input.sourceUrl ?? null,
    geargraph_matched: topScore >= NEW_PRODUCT_THRESHOLD,
    matched_catalog_product_id: catalogMatch?.id ?? null,
    matched_confidence: topScore > 0 ? topScore : null,
  };

  // Extended data includes new columns from migration that may not be in generated types yet
  const extendedInsertData = {
    ...baseInsertData,
    // New columns from 20260201000000_url_import_enhancement.sql migration
    contribution_type: contributionType,
    catalog_match_score: topScore > 0 ? topScore : null,
    catalog_match_id: catalogMatch?.id ?? null,
    enrichment_data: {
      ...input.userData,
      delta,
      sourceUrl: input.sourceUrl,
      operationType: input.operationType,
      existingItemId: input.existingItemId,
    },
    suggestion_status: 'pending',
  };

  // Use type assertion to handle new columns not yet in generated Supabase types
  // TODO: Remove this assertion after running `npx supabase gen types typescript`
  const { data: contribution, error } = await supabase
    .from('user_contributions')
    .insert(extendedInsertData as typeof baseInsertData)
    .select('id')
    .single();

  if (error) {
    console.error('[Contributions] Failed to save contribution:', error);
    // Fire-and-forget - don't throw, return partial result
    return {
      contributionId: '',
      catalogMatch: catalogMatchResult,
      contributionType,
      categorySuggestion: catalogMatch?.productTypeId ?? null,
    };
  }

  return {
    contributionId: contribution.id,
    catalogMatch: catalogMatchResult,
    contributionType,
    categorySuggestion: catalogMatch?.productTypeId ?? null,
  };
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Determine contribution type based on catalog match score.
 *
 * @param score - Catalog match score (0-1)
 * @returns Contribution type
 */
function determineContributionType(score: number): ContributionType {
  if (score < NEW_PRODUCT_THRESHOLD) {
    return 'new_product';
  }
  if (score < INCOMPLETE_MATCH_THRESHOLD) {
    return 'incomplete_match';
  }
  return 'data_update';
}

/**
 * Compute Levenshtein distance between two strings.
 * Uses dynamic programming approach with O(min(m,n)) space optimization.
 *
 * @param a - First string
 * @param b - Second string
 * @returns Number of single-character edits (insertions, deletions, substitutions)
 */
function levenshteinDistance(a: string, b: string): number {
  // Ensure a is the shorter string for space optimization
  if (a.length > b.length) {
    [a, b] = [b, a];
  }

  const m = a.length;
  const n = b.length;

  // Handle edge cases
  if (m === 0) return n;
  if (n === 0) return m;

  // Use single array with O(min(m,n)) space
  let prev = Array.from({ length: m + 1 }, (_, i) => i);
  let curr = new Array<number>(m + 1);

  for (let j = 1; j <= n; j++) {
    curr[0] = j;
    for (let i = 1; i <= m; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[i] = Math.min(
        prev[i] + 1, // deletion
        curr[i - 1] + 1, // insertion
        prev[i - 1] + cost // substitution
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[m];
}

/**
 * Calculate normalized similarity between two brand names.
 * Returns a value between 0 (identical) and 1 (completely different).
 * Uses case-insensitive comparison and Levenshtein distance normalization.
 *
 * @param brand1 - First brand name
 * @param brand2 - Second brand name
 * @returns Normalized distance (0 = identical, 1 = max different)
 */
function normalizedBrandDistance(brand1: string, brand2: string): number {
  const a = brand1.toLowerCase().trim();
  const b = brand2.toLowerCase().trim();

  // Identical after normalization
  if (a === b) return 0;

  const distance = levenshteinDistance(a, b);
  const maxLen = Math.max(a.length, b.length);

  // Avoid division by zero
  if (maxLen === 0) return 0;

  return distance / maxLen;
}

/**
 * Compute delta between user data and catalog match.
 *
 * Only includes fields where there is a meaningful difference:
 * - Brand: Levenshtein distance > 15% of max length (ignores case differences)
 * - Weight: > 10g difference
 * - Price: > 10% difference
 * - Description: Only if catalog is empty and user provided one
 *
 * @param userData - User-provided data
 * @param catalogMatch - Matched catalog product
 * @returns Delta record or null if no meaningful differences
 */
function computeDelta(
  userData: GearContributionInput['userData'],
  catalogMatch: {
    weightGrams: number | null;
    priceUsd: number | null;
    description: string | null;
    brand?: { id: string; name: string } | null;
  } | null
): DeltaRecord | null {
  if (!catalogMatch) return null;

  const delta: DeltaRecord = {};

  // Brand name comparison (using Levenshtein distance)
  // Only track if: user provided brand AND (catalog has brand with meaningful difference OR catalog has no brand)
  if (userData.brand) {
    const catalogBrandName = catalogMatch.brand?.name ?? null;

    if (catalogBrandName) {
      // Both have brand names - check for meaningful difference using fuzzy matching
      const distance = normalizedBrandDistance(userData.brand, catalogBrandName);
      if (distance > BRAND_SIMILARITY_THRESHOLD) {
        // Significant difference (e.g., "Hellnox" vs "Helinox") - track it
        delta.brand = {
          old: catalogBrandName,
          new: userData.brand,
        };
      }
      // Minor differences (e.g., "MSR" vs "msr") are ignored
    } else {
      // User is adding brand data that catalog doesn't have
      delta.brand = {
        old: null,
        new: userData.brand,
      };
    }
  }

  // Weight comparison (> 10g difference)
  if (userData.weightGrams !== undefined && catalogMatch.weightGrams !== null) {
    const weightDiff = Math.abs(userData.weightGrams - catalogMatch.weightGrams);
    if (weightDiff > 10) {
      delta.weight = {
        old: catalogMatch.weightGrams,
        new: userData.weightGrams,
      };
    }
  } else if (userData.weightGrams !== undefined && catalogMatch.weightGrams === null) {
    // User is adding weight data that catalog doesn't have
    delta.weight = {
      old: null,
      new: userData.weightGrams,
    };
  }

  // Price comparison (> 10% difference)
  if (userData.priceValue !== undefined && catalogMatch.priceUsd !== null && catalogMatch.priceUsd > 0) {
    const priceDiff = Math.abs(userData.priceValue - catalogMatch.priceUsd) / catalogMatch.priceUsd;
    if (priceDiff > 0.1) {
      delta.price = {
        old: catalogMatch.priceUsd,
        new: userData.priceValue,
      };
    }
  } else if (userData.priceValue !== undefined && catalogMatch.priceUsd === null) {
    // User is adding price data that catalog doesn't have
    delta.price = {
      old: null,
      new: userData.priceValue,
    };
  }

  // Description comparison (only if catalog is empty)
  if (userData.description && !catalogMatch.description) {
    delta.description = {
      old: null,
      new: userData.description,
    };
  }

  // Image URL (only if user provided one)
  if (userData.imageUrl) {
    delta.imageUrl = {
      old: null,
      new: userData.imageUrl,
    };
  }

  // Category (only if user provided one)
  if (userData.categoryId) {
    delta.categoryId = {
      old: null,
      new: userData.categoryId,
    };
  }

  return Object.keys(delta).length > 0 ? delta : null;
}

/**
 * Generate a privacy-preserving hash of the user ID.
 *
 * Uses SHA-256 with a salt to prevent identification across contributions.
 * The salt should be set via CONTRIBUTOR_HASH_SALT environment variable in production.
 *
 * @param userId - User UUID
 * @returns Hashed contributor identifier (32 hex characters)
 */
async function generateContributorHash(userId: string): Promise<string> {
  const salt = process.env.CONTRIBUTOR_HASH_SALT ?? 'gearshack-default-salt-change-in-prod';
  const encoder = new TextEncoder();
  const data = encoder.encode(`${salt}:${userId}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Take first 16 bytes (32 hex chars) for reasonable uniqueness
  return hashArray
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
