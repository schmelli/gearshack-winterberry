/**
 * Vision Catalog Matcher
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Matches AI-detected gear items against the product catalog using
 * the existing fuzzy search infrastructure (pg_trgm).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  DetectedGearItem,
  CatalogMatchResult,
} from '@/types/vision-scan';

// =============================================================================
// Configuration
// =============================================================================

/** Minimum match score to consider a catalog match valid */
const MIN_MATCH_SCORE = 0.3;

/**
 * Escapes special characters in LIKE/ILIKE patterns.
 * Mirrors the pattern from lib/supabase/catalog.ts.
 */
function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\./g, ' ');
}

// =============================================================================
// Main Matcher
// =============================================================================

/**
 * Match detected items from AI vision with the product catalog.
 *
 * For each detected item, builds a search query from brand + name and
 * performs fuzzy search against catalog_products with brand join.
 *
 * @param supabase - Authenticated Supabase client
 * @param detectedItems - Items detected by AI vision
 * @returns Array of match results with catalog product info
 */
export async function matchDetectedItemsWithCatalog(
  supabase: SupabaseClient<Database>,
  detectedItems: DetectedGearItem[]
): Promise<CatalogMatchResult[]> {
  const results: CatalogMatchResult[] = [];

  for (const detected of detectedItems) {
    try {
      const match = await findBestCatalogMatch(supabase, detected);
      results.push({
        detected,
        catalogMatch: match,
      });
    } catch (error) {
      console.error(
        `[VisionMatcher] Failed to match "${detected.name}":`,
        error
      );
      results.push({
        detected,
        catalogMatch: null,
      });
    }
  }

  return results;
}

// =============================================================================
// Internal Helpers
// =============================================================================

async function findBestCatalogMatch(
  supabase: SupabaseClient<Database>,
  detected: DetectedGearItem
): Promise<CatalogMatchResult['catalogMatch']> {
  // Build search query: combine brand and name for best match
  const searchParts: string[] = [];
  if (detected.brand) {
    searchParts.push(detected.brand);
  }
  searchParts.push(detected.name);
  const searchQuery = searchParts.join(' ').trim();

  if (!searchQuery) {
    return null;
  }

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0) {
    return null;
  }

  const firstWord = escapeLikePattern(queryWords[0]);

  // Query catalog_products with brand join
  const { data, error } = await supabase
    .from('catalog_products')
    .select(
      `
      id,
      name,
      product_type_id,
      weight_grams,
      price_usd,
      brand_id,
      catalog_brands!catalog_products_brand_id_fkey (
        id,
        name
      )
    `
    )
    .or(`name.ilike.%${firstWord}%`)
    .limit(20);

  if (error || !data || data.length === 0) {
    return null;
  }

  // Score each candidate using multi-strategy approach (same as catalog.ts)
  let bestMatch: {
    product: (typeof data)[0];
    score: number;
  } | null = null;

  for (const product of data) {
    const productName = (product.name ?? '').toLowerCase();
    const brandName =
      ((product.catalog_brands as { id: string; name: string } | null)?.name ?? '').toLowerCase();
    const combinedText = `${brandName} ${productName}`.trim();

    const potentialScores: number[] = [];

    // Strategy 1: Full query in combined text
    if (combinedText.includes(normalizedQuery)) {
      const matchIndex = combinedText.indexOf(normalizedQuery);
      const score =
        matchIndex === 0
          ? 0.95 + 0.05 * (normalizedQuery.length / combinedText.length)
          : 0.85 + 0.1 * (normalizedQuery.length / combinedText.length);
      potentialScores.push(score);
    }

    // Strategy 2: All query words in combined text
    if (
      queryWords.length > 1 &&
      queryWords.every((word) => combinedText.includes(word))
    ) {
      const score =
        0.75 + 0.1 * (normalizedQuery.length / combinedText.length);
      potentialScores.push(score);
    }

    // Strategy 3: Query in product name only
    if (productName.includes(normalizedQuery)) {
      const matchIndex = productName.indexOf(normalizedQuery);
      const score =
        matchIndex === 0
          ? 0.7 + 0.1 * (normalizedQuery.length / productName.length)
          : 0.5 + 0.15 * (normalizedQuery.length / productName.length);
      potentialScores.push(score);
    }

    // Strategy 4: Any words match (require 50%)
    if (queryWords.some((word) => combinedText.includes(word))) {
      const matchingWords = queryWords.filter((word) =>
        combinedText.includes(word)
      );
      const matchRatio = matchingWords.length / queryWords.length;
      if (matchRatio >= 0.5) {
        potentialScores.push(0.3 * matchRatio);
      }
    }

    const score =
      potentialScores.length > 0 ? Math.max(...potentialScores) : 0;

    if (score >= MIN_MATCH_SCORE && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const { product, score } = bestMatch;
  const brandInfo = product.catalog_brands as { id: string; name: string } | null;

  return {
    productId: product.id,
    productName: product.name,
    brandName: brandInfo?.name ?? null,
    productTypeId: product.product_type_id ?? null,
    weightGrams: product.weight_grams ? Number(product.weight_grams) : null,
    priceUsd: product.price_usd ? Number(product.price_usd) : null,
    matchScore: Math.round(score * 100) / 100,
  };
}
