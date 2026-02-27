/**
 * Vision Catalog Matcher
 *
 * Feature: Image-to-Inventory via Vision
 *
 * Matches AI-detected gear items against the product catalog using
 * the existing fuzzy search infrastructure (pg_trgm).
 * Returns top matches with description, product URL, and image URL.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import pLimit from 'p-limit';
import type { Database } from '@/types/supabase';
import type {
  DetectedGearItem,
  CatalogMatch,
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

/** Maximum number of alternative matches to return per item */
const MAX_ALTERNATIVES = 4;

/** Minimum score for an alternative to be included */
const MIN_ALTERNATIVE_SCORE = 0.25;

// =============================================================================
// Image Search via Serper
// =============================================================================

async function searchProductImage(
  brand: string | null,
  productName: string
): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const query = [brand, productName, 'outdoor gear product']
    .filter(Boolean)
    .join(' ');

  try {
    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 1 }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const firstImage = data?.images?.[0];
    return firstImage?.imageUrl ?? null;
  } catch {
    return null;
  }
}

// =============================================================================
// Main Matcher
// =============================================================================

/**
 * Match detected items from AI vision with the product catalog.
 *
 * For each detected item, builds a search query from brand + name and
 * performs fuzzy search against catalog_products with brand join.
 * Returns top matches (best + alternatives) with full product data.
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
          const { bestMatch, alternatives } = await findCatalogMatches(
            supabase,
            detected
          );
          return { detected, catalogMatch: bestMatch, alternatives };
        } catch (error) {
          errorCount++;
          logWarn(`[VisionMatcher] Failed to match "${detected.name}"`, {
            metadata: {
              itemName: detected.name,
              error: error instanceof Error ? error.message : String(error),
            },
          });
          return { detected, catalogMatch: null, alternatives: [] };
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

interface CatalogMatchesResult {
  bestMatch: CatalogMatch | null;
  alternatives: CatalogMatch[];
}

async function findCatalogMatches(
  supabase: SupabaseClient<Database>,
  detected: DetectedGearItem
): Promise<CatalogMatchesResult> {
  // Build search query: combine brand and name for best match
  const searchParts: string[] = [];
  if (detected.brand) {
    searchParts.push(detected.brand);
  }
  searchParts.push(detected.name);
  const searchQuery = searchParts.join(' ').trim();

  if (!searchQuery) {
    return { bestMatch: null, alternatives: [] };
  }

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  if (queryWords.length === 0) {
    return { bestMatch: null, alternatives: [] };
  }

  const firstWord = escapeLikePattern(queryWords[0]);

  // Query catalog_products with brand join, including description and product_url
  const { data, error } = await supabase
    .from('catalog_products')
    .select(
      `
      id,
      name,
      product_type_id,
      weight_grams,
      price_usd,
      description,
      product_url,
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
    return { bestMatch: null, alternatives: [] };
  }

  // Score each candidate using shared scoring logic
  const scoredMatches: { product: (typeof data)[0]; score: number }[] = [];

  for (const product of data) {
    const rawBrand = product.catalog_brands;
    const brandInfo = Array.isArray(rawBrand)
      ? rawBrand[0] ?? null
      : rawBrand ?? null;

    const ctx = buildScoringContext(searchQuery, product.name, brandInfo?.name);
    const score = scoreCatalogCandidate(ctx, {
      minScore: MIN_ALTERNATIVE_SCORE,
      includeBrandMatches: false,
    });

    if (score > 0) {
      scoredMatches.push({ product, score });
    }
  }

  // Sort by score descending
  scoredMatches.sort((a, b) => b.score - a.score);

  if (scoredMatches.length === 0) {
    return { bestMatch: null, alternatives: [] };
  }

  // Build CatalogMatch objects for each scored result (synchronous — no external API calls)
  const allMatches: CatalogMatch[] = scoredMatches
    .slice(0, MAX_ALTERNATIVES + 1)
    .map((sm) => {
      const rawBrandResult = sm.product.catalog_brands;
      const matchedBrand = Array.isArray(rawBrandResult)
        ? rawBrandResult[0] ?? null
        : rawBrandResult ?? null;

      return {
        productId: sm.product.id,
        productName: sm.product.name,
        brandName: matchedBrand?.name ?? null,
        productTypeId: sm.product.product_type_id ?? null,
        weightGrams: sm.product.weight_grams
          ? Number(sm.product.weight_grams)
          : null,
        priceUsd: sm.product.price_usd
          ? Number(sm.product.price_usd)
          : null,
        description: sm.product.description ?? null,
        productUrl: sm.product.product_url ?? null,
        imageUrl: null, // Images fetched lazily on the client via /api/vision/product-image
        matchScore: Math.round(sm.score * 100) / 100,
      };
    });

  // Best match must meet minimum score threshold
  let bestMatch =
    allMatches[0] && allMatches[0].matchScore >= MIN_MATCH_SCORE
      ? allMatches[0]
      : null;

  // Fetch image only for the best match (1 Serper call max per detected item)
  if (bestMatch) {
    const imageUrl = await searchProductImage(
      bestMatch.brandName,
      bestMatch.productName
    );
    bestMatch = { ...bestMatch, imageUrl };
  }

  // Alternatives: remaining matches that meet the alt threshold, excluding best
  const alternatives = allMatches
    .slice(bestMatch ? 1 : 0)
    .filter((m) => m.matchScore >= MIN_ALTERNATIVE_SCORE);

  return { bestMatch, alternatives };
}
