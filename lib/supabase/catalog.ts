/**
 * Catalog query utilities for fuzzy search
 * Feature: 042-catalog-sync-api
 *
 * Note: Uses catalog_products table (not catalog_items) per actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { BrandSearchResult, ProductSearchResult } from '@/types/catalog';

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Escapes special characters in LIKE/ILIKE patterns AND PostgREST .or() syntax.
 * Prevents user input containing %, _, or \ from being interpreted as wildcards.
 * Also prevents PostgREST filter injection via commas, parens, and dots.
 * @param input - Raw user input
 * @returns Escaped string safe for LIKE patterns and .or() filter strings
 */
function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')  // Escape backslash first
    .replace(/%/g, '\\%')    // Escape percent
    .replace(/_/g, '\\_')    // Escape underscore
    .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')      // Remove opening parens (PostgREST grouping)
    .replace(/\)/g, '')      // Remove closing parens (PostgREST grouping)
    .replace(/\./g, ' ');    // Replace dots with space (prevents .eq., .neq. injection)
}

// ============================================================================
// CLIENT SETUP
// ============================================================================

/**
 * Creates a Supabase client with service role key for admin operations
 * Use this ONLY for sync API routes (server-side)
 */
export function createServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================================================
// BRAND SEARCH
// ============================================================================

/**
 * Performs fuzzy search on brand names using ILIKE
 * Trigram index (GIN) improves performance for this query
 * @param supabase - Supabase client instance
 * @param query - Search query string
 * @param limit - Maximum number of results (default 5)
 * @returns Array of brand search results with similarity scores
 */
export async function fuzzyBrandSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  limit: number = 5
): Promise<BrandSearchResult[]> {
  const normalizedQuery = query.toLowerCase().trim();
  const escapedQuery = escapeLikePattern(normalizedQuery);

  const { data, error } = await supabase
    .from('catalog_brands')
    .select('id, name, logo_url, website_url, name_normalized')
    .ilike('name_normalized', `%${escapedQuery}%`)
    .limit(limit);

  if (error) throw error;

  return (data || []).map((brand) => {
    // Calculate simple similarity score based on match position
    const normalized = brand.name_normalized || brand.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const similarity =
      matchIndex === 0
        ? 0.9 + 0.1 * (normalizedQuery.length / normalized.length)
        : matchIndex > 0
          ? 0.5 + 0.3 * (normalizedQuery.length / normalized.length)
          : 0.3;

    return {
      id: brand.id,
      name: brand.name,
      logoUrl: brand.logo_url,
      websiteUrl: brand.website_url,
      similarity: Math.round(similarity * 100) / 100,
      source: 'catalog' as const,
    };
  }).sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// PRODUCT SEARCH - FUZZY
// ============================================================================

/**
 * Maximum number of products to fetch from database before client-side scoring.
 * Prevents excessive memory usage while ensuring sufficient candidates for ranking.
 */
const MAX_FETCH_LIMIT = 100;

/**
 * Multiplier for initial database fetch to ensure enough candidates after scoring.
 * Higher values improve result quality but increase memory usage.
 */
const FETCH_LIMIT_MULTIPLIER = 5;

/**
 * Performs fuzzy search on product names AND brand names
 * Searches both product.name and catalog_brands.name fields for better matches.
 *
 * Example: Query "MSR Hubba Hubba" will match products where:
 * - Product name contains "Hubba Hubba" AND brand name is "MSR"
 * - Product name contains "MSR Hubba Hubba"
 * - Brand name contains "MSR"
 *
 * Note: Category hierarchy (categoryMain, subcategory) is derived from the
 * categories table via product_type_id. This function returns null for those
 * fields - use the /api/catalog/products/search endpoint for full hierarchy.
 *
 * @param supabase - Supabase client instance
 * @param query - Search query string
 * @param options - Search options (brandId, limit)
 * @returns Array of product search results with scores
 */
export async function fuzzyProductSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brandId?: string; limit?: number } = {}
): Promise<ProductSearchResult[]> {
  const { brandId, limit = 5 } = options;
  const normalizedQuery = query.toLowerCase().trim();

  // Handle empty query edge case
  if (!normalizedQuery) {
    return [];
  }

  // Split query into words for multi-word matching
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);

  // Handle empty queryWords edge case (shouldn't happen after trim check, but be defensive)
  if (queryWords.length === 0) {
    return [];
  }

  // Fetch more results than needed (will filter and score in JS)
  // Use multiplier to ensure we have enough matches after scoring
  const fetchLimit = Math.min(limit * FETCH_LIMIT_MULTIPLIER, MAX_FETCH_LIMIT);

  // Extract first word for initial filtering (to avoid fetching all products)
  const firstWord = escapeLikePattern(queryWords[0]);

  // Build query - fetch products where name or description contains at least the first search word
  // This narrows down the dataset before JS filtering
  // Note: We can't filter on joined table columns (catalog_brands.name) in the .or() clause,
  // so brand matching is handled in the JS scoring phase
  let queryBuilder = supabase
    .from('catalog_products')
    .select(
      `
      id,
      name,
      product_type,
      product_type_id,
      description,
      price_usd,
      weight_grams,
      brand_id,
      catalog_brands!catalog_products_brand_id_fkey (
        id,
        name
      )
    `
    )
    .or(`name.ilike.%${firstWord}%,description.ilike.%${firstWord}%`)
    .limit(fetchLimit);

  if (brandId) {
    queryBuilder = queryBuilder.eq('brand_id', brandId);
  }

  const { data, error } = await queryBuilder;

  if (error) throw error;

  // Filter and score products
  const scoredProducts = (data || [])
    .map((product) => {
      // Defensive null checks for product name and brand
      const productName = (product.name ?? '').toLowerCase();
      const brandName = (product.catalog_brands?.name ?? '').toLowerCase();
      const combinedText = `${brandName} ${productName}`.trim();

      // Evaluate all scoring strategies and select the highest score
      const potentialScores: number[] = [];

      // Strategy 1: Check if full query matches combined brand + name (0.85-1.0)
      let strategy1Matched = false;
      if (combinedText.includes(normalizedQuery)) {
        const matchIndex = combinedText.indexOf(normalizedQuery);
        const currentScore = matchIndex === 0
          ? 0.95 + 0.05 * (normalizedQuery.length / combinedText.length)
          : 0.85 + 0.1 * (normalizedQuery.length / combinedText.length);
        potentialScores.push(currentScore);
        strategy1Matched = true;
      }

      // Strategy 2: Check if all query words appear in combined text (0.75-0.85)
      // Skip if Strategy 1 already matched (optimization - Strategy 1 implies Strategy 2)
      if (!strategy1Matched && queryWords.length > 1 && queryWords.every(word => combinedText.includes(word))) {
        const currentScore = 0.75 + 0.1 * (normalizedQuery.length / combinedText.length);
        potentialScores.push(currentScore);
      }

      // Strategy 3: Check product name only (0.5-0.8)
      if (productName.includes(normalizedQuery)) {
        const matchIndex = productName.indexOf(normalizedQuery);
        const currentScore = matchIndex === 0
          ? 0.7 + 0.1 * (normalizedQuery.length / productName.length)
          : 0.5 + 0.15 * (normalizedQuery.length / productName.length);
        potentialScores.push(currentScore);
      }

      // Strategy 4: Check brand name only (0.4-0.7)
      if (brandName.includes(normalizedQuery)) {
        const matchIndex = brandName.indexOf(normalizedQuery);
        const currentScore = matchIndex === 0
          ? 0.6 + 0.1 * (normalizedQuery.length / brandName.length)
          : 0.4 + 0.15 * (normalizedQuery.length / brandName.length);
        potentialScores.push(currentScore);
      }

      // Strategy 5: Check if any query word matches (0.1-0.3)
      // Require at least 50% of words to match to avoid too many irrelevant results
      if (queryWords.some(word => combinedText.includes(word))) {
        const matchingWords = queryWords.filter(word => combinedText.includes(word));
        const matchRatio = matchingWords.length / queryWords.length;

        // Only score if at least 50% of query words are present
        if (matchRatio >= 0.5) {
          const currentScore = 0.3 * matchRatio;
          potentialScores.push(currentScore);
        }
      }

      // Select the highest score from all strategies
      const score = potentialScores.length > 0 ? Math.max(...potentialScores) : 0;
      const hasMatch = potentialScores.length > 0;

      return {
        id: product.id,
        name: product.name,
        brand: product.catalog_brands
          ? { id: product.catalog_brands.id, name: product.catalog_brands.name }
          : null,
        categoryMain: null, // Derived from categories table - use API for full hierarchy
        subcategory: null,  // Derived from categories table - use API for full hierarchy
        productType: product.product_type,
        productTypeId: product.product_type_id,
        description: product.description,
        priceUsd: product.price_usd,
        weightGrams: product.weight_grams,
        score: Math.round(score * 100) / 100,
        hasMatch,
      };
    })
    .filter(product => product.hasMatch)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ hasMatch: _hasMatch, ...product }) => product); // Remove hasMatch flag

  return scoredProducts;
}

