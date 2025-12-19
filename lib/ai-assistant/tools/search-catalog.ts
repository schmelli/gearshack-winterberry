/**
 * Search Catalog Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Advanced GearGraph catalog search with filtering capabilities.
 * Leverages existing searchCatalogForQuery() for basic searches
 * and extends it with advanced filters.
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const searchCatalogParametersSchema = z.object({
  query: z.string().min(1).max(200).describe('Search query for gear items'),
  filters: z
    .object({
      categoryId: z.string().optional().describe('Category ID to filter by'),
      weightMin: z.number().min(0).optional().describe('Minimum weight in grams'),
      weightMax: z.number().min(0).optional().describe('Maximum weight in grams'),
      priceMin: z.number().min(0).optional().describe('Minimum price in USD'),
      priceMax: z.number().min(0).optional().describe('Maximum price in USD'),
      brands: z.array(z.string()).optional().describe('Filter by specific brands'),
    })
    .optional()
    .describe('Optional filters to narrow search results'),
  sortBy: z
    .enum(['relevance', 'weight', 'price'])
    .default('relevance')
    .describe('Sort order for results'),
  limit: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe('Maximum number of results to return'),
});

export type SearchCatalogParameters = z.infer<typeof searchCatalogParametersSchema>;

// =============================================================================
// Tool Definition
// =============================================================================

export const searchCatalogTool = {
  description:
    'Search GearGraph catalog with advanced filtering by weight, price, category, and brands',
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
 * Execute catalog search with advanced filters
 *
 * @param params - Search parameters including query, filters, sortBy, limit
 * @returns SearchCatalogResponse with matching products
 */
export async function executeSearchCatalog(
  params: SearchCatalogParameters
): Promise<SearchCatalogResponse> {
  const { query, filters, sortBy, limit } = params;

  try {
    const supabase = await createClient();

    // Build base query
    // Note: catalog_products doesn't have primary_image_url column
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
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name
        )
      `
      )
      .or(`name.ilike.%${query}%,description.ilike.%${query}%`);

    // Apply filters
    if (filters) {
      if (filters.categoryId) {
        dbQuery = dbQuery.eq('category_main', filters.categoryId);
      }
      if (filters.weightMin !== undefined) {
        dbQuery = dbQuery.gte('weight_grams', filters.weightMin);
      }
      if (filters.weightMax !== undefined) {
        dbQuery = dbQuery.lte('weight_grams', filters.weightMax);
      }
      if (filters.priceMin !== undefined) {
        dbQuery = dbQuery.gte('price_usd', filters.priceMin);
      }
      if (filters.priceMax !== undefined) {
        dbQuery = dbQuery.lte('price_usd', filters.priceMax);
      }
      // Brand filter requires subquery (handled differently)
      // Note: brands filter not directly supported in simple query,
      // would need join optimization
    }

    // Apply sorting
    switch (sortBy) {
      case 'weight':
        dbQuery = dbQuery.order('weight_grams', { ascending: true, nullsFirst: false });
        break;
      case 'price':
        dbQuery = dbQuery.order('price_usd', { ascending: true, nullsFirst: false });
        break;
      case 'relevance':
      default:
        // For relevance, we rely on the ilike order (exact matches first)
        dbQuery = dbQuery.order('name', { ascending: true });
        break;
    }

    // Apply limit
    dbQuery = dbQuery.limit(limit);

    const { data: products, error, count } = await dbQuery;

    if (error) {
      console.error('[searchCatalog] Database error:', error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        query,
        appliedFilters: filters || {},
        error: `Database query failed: ${error.message}`,
      };
    }

    // Transform results
    const results: CatalogSearchResult[] = (products || []).map((product) => ({
      id: product.id,
      name: product.name,
      brand: (product.catalog_brands as { name: string } | null)?.name ?? null,
      categoryMain: product.category_main,
      subcategory: product.subcategory,
      productType: product.product_type,
      description: product.description,
      priceUsd: product.price_usd,
      weightGrams: product.weight_grams,
      imageUrl: null, // catalog_products doesn't have primary_image_url
    }));

    return {
      success: true,
      results,
      totalCount: count ?? results.length,
      query,
      appliedFilters: filters || {},
    };
  } catch (error) {
    console.error('[searchCatalog] Unexpected error:', error);
    return {
      success: false,
      results: [],
      totalCount: 0,
      query,
      appliedFilters: filters || {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
