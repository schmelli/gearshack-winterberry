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
import {
  buildProductImageQuery,
  sanitizeImageUrl,
  SERPER_TIMEOUT_MS,
} from '@/lib/serper-helpers';

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

/**
 * Fetch a single product image from Serper Images API.
 *
 * NOTE: This server-side call does NOT go through `productImageLimiter`
 * (which only guards the client-facing `/api/vision/product-image` endpoint).
 * This is an accepted cost because:
 * 1. It's bounded to 1 Serper call per detected item (best match only).
 * 2. The overall scan rate is already constrained by `visionScanLimiter`.
 * 3. Alternative images are lazy-loaded via the rate-limited API route.
 */
async function searchProductImage(
  brand: string | null,
  productName: string
): Promise<string | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const query = buildProductImageQuery(brand, productName);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SERPER_TIMEOUT_MS);

    const response = await fetch('https://google.serper.dev/images', {
      method: 'POST',
      headers: {
        'X-API-KEY': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q: query, num: 1 }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const data = await response.json();
    return sanitizeImageUrl(data?.images?.[0]?.imageUrl);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      logWarn(`[VisionMatcher] Image search timed out for query: ${query}`);
    }
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
  // Build full search query (brand + name) for scoring later
  const searchParts: string[] = [];
  if (detected.brand) {
    searchParts.push(detected.brand);
  }
  searchParts.push(detected.name);
  const searchQuery = searchParts.join(' ').trim();

  if (!searchQuery) {
    return { bestMatch: null, alternatives: [] };
  }

  // For the DB filter, use words from the *product name* only (not brand name).
  // catalog_products.name stores only the product name (e.g. "Alto TR2 Tent"),
  // never the brand. Using brand words like "Sea" / "Summit" in name.ilike would
  // never match and produce zero results.
  const productNameWords = detected.name
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length >= 3); // skip short words like "to", "a", "in"

  if (productNameWords.length === 0) {
    return { bestMatch: null, alternatives: [] };
  }

  // Build OR conditions: each significant word in the product name is a candidate
  // filter. This broadens recall so scoring can narrow down the best match.
  const orFilters = productNameWords
    .slice(0, 5) // max 5 words to keep the query manageable
    .map((word) => `name.ilike.%${escapeLikePattern(word)}%`)
    .join(',');

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
    .or(orFilters)
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
