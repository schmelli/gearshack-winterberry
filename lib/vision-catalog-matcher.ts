/**
 * Vision Catalog Matcher
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Matches AI-detected gear items against the product catalog using
 * the existing fuzzy search infrastructure (pg_trgm).
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import type { Database } from '@/types/supabase';
import type {
  DetectedGearItem,
  CatalogMatchResult,
} from '@/types/vision-scan';
import {
  escapeLikePattern,
  buildScoringContext,
  scoreCatalogCandidate,
} from '@/lib/catalog-scoring';
import { logWarn, logError } from '@/lib/mastra/logging';

// =============================================================================
// Configuration
// =============================================================================

/** Minimum match score to consider a catalog match valid */
const MIN_MATCH_SCORE = 0.3;

/** Maximum concurrent catalog queries to avoid overwhelming the database */
const CATALOG_QUERY_CONCURRENCY = 5;

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
  const limit = pLimit(CATALOG_QUERY_CONCURRENCY);
  let errorCount = 0;

  const results = await Promise.all(
    detectedItems.map((detected) =>
      limit(async () => {
        try {
          const catalogMatch = await findBestCatalogMatch(supabase, detected);
          return { detected, catalogMatch };
        } catch (error) {
          errorCount++;
          logWarn(`[VisionMatcher] Failed to match "${detected.name}"`, {
            metadata: {
              itemName: detected.name,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          return { detected, catalogMatch: null };
        }
      })
    )
  );

  // Log elevated warning if majority of matches failed (likely infrastructure issue)
  if (errorCount > 0 && errorCount >= Math.ceil(detectedItems.length / 2)) {
    logError('[VisionMatcher] Majority of catalog matches failed', undefined, {
      metadata: {
        totalItems: detectedItems.length,
        failedItems: errorCount,
      },
    });
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

  // Score each candidate using shared scoring logic
  let bestMatch: {
    product: (typeof data)[0];
    score: number;
  } | null = null;

  for (const product of data) {
    const rawBrand = product.catalog_brands;
    const brandInfo = Array.isArray(rawBrand) ? rawBrand[0] ?? null : rawBrand ?? null;

    const ctx = buildScoringContext(searchQuery, product.name, brandInfo?.name);
    const score = scoreCatalogCandidate(ctx, {
      minScore: MIN_MATCH_SCORE,
      includeBrandMatches: false,
    });

    if (score > 0 && (!bestMatch || score > bestMatch.score)) {
      bestMatch = { product, score };
    }
  }

  if (!bestMatch) {
    return null;
  }

  const { product, score } = bestMatch;
  const rawBrandResult = product.catalog_brands;
  const matchedBrand = Array.isArray(rawBrandResult) ? rawBrandResult[0] ?? null : rawBrandResult ?? null;

  return {
    productId: product.id,
    productName: product.name,
    brandName: matchedBrand?.name ?? null,
    productTypeId: product.product_type_id ?? null,
    weightGrams: product.weight_grams ? Number(product.weight_grams) : null,
    priceUsd: product.price_usd ? Number(product.price_usd) : null,
    matchScore: Math.round(score * 100) / 100,
  };
}
