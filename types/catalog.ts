/**
 * Catalog types for Global Gear Catalog & Sync API
 * Feature: 042-catalog-sync-api
 *
 * Note: Uses catalog_products table schema (not catalog_items)
 */

// ============================================================================
// SEARCH ENRICHMENT TYPES (ReAG Pattern)
// ============================================================================

/**
 * LLM-generated semantic metadata for improved search discoverability.
 * Stored as JSONB in catalog_products.search_enrichment column.
 * Generated asynchronously via scripts/enrich-catalog-items.ts.
 *
 * The type is derived from the Zod `EnrichmentSchema` in `lib/enrichment-schema.ts`
 * so the runtime validation schema and this compile-time type always stay in sync.
 * To add or rename enrichment fields, edit `lib/enrichment-schema.ts` — this file
 * will reflect the change automatically via `z.infer`.
 *
 * @see lib/enrichment-schema.ts — canonical schema definition (Zod + derived type)
 * @see supabase/migrations/20260226000001_catalog_search_enrichment.sql
 */
import type { SearchEnrichment } from '@/lib/enrichment-schema';
export type { SearchEnrichment };

// ============================================================================
// DATABASE ENTITY TYPES
// ============================================================================

/**
 * Canonical brand/manufacturer data from catalog_brands table
 */
export interface CatalogBrand {
  id: string;
  externalId: string;
  name: string;
  nameNormalized: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Canonical product data from catalog_products table
 * Note: categoryMain and subcategory are derived from categories table via product_type_id
 */
export interface CatalogProduct {
  id: string;
  externalId: string;
  brandId: string | null;
  brandExternalId: string | null;
  name: string;
  productType: string | null;
  productTypeId: string | null;
  description: string | null;
  priceUsd: number | null;
  weightGrams: number | null;
  searchEnrichment: SearchEnrichment | null;
  enrichedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// Legacy alias
export type CatalogItem = CatalogProduct;

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Brand search result with similarity score
 * Issue #87: Added source field to distinguish catalog vs user inventory brands
 */
export interface BrandSearchResult {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  similarity: number;
  source: 'catalog' | 'inventory';
}

/**
 * Product search result with score and brand info
 * Note: categoryMain and subcategory are derived from categories table via productTypeId
 */
export interface ProductSearchResult {
  id: string;
  name: string;
  brand: {
    id: string;
    name: string;
  } | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  productTypeId: string | null;
  description: string | null;
  priceUsd: number | null;
  weightGrams: number | null;
  score: number;
}

// Legacy alias
export type ItemSearchResult = ProductSearchResult;

/**
 * Brand search API response
 */
export interface BrandSearchResponse {
  results: BrandSearchResult[];
  query: string;
  count: number;
}

/**
 * Product search API response
 */
export interface ProductSearchResponse {
  results: ProductSearchResult[];
  query: string;
  mode: 'fuzzy';
  count: number;
}

// Legacy alias
export type ItemSearchResponse = ProductSearchResponse;

// ============================================================================
// SYNC API TYPES
// ============================================================================

/**
 * Brand payload for sync API
 */
export interface BrandSyncPayload {
  external_id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
}

/**
 * Product payload for sync API
 * Note: category_main and subcategory are no longer stored - use product_type_id instead
 */
export interface ProductSyncPayload {
  external_id: string;
  name: string;
  brand_external_id?: string | null;
  product_type?: string | null;
  product_type_id?: string | null;
  description?: string | null;
  price_usd?: number | null;
  weight_grams?: number | null;
}

// Legacy alias
export type ItemSyncPayload = ProductSyncPayload;

/**
 * Sync API success response
 */
export interface SyncSuccessResponse {
  success: true;
  upserted: number;
  ids: string[];
  warnings?: string[];
}

/**
 * Sync API error response
 */
export interface SyncErrorResponse {
  success: false;
  error: string;
  details?: Array<{ field: string; message: string }>;
}

export type SyncResponse = SyncSuccessResponse | SyncErrorResponse;

// ============================================================================
// HOOK TYPES
// ============================================================================

/**
 * Brand suggestion for autocomplete
 * Issue #87: Added source field to distinguish catalog vs user inventory brands
 */
export interface BrandSuggestion {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  similarity: number;
  source: 'catalog' | 'inventory';
}

/**
 * Options for useBrandAutocomplete hook
 */
export interface UseBrandAutocompleteOptions {
  debounceMs?: number;
  minChars?: number;
}

/**
 * Return type for useBrandAutocomplete hook
 */
export interface UseBrandAutocompleteReturn {
  suggestions: BrandSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

/**
 * Search mode for catalog products
 */
export type CatalogSearchMode = 'fuzzy';

/**
 * Options for useCatalogSearch hook
 */
export interface UseCatalogSearchOptions {
  mode?: CatalogSearchMode;
  debounceMs?: number;
  limit?: number;
}

/**
 * Return type for useCatalogSearch hook
 */
export interface UseCatalogSearchReturn {
  results: ProductSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}
