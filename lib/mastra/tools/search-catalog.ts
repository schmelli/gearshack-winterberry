/**
 * Search Catalog Tool - Mastra Format
 * Feature 001: Mastra Agentic Voice AI
 * Task T017: Migrate searchCatalog tool to Mastra format
 *
 * Migrated from: lib/ai-assistant/tools/search-catalog.ts
 * Preserves all existing business logic - only adapted to Mastra tool format.
 *
 * Allows AI to search the GearGraph product catalog with flexible filters.
 * Provides powerful search capabilities across the entire outdoor gear catalog.
 *
 * Data Source: Supabase catalog_products table (synced from GearGraph API)
 * Category hierarchy is derived from the categories table via product_type_id FK.
 */

import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Input Schema (Zod)
// =============================================================================

const searchCatalogInputSchema = z.object({
  query: z
    .string()
    .min(2)
    .max(200)
    .optional()
    .describe('Search query for product name or description (optional if using filters)'),

  filters: z
    .object({
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

// =============================================================================
// Output Schema (Zod)
// =============================================================================

const catalogSearchResultSchema = z.object({
  id: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  categoryMain: z.string().nullable(),
  subcategory: z.string().nullable(),
  productType: z.string().nullable(),
  productTypeId: z.string().nullable(),
  description: z.string().nullable(),
  priceUsd: z.number().nullable(),
  weightGrams: z.number().nullable(),
});

const searchCatalogOutputSchema = z.object({
  success: z.boolean(),
  results: z.array(catalogSearchResultSchema),
  totalCount: z.number(),
  query: z.string(),
  appliedFilters: z.record(z.string(), z.unknown()),
  error: z.string().optional(),
});

// =============================================================================
// Type Exports
// =============================================================================

export type SearchCatalogInput = z.infer<typeof searchCatalogInputSchema>;
export type CatalogSearchResult = z.infer<typeof catalogSearchResultSchema>;
export type SearchCatalogOutput = z.infer<typeof searchCatalogOutputSchema>;

// Type for category with parent chain
interface CategoryWithParent {
  id: string;
  label: string;
  slug: string;
  level: number;
  parent_id: string | null;
}

// =============================================================================
// Mastra Tool Definition
// =============================================================================

export const searchCatalogTool = createTool({
  id: 'searchCatalog',

  description: `Search the GearGraph product catalog with flexible filters.

Use this to find outdoor gear products from major brands like Osprey, MSR,
Big Agnes, Sea to Summit, Zpacks, REI, Patagonia, Arc'teryx, and many more.

The catalog contains:
- Product names and descriptions
- Categories (derived from product type hierarchy)
- Brands and manufacturers
- Prices (USD)
- Weights (grams)
- Specifications and features

Examples:
- Find ultralight tents: {query: "tent", filters: {weightMax: 1000}}
- Search by brand: {filters: {brand: "Osprey"}, sortBy: "weight_asc"}
- Specific product: {query: "Atmos AG 65"}
- Lightest sleeping bags: {query: "sleeping bag", sortBy: "weight_asc", limit: 5}
- Compare options: {query: "down jacket", sortBy: "price_asc", limit: 10}`,

  inputSchema: searchCatalogInputSchema,
  outputSchema: searchCatalogOutputSchema,

  execute: async (input): Promise<SearchCatalogOutput> => {
    const startTime = Date.now();
    const { query, filters, sortBy, limit } = input;

    try {
      const supabase = await createClient();

      // Build base query - uses product_type_id FK to categories table
      let dbQuery = supabase.from('catalog_products').select(
        `
        id,
        name,
        product_type,
        product_type_id,
        description,
        price_usd,
        weight_grams,
        catalog_brands!catalog_products_brand_id_fkey (
          id,
          name
        )
      `
      );

      // Track applied filters
      const appliedFilters: Record<string, unknown> = {};

      // SMART WEIGHT FILTERING:
      // - For weight-sorted queries (lightest/heaviest): Filter out 0g (invalid data)
      // - For other queries (comparison, price, name): Include all products, flag invalid weights
      // This ensures "compare X vs Y" finds products even with missing weight data.
      const isWeightSortedQuery = sortBy === 'weight_asc' || sortBy === 'weight_desc';
      if (isWeightSortedQuery) {
        // For weight queries: filter invalid weights (0g = missing data for outdoor gear)
        dbQuery = dbQuery.or('weight_grams.is.null,weight_grams.gt.0');
        appliedFilters.invalidWeightsFiltered = true;
      }

      // Apply text search (only if query provided)
      // Escape ILIKE wildcards and PostgREST special characters to prevent injection
      if (query) {
        const sanitizedQuery = query
          .replace(/\\/g, '\\\\')  // Escape backslashes first
          .replace(/%/g, '\\%')    // Escape % wildcards
          .replace(/_/g, '\\_')    // Escape _ wildcards
          .replace(/,/g, '');      // Remove commas (PostgREST .or() delimiter)
        dbQuery = dbQuery.or(`name.ilike.%${sanitizedQuery}%,description.ilike.%${sanitizedQuery}%`);
        appliedFilters.query = query;
      }

      // Apply filters
      if (filters) {
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
      // NOTE: For weight-sorted queries, invalid weights (0g) were filtered above.
      // For weight-based sorting, we also exclude NULL weights to get meaningful results.
      switch (sortBy) {
        case 'weight_asc':
          // For "lightest" queries: exclude NULL weights to get actual weight data
          dbQuery = dbQuery.not('weight_grams', 'is', null);
          dbQuery = dbQuery.order('weight_grams', { ascending: true, nullsFirst: false });
          break;
        case 'weight_desc':
          // For "heaviest" queries: exclude NULL weights to get actual weight data
          dbQuery = dbQuery.not('weight_grams', 'is', null);
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
      dbQuery = dbQuery.limit(limit ?? 10);

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
          query: query ?? '',
          appliedFilters,
          error: `Database query failed: ${error.message}`,
        };
      }

      if (!products || products.length === 0) {
        return {
          success: true,
          results: [],
          totalCount: 0,
          query: query ?? '',
          appliedFilters,
        };
      }

      // Collect all product_type_ids to fetch category hierarchy in batch
      const productTypeIds = (products ?? [])
        .map((p) => p.product_type_id)
        .filter((id): id is string => id !== null);

      // Fetch category hierarchy for all product types in one query
      const categoryMap = new Map<
        string,
        { categoryMain: string | null; subcategory: string | null; productType: string | null }
      >();

      if (productTypeIds.length > 0) {
        // Get all categories to build the hierarchy
        const { data: allCategories } = await supabase
          .from('categories')
          .select('id, label, slug, level, parent_id')
          .order('level');

        if (allCategories) {
          // Build a lookup map by ID
          const catById = new Map<string, CategoryWithParent>();
          for (const cat of allCategories) {
            catById.set(cat.id, cat);
          }

          // For each product_type_id, walk up the tree to find subcategory and main category
          for (const ptId of productTypeIds) {
            const productTypeCat = catById.get(ptId);
            if (!productTypeCat) continue;

            let categoryMain: string | null = null;
            let subcategory: string | null = null;
            const productType = productTypeCat.label;

            // Walk up the parent chain
            if (productTypeCat.parent_id) {
              const subcategoryCat = catById.get(productTypeCat.parent_id);
              if (subcategoryCat) {
                subcategory = subcategoryCat.label;
                if (subcategoryCat.parent_id) {
                  const mainCat = catById.get(subcategoryCat.parent_id);
                  if (mainCat) {
                    categoryMain = mainCat.label;
                  }
                }
              }
            }

            categoryMap.set(ptId, { categoryMain, subcategory, productType });
          }
        }
      }

      // Transform results
      let results: CatalogSearchResult[] = (products ?? []).map((product) => {
        // Get category hierarchy from the map, or fallback to product_type TEXT field
        const categoryInfo = product.product_type_id
          ? categoryMap.get(product.product_type_id)
          : null;

        return {
          id: product.id,
          name: product.name,
          brand: (product.catalog_brands as { name: string } | null)?.name ?? null,
          categoryMain: categoryInfo?.categoryMain ?? null,
          subcategory: categoryInfo?.subcategory ?? null,
          productType: categoryInfo?.productType ?? product.product_type,
          productTypeId: product.product_type_id,
          description: product.description,
          priceUsd: product.price_usd,
          weightGrams: product.weight_grams,
        };
      });

      // Apply brand filter (post-query, case-insensitive)
      if (filters?.brand) {
        const brandLower = filters.brand.toLowerCase();
        results = results.filter((p) => p.brand && p.brand.toLowerCase().includes(brandLower));
        appliedFilters.brand = filters.brand;
      }

      // Post-processing weight validation:
      // - For weight-sorted queries: filter out 0g (defense-in-depth)
      // - For other queries: flag but KEEP products with 0g (for comparison queries)
      const productsWithInvalidWeight = results.filter((p) => p.weightGrams === 0);
      const invalidWeightCount = productsWithInvalidWeight.length;

      if (isWeightSortedQuery && invalidWeightCount > 0) {
        // For weight queries, remove invalid weights (0g = garbage data)
        results = results.filter((p) => p.weightGrams === null || p.weightGrams > 0);
        console.warn(`[searchCatalog] Filtered ${invalidWeightCount} products with invalid weight (0g) for weight-sorted query`);
        appliedFilters.invalidWeightsRemoved = invalidWeightCount;
      } else if (invalidWeightCount > 0) {
        // For non-weight queries, flag but keep products (for comparisons)
        console.info(`[searchCatalog] Found ${invalidWeightCount} products with missing weight data (0g) - keeping for comparison`);
        appliedFilters.productsWithMissingWeight = invalidWeightCount;
      }

      const executionTime = Date.now() - startTime;
      console.log(`[searchCatalog] Found ${results.length} products in ${executionTime}ms`);

      return {
        success: true,
        results,
        totalCount: results.length,
        query: query ?? '',
        appliedFilters,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`[searchCatalog] Unexpected error after ${executionTime}ms:`, error);
      return {
        success: false,
        results: [],
        totalCount: 0,
        query: query ?? '',
        appliedFilters: {},
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// =============================================================================
// Re-export for backwards compatibility with existing tool consumers
// =============================================================================

export const searchCatalogParametersSchema = searchCatalogInputSchema;
export type SearchCatalogParameters = SearchCatalogInput;
export type SearchCatalogResponse = SearchCatalogOutput;
