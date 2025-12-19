/**
 * Search Catalog Tool
 * Feature 050: AI Assistant - Flexible Catalog Search
 *
 * Allows AI to search the GearGraph product catalog with flexible filters.
 * Provides powerful search capabilities across the entire outdoor gear catalog.
 *
 * Data Source: Supabase catalog_products table (synced from GearGraph API)
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const searchCatalogParametersSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(200)
    .optional()
    .describe('Search query for product name or description (optional if using filters)'),

  filters: z
    .object({
      category: z.string().optional().describe('Main category (e.g., "Backpacks", "Tents", "Sleeping Bags")'),
      subcategory: z.string().optional().describe('Subcategory for more specific filtering'),
      brand: z.string().optional().describe('Brand name (case-insensitive, partial match)'),
      productType: z.string().optional().describe('Specific product type'),
      weightMin: z.number().nonnegative().optional().describe('Minimum weight in grams'),
      weightMax: z.number().positive().optional().describe('Maximum weight in grams'),
      priceMin: z.number().nonnegative().optional().describe('Minimum price in USD'),
      priceMax: z.number().positive().optional().describe('Maximum price in USD'),
    })
    .optional()
    .describe('Optional filters to narrow search results'),

  sortBy: z
    .enum(['relevance', 'weight_asc', 'weight_desc', 'price_asc', 'price_desc', 'name'])
    .default('relevance')
    .describe('Sort order for results'),

  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10)
    .describe('Maximum number of results to return (max 50)'),
});

export type SearchCatalogParameters = z.infer<typeof searchCatalogParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const searchCatalogTool = {
  description: `Search the GearGraph product catalog with flexible filters.

  Use this to find outdoor gear products from major brands like Osprey, MSR,
  Big Agnes, Sea to Summit, Zpacks, REI, Patagonia, Arc'teryx, and many more.

  The catalog contains:
  - Product names and descriptions
  - Categories (Backpacks, Tents, Sleeping Bags, Cooking, Clothing, etc.)
  - Brands and manufacturers
  - Prices (USD)
  - Weights (grams)
  - Specifications and features

  Examples:
  - Find ultralight tents: {query: "tent", filters: {weightMax: 1000}}
  - Search by brand: {filters: {brand: "Osprey"}, sortBy: "weight_asc"}
  - Budget backpacks: {filters: {category: "Backpacks", priceMax: 200}}
  - Specific product: {query: "Atmos AG 65"}
  - Lightest sleeping bags: {filters: {category: "Sleeping Bags"}, sortBy: "weight_asc", limit: 5}
  - Compare options: {query: "down jacket", sortBy: "price_asc", limit: 10}
  `,
  parameters: searchCatalogParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface CatalogSearchResult {
  id: string;
  name: string;
  brand: string | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  description: string | null;
  priceUsd: number | null;
  weightGrams: number | null;
  imageUrl: string | null;
}

export interface SearchCatalogResponse {
  success: boolean;
  results: CatalogSearchResult[];
  totalCount: number;
  query: string;
  appliedFilters: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute catalog search with flexible filters
 *
 * @param params - Search parameters including query, filters, sortBy, limit
 * @returns SearchCatalogResponse with matching products
 */
export async function executeSearchCatalog(
  params: SearchCatalogParameters
): Promise<SearchCatalogResponse> {
  const startTime = Date.now();
  const { query, filters, sortBy, limit } = params;

  try {
    const supabase = await createClient();

    // Build base query
    let dbQuery = supabase
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
        image_url,
        source_url,
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name
        )
      `
      );

    // Track applied filters
    const appliedFilters: Record<string, unknown> = {};

    // Apply text search (only if query provided)
    if (query) {
      dbQuery = dbQuery.or(`name.ilike.%${query}%,description.ilike.%${query}%`);
      appliedFilters.query = query;
    }

    // Apply filters
    if (filters) {
      if (filters.category) {
        dbQuery = dbQuery.ilike('category_main', filters.category);
        appliedFilters.category = filters.category;
      }
      if (filters.subcategory) {
        dbQuery = dbQuery.ilike('subcategory', filters.subcategory);
        appliedFilters.subcategory = filters.subcategory;
      }
      if (filters.productType) {
        dbQuery = dbQuery.ilike('product_type', filters.productType);
        appliedFilters.productType = filters.productType;
      }
      if (filters.weightMin !== undefined) {
        dbQuery = dbQuery.gte('weight_grams', filters.weightMin);
        appliedFilters.weightMin = filters.weightMin;
      }
      if (filters.weightMax !== undefined) {
        dbQuery = dbQuery.lte('weight_grams', filters.weightMax);
        appliedFilters.weightMax = filters.weightMax;
      }
      if (filters.priceMin !== undefined) {
        dbQuery = dbQuery.gte('price_usd', filters.priceMin);
        appliedFilters.priceMin = filters.priceMin;
      }
      if (filters.priceMax !== undefined) {
        dbQuery = dbQuery.lte('price_usd', filters.priceMax);
        appliedFilters.priceMax = filters.priceMax;
      }
      // Brand filter applied post-query (since it's in joined table)
    }

    // Apply sorting
    switch (sortBy) {
      case 'weight_asc':
        dbQuery = dbQuery.order('weight_grams', { ascending: true, nullsFirst: false });
        break;
      case 'weight_desc':
        dbQuery = dbQuery.order('weight_grams', { ascending: false, nullsFirst: false });
        break;
      case 'price_asc':
        dbQuery = dbQuery.order('price_usd', { ascending: true, nullsFirst: false });
        break;
      case 'price_desc':
        dbQuery = dbQuery.order('price_usd', { ascending: false, nullsFirst: false });
        break;
      case 'name':
        dbQuery = dbQuery.order('name', { ascending: true });
        break;
      case 'relevance':
      default:
        // For relevance, order by name (exact matches appear first due to ILIKE)
        dbQuery = dbQuery.order('name', { ascending: true });
        break;
    }

    // Apply limit
    dbQuery = dbQuery.limit(limit || 10);

    // Execute query with timeout
    const { data: products, error } = await Promise.race([
      dbQuery,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout (5s)')), 5000)
      ),
    ]);

    if (error) {
      console.error('[searchCatalog] Database error:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        query: query || '',
        appliedFilters,
        error: `Database query failed: ${error.message}`,
      };
    }

    if (!products || products.length === 0) {
      return {
        success: true,
        results: [],
        totalCount: 0,
        query: query || '',
        appliedFilters,
      };
    }

    // Transform results
    let results: CatalogSearchResult[] = (products || []).map((product) => ({
      id: product.id,
      name: product.name,
      brand: (product.catalog_brands as { name: string } | null)?.name ?? null,
      categoryMain: product.category_main,
      subcategory: product.subcategory,
      productType: product.product_type,
      description: product.description,
      priceUsd: product.price_usd,
      weightGrams: product.weight_grams,
      imageUrl: product.image_url,
    }));

    // Apply brand filter (post-query, case-insensitive)
    if (filters?.brand) {
      const brandLower = filters.brand.toLowerCase();
      results = results.filter(
        (p) => p.brand && p.brand.toLowerCase().includes(brandLower)
      );
      appliedFilters.brand = filters.brand;
    }

    const executionTime = Date.now() - startTime;
    console.log(`[searchCatalog] Found ${results.length} products in ${executionTime}ms`);

    return {
      success: true,
      results,
      totalCount: results.length,
      query: query || '',
      appliedFilters,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('[searchCatalog] Unexpected error:', error);
    return {
      success: false,
      results: [],
      totalCount: 0,
      query: query || '',
      appliedFilters: {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
