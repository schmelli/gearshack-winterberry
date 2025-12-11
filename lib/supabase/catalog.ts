/**
 * Catalog query utilities for fuzzy and semantic search
 * Feature: 042-catalog-sync-api
 *
 * MVP: Uses ILIKE for fuzzy search. Semantic/hybrid search RPCs
 * will be implemented in a future iteration.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import type { BrandSearchResult, ItemSearchResult } from '@/types/catalog';

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
// ITEM SEARCH - FUZZY
// ============================================================================

/**
 * Performs fuzzy search on item names using ILIKE
 * Trigram index (GIN) improves performance for this query
 * @param supabase - Supabase client instance
 * @param query - Search query string
 * @param options - Search options (brandId, category, limit)
 * @returns Array of item search results with scores
 */
export async function fuzzyItemSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  options: { brandId?: string; category?: string; limit?: number } = {}
): Promise<ItemSearchResult[]> {
  const { brandId, category, limit = 5 } = options;
  const normalizedQuery = query.toLowerCase().trim();

  // Build query with optional filters
  let queryBuilder = supabase
    .from('catalog_items')
    .select(
      `
      id,
      name,
      name_normalized,
      category,
      description,
      specs_summary,
      brand_id,
      catalog_brands!catalog_items_brand_id_fkey (
        id,
        name
      )
    `
    )
    .ilike('name_normalized', `%${normalizedQuery}%`)
    .limit(limit);

  if (brandId) {
    queryBuilder = queryBuilder.eq('brand_id', brandId);
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  const { data, error } = await queryBuilder;

  if (error) throw error;

  return (data || []).map((item) => {
    // Calculate simple similarity score
    const normalized = item.name_normalized || item.name.toLowerCase();
    const matchIndex = normalized.indexOf(normalizedQuery);
    const score =
      matchIndex === 0
        ? 0.9 + 0.1 * (normalizedQuery.length / normalized.length)
        : matchIndex > 0
          ? 0.5 + 0.3 * (normalizedQuery.length / normalized.length)
          : 0.3;

    return {
      id: item.id,
      name: item.name,
      brand: item.catalog_brands
        ? { id: item.catalog_brands.id, name: item.catalog_brands.name }
        : null,
      category: item.category,
      description: item.description,
      specsSummary: item.specs_summary,
      score: Math.round(score * 100) / 100,
    };
  }).sort((a, b) => b.score - a.score);
}

// ============================================================================
// ITEM SEARCH - SEMANTIC (MVP PLACEHOLDER)
// ============================================================================

/**
 * Placeholder for semantic search - returns empty results
 * Will be implemented when search_items_semantic RPC is created
 * @param _supabase - Supabase client instance (unused)
 * @param _embedding - Query embedding vector (unused)
 * @param _options - Search options (unused)
 * @returns Empty array for MVP
 */
export async function semanticItemSearch(
  _supabase: ReturnType<typeof createClient<Database>>,
  _embedding: number[],
  _options: { brandId?: string; category?: string; limit?: number } = {}
): Promise<ItemSearchResult[]> {
  console.warn('Semantic search not yet implemented');
  return [];
}

// ============================================================================
// ITEM SEARCH - HYBRID (MVP PLACEHOLDER)
// ============================================================================

/**
 * Placeholder for hybrid search - falls back to fuzzy search
 * Will be implemented when search_items_hybrid RPC is created
 * @param supabase - Supabase client instance
 * @param query - Text search query
 * @param _embedding - Query embedding vector (unused)
 * @param options - Search options
 * @returns Fuzzy search results for MVP
 */
export async function hybridItemSearch(
  supabase: ReturnType<typeof createClient<Database>>,
  query: string,
  _embedding: number[],
  options: { weightText?: number; brandId?: string; category?: string; limit?: number } = {}
): Promise<ItemSearchResult[]> {
  console.warn('Hybrid search not yet implemented, falling back to fuzzy');
  return fuzzyItemSearch(supabase, query, {
    brandId: options.brandId,
    category: options.category,
    limit: options.limit,
  });
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
 * Upserts an item record
 * @param supabase - Supabase client instance (with service role)
 * @param item - Item data to upsert
 * @returns Upserted item ID
 */
export async function upsertItem(
  supabase: ReturnType<typeof createClient<Database>>,
  item: {
    external_id: string;
    name: string;
    brand_id?: string | null;
    category?: string | null;
    description?: string | null;
    specs_summary?: string | null;
    embedding?: number[] | null;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from('catalog_items')
    .upsert(
      {
        external_id: item.external_id,
        name: item.name,
        brand_id: item.brand_id ?? null,
        category: item.category ?? null,
        description: item.description ?? null,
        specs_summary: item.specs_summary ?? null,
        embedding: item.embedding ?? null,
      },
      { onConflict: 'external_id' }
    )
    .select('id')
    .single();

  if (error) throw error;
  return data.id;
}
