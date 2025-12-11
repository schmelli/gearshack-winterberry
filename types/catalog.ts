/**
 * Catalog types for Global Gear Catalog & Sync API
 * Feature: 042-catalog-sync-api
 */

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
 * Canonical product data from catalog_items table
 */
export interface CatalogItem {
  id: string;
  externalId: string;
  brandId: string | null;
  name: string;
  nameNormalized: string;
  category: string | null;
  description: string | null;
  specsSummary: string | null;
  embedding: number[] | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

/**
 * Brand search result with similarity score
 */
export interface BrandSearchResult {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  similarity: number;
}

/**
 * Item search result with score and brand info
 */
export interface ItemSearchResult {
  id: string;
  name: string;
  brand: {
    id: string;
    name: string;
  } | null;
  category: string | null;
  description: string | null;
  specsSummary: string | null;
  score: number;
}

/**
 * Brand search API response
 */
export interface BrandSearchResponse {
  results: BrandSearchResult[];
  query: string;
  count: number;
}

/**
 * Item search API response
 */
export interface ItemSearchResponse {
  results: ItemSearchResult[];
  query: string;
  mode: 'fuzzy' | 'semantic' | 'hybrid';
  count: number;
}

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
 * Item payload for sync API
 */
export interface ItemSyncPayload {
  external_id: string;
  name: string;
  brand_external_id?: string | null;
  category?: string | null;
  description?: string | null;
  specs_summary?: string | null;
  embedding?: number[] | null;
}

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
 */
export interface BrandSuggestion {
  id: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  similarity: number;
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
 * Search mode for catalog items
 */
export type CatalogSearchMode = 'fuzzy' | 'semantic' | 'hybrid';

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
  results: ItemSearchResult[];
  isLoading: boolean;
  error: string | null;
  search: (query: string, embedding?: number[]) => void;
  clear: () => void;
}