// ============================================================================
// BRAND LOOKUP
// ============================================================================

/**
 * Looks up a brand by its external_id
 * @param supabase - Supabase client instance
 * @param externalId - External ID from source system
 * @returns Brand ID if found, null otherwise
 */
export async function getBrandIdByExternalId(
  supabase: ReturnType<typeof createClient<Database>>,
  externalId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('catalog_brands')
    .select('id')
    .eq('external_id', externalId)
    .single();

  if (error || !data) return null;
  return data.id;
}

// ============================================================================
// UPSERT OPERATIONS
// ============================================================================

/**
 * Upserts a brand record
 * @param supabase - Supabase client instance (with service role)
 * @param brand - Brand data to upsert
 * @returns Upserted brand ID
 */
export async function upsertBrand(
  supabase: ReturnType<typeof createClient<Database>>,
  brand: { external_id: string; name: string; logo_url?: string | null; website_url?: string | null }
): Promise<string> {
  const { data, error } = await supabase
    .from('catalog_brands')
    .upsert(
      {
        external_id: brand.external_id,
        name: brand.name,
        logo_url: brand.logo_url ?? null,
        website_url: brand.website_url ?? null,
      },
      { onConflict: 'external_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}

/**
 * Upserts a product record
 * Note: category_main and subcategory are no longer stored - use product_type_id instead
 *
 * @param supabase - Supabase client instance (with service role)
 * @param product - Product data to upsert
 * @returns Upserted product ID
 */
export async function upsertProduct(
  supabase: ReturnType<typeof createClient<Database>>,
  product: {
    external_id: string;
    name: string;
    brand_id?: string | null;
    brand_external_id?: string | null;
    product_type?: string | null;
    product_type_id?: string | null;
    description?: string | null;
    price_usd?: number | null;
    weight_grams?: number | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('catalog_products')
    .upsert(
      {
        external_id: product.external_id,
        name: product.name,
        brand_id: product.brand_id ?? null,
        brand_external_id: product.brand_external_id ?? null,
        product_type: product.product_type ?? null,
        product_type_id: product.product_type_id ?? null,
        description: product.description ?? null,
        price_usd: product.price_usd ?? null,
        weight_grams: product.weight_grams ?? null,
      },
      { onConflict: 'external_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
