/**
 * Catalog query utilities for fuzzy search
 * Feature: 042-catalog-sync-api
 *
 * Note: Uses catalog_products table (not catalog_items) per actual database schema
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BrandSearchResult, ProductSearchResult } from '@/types/catalog';

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

  const { data, error } = await supabase
    .from('catalog_brands')
    .select('id, name, logo_url, website_url, name_normalized')
    .ilike('name_normalized', `%${normalizedQuery}%`)
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
    };
  }).sort((a, b) => b.similarity - a.similarity);
}

// ============================================================================
// PRODUCT SEARCH - FUZZY
// ============================================================================

/**
 * Performs fuzzy search on product names using ILIKE
 * @param supabase - Supabase client instance
 * @param query - Search query string
 * @param options - Search options (brandId, categoryMain, limit)
 * @returns Array of product search results with scores
 */
export async function fuzzyProductSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brandId?: string; categoryMain?: string; limit?: number } = {}
): Promise<ProductSearchResult[]> {
  const { brandId, categoryMain, limit = 5 } = options;
  const normalizedQuery = query.toLowerCase().trim();

  // Build query with optional filters
  let queryBuilder = supabase
    .from('catalog_products')
    .select(
      `
      id,
      name,
      category_main,
      subcategory,
      product_type,
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
    .ilike('name', `%${normalizedQuery}%`)
    .limit(limit);

  if (brandId) {
    queryBuilder = queryBuilder.eq('brand_id', brandId);
  }

  if (categoryMain) {
    queryBuilder = queryBuilder.eq('category_main', categoryMain);
  }

  const { data, error } = await queryBuilder;

  if (error) throw error;

  return (data || []).map((product) => {
    // Calculate simple similarity score
    const normalized = product.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const score =
      matchIndex === 0
        ? 0.9 + 0.1 * (normalizedQuery.length / normalized.length)
        : matchIndex > 0
          ? 0.5 + 0.3 * (normalizedQuery.length / normalized.length)
          : 0.3;

    return {
      id: product.id,
      name: product.name,
      brand: product.catalog_brands
        ? { id: product.catalog_brands.id, name: product.catalog_brands.name }
        : null,
      categoryMain: product.category_main,
      subcategory: product.subcategory,
      productType: product.product_type,
      description: product.description,
      priceUsd: product.price_usd,
      weightGrams: product.weight_grams,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
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
    category_main?: string | null;
    subcategory?: string | null;
    product_type?: string | null;
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
        category_main: product.category_main ?? null,
        subcategory: product.subcategory ?? null,
        product_type: product.product_type ?? null,
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
