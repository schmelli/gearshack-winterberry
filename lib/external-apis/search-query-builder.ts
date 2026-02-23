/**
 * Smart Search Query Builder for Price Tracking
 * Feature: 055-price-search-relevance-fix
 * Date: 2026-01-01
 *
 * Constructs intelligent search queries that include product category context
 * to improve relevance and reduce false positives from external price APIs.
 *
 * Problem: Searching "Durston X-Dome 2" returns unrelated items (video games, fossils, etc.)
 * Solution: Multi-stage query strategy with product type context
 */

import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Product category metadata extracted from gear item
 */
export interface ProductCategoryInfo {
  /** Level 3 (most specific) category name, e.g., "Tents" */
  productType: string | null;
  /** Level 2 category name, e.g., "Shelter" */
  categoryMain: string | null;
  /** Level 1 (broadest) category name, e.g., "Sleep System" */
  categoryTop: string | null;
}

/**
 * Search query configuration for multi-stage strategy
 */
export interface SearchQueryConfig {
  itemName: string;
  brandName: string | null;
  categoryInfo: ProductCategoryInfo | null;
}

/**
 * Generated search query with metadata
 */
export interface GeneratedQuery {
  /** The actual query string to send to search API */
  query: string;
  /** Stage number (1-3) for tracking which strategy was used */
  stage: 1 | 2 | 3;
  /** Human-readable description of the query strategy */
  strategy: string;
  /** Product type keywords used for result filtering */
  productTypeKeywords: string[];
}

/**
 * Lookup table mapping product types to search keywords
 * Helps match external API results to expected product categories
 */
const PRODUCT_TYPE_KEYWORDS: Record<string, string[]> = {
  // Sleep System
  'tents': ['tent', 'shelter', 'bivy', 'bivvy'],
  'sleeping bags': ['sleeping bag', 'quilt', 'sleep system', 'down bag', 'synthetic bag'],
  'sleeping pads': ['sleeping pad', 'mat', 'mattress', 'sleep pad', 'inflatable pad'],

  // Packs & Bags
  'backpacks': ['backpack', 'pack', 'rucksack', 'hiking pack', 'trekking pack'],
  'stuff sacks': ['stuff sack', 'dry bag', 'compression sack', 'storage bag'],

  // Clothing
  'jackets': ['jacket', 'coat', 'shell', 'parka', 'anorak'],
  'pants': ['pants', 'trousers', 'hiking pants', 'trekking pants'],
  'base layers': ['base layer', 'thermal', 'long underwear', 'merino'],

  // Footwear
  'hiking boots': ['hiking boots', 'boots', 'trekking boots', 'trail boots'],
  'trail runners': ['trail runners', 'running shoes', 'trail shoes'],

  // Cookware
  'stoves': ['stove', 'backpacking stove', 'camp stove', 'burner'],
  'cookware': ['cookware', 'pot', 'pan', 'cook set', 'cooking system'],

  // Navigation & Safety
  'gps devices': ['gps', 'navigation', 'gps device', 'handheld gps'],
  'headlamps': ['headlamp', 'headlight', 'head torch', 'lamp'],

  // Trekking Poles
  'trekking poles': ['trekking poles', 'hiking poles', 'walking poles', 'poles'],
};

/**
 * Get category information for a gear item from database
 * Uses optimized RPC function to fetch the entire category hierarchy in a single query
 *
 * @param supabase - Supabase client
 * @param productTypeId - Level 3 category ID from gear_items table
 * @returns Category information with all three levels
 */
export async function getProductCategoryInfo(
  supabase: SupabaseClient,
  productTypeId: string | null
): Promise<ProductCategoryInfo | null> {
  if (!productTypeId) {
    return null;
  }

  try {
    // Try optimized RPC function first (eliminates N+1 queries)
    // Type assertion needed: Supabase client's rpc() requires generated types
    // but we're using a generic SupabaseClient from caller
    const { data, error } = await supabase.rpc('get_category_ancestry' as never, {
      p_category_id: productTypeId,
    } as never) as { data: { product_type: string | null; category_main: string | null; category_top: string | null }[] | null; error: { code: string; message: string } | null };

    // Check for backward compatibility errors (missing function during staged deployment)
    if (error) {
      // PostgreSQL error codes:
      // 42P01 = undefined_table
      // 42883 = undefined_function
      if (
        error.code === '42P01' ||
        error.code === '42883' ||
        error.message.includes('does not exist')
      ) {
        console.warn(
          `RPC function get_category_ancestry not available, falling back to legacy queries for category ${productTypeId}`
        );
        return await getProductCategoryInfoLegacy(supabase, productTypeId);
      }
      throw error;
    }

    // RPC returns array, get first result
    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      return null;
    }

    return {
      productType: result.product_type,
      categoryMain: result.category_main,
      categoryTop: result.category_top,
    };
  } catch (error) {
    console.error('Error fetching product category info:', error);
    return null;
  }
}

/**
 * Legacy fallback for getProductCategoryInfo (backward compatibility)
 * Uses sequential queries to traverse category hierarchy
 * Only used when RPC function is not available (e.g., during staged deployment)
 *
 * @param supabase - Supabase client
 * @param productTypeId - Level 3 category ID from gear_items table
 * @returns Category information with all three levels
 */
async function getProductCategoryInfoLegacy(
  supabase: SupabaseClient,
  productTypeId: string
): Promise<ProductCategoryInfo | null> {
  try {
    // Fetch the category and its parents in one query
    // Type assertion: Using generic SupabaseClient without generated database types
    interface CategoryRow {
      id: string;
      label: string;
      level: number;
      parent_id: string | null;
    }
    const { data, error } = (await supabase
      .from('categories')
      .select('id, label, level, parent_id')
      .eq('id', productTypeId)
      .single()) as { data: CategoryRow | null; error: unknown };

    if (error || !data) {
      console.warn(`Failed to fetch category for ID ${productTypeId}:`, error);
      return null;
    }

    const productType = data.label;
    let categoryMain: string | null = null;
    let categoryTop: string | null = null;

    // If this is level 3, fetch level 2 parent
    if (data.level === 3 && data.parent_id) {
      interface Level2Row {
        label: string;
        parent_id: string | null;
      }
      const { data: level2Data } = (await supabase
        .from('categories')
        .select('label, parent_id')
        .eq('id', data.parent_id)
        .single()) as { data: Level2Row | null };

      if (level2Data) {
        categoryMain = level2Data.label;

        // Fetch level 1 grandparent
        if (level2Data.parent_id) {
          interface Level1Row {
            label: string;
          }
          const { data: level1Data } = (await supabase
            .from('categories')
            .select('label')
            .eq('id', level2Data.parent_id)
            .single()) as { data: Level1Row | null };

          if (level1Data) {
            categoryTop = level1Data.label;
          }
        }
      }
    }

    return {
      productType,
      categoryMain,
      categoryTop,
    };
  } catch (error) {
    console.error('Error fetching product category info (legacy):', error);
    return null;
  }
}

/**
 * Expand a search query with spelling variants for hyphenated model names.
 *
 * Many outdoor gear models use hyphens that sellers omit or alter:
 *   "X-Mid Pro 2"  →  sellers write "Xmid Pro 2" or "Xmid Pro 2p"
 *   "X-Dome 2"     →  sellers write "Xdome 2"
 *
 * eBay's Browse API supports OR syntax with parentheses and commas:
 *   (X-Mid,Xmid) matches both spellings in a single API call.
 *
 * Only expands words that match the pattern Letter-Hyphen-Letter (e.g. X-Mid)
 * to avoid touching legitimate hyphens in phrases like "3-season".
 *
 * @param query - Raw search query, e.g. "Durston X-Mid Pro 2"
 * @returns Query with eBay OR groups for hyphenated variants, e.g. "Durston (X-Mid,Xmid) Pro 2"
 */
export function expandQueryWithSpellingVariants(query: string): string {
  // Match words like "X-Mid", "X-Dome", "X-Pack" (single letter before hyphen)
  // but NOT "3-season", "2-person", etc.
  return query.replace(/\b([A-Za-z])-([A-Za-z]\w*)\b/g, (match, prefix, suffix) => {
    const withoutHyphen = `${prefix}${suffix}`;
    // Only wrap if the de-hyphenated form differs (it always will, but be explicit)
    if (withoutHyphen.toLowerCase() === match.toLowerCase()) return match;
    return `(${match},${withoutHyphen})`;
  });
}

/**
 * Build multi-stage search queries with product type context
 * Returns an array of queries to try in order (most specific to least specific)
 *
 * Strategy:
 * - Stage 1 (Most Precise): "[category] [brand] [model]" - Best for specific products
 * - Stage 2 (Balanced): "[brand] [model] [category]" - Good when category at start is too restrictive
 * - Stage 3 (Fallback): "[brand] [model]" OR "[model]" - Broadest, when category info missing
 *
 * @param config - Search query configuration with item name, brand, and category info
 * @returns Array of generated queries to try in order
 */
export function buildSearchQueries(config: SearchQueryConfig): GeneratedQuery[] {
  const { brandName, categoryInfo } = config;
  // Expand hyphenated model names for broader eBay matching (e.g. X-Mid → (X-Mid,Xmid))
  const itemName = expandQueryWithSpellingVariants(config.itemName);
  const queries: GeneratedQuery[] = [];

  // Extract product type keywords for result filtering
  const productTypeKeywords = categoryInfo?.productType
    ? getProductTypeKeywords(categoryInfo.productType)
    : [];

  // Determine if item name already contains category info
  const nameLower = itemName.toLowerCase();
  const hasCategory = productTypeKeywords.some(kw => nameLower.includes(kw));

  if (categoryInfo?.productType && !hasCategory) {
    // Stage 1: Category-first query (most specific)
    // Example: "tent Durston X-Dome 2"
    queries.push({
      query: brandName
        ? `${categoryInfo.productType} ${brandName} ${itemName}`
        : `${categoryInfo.productType} ${itemName}`,
      stage: 1,
      strategy: 'Category + Brand + Model (most specific)',
      productTypeKeywords,
    });

    // Stage 2: Category-last query (balanced)
    // Example: "Durston X-Dome 2 tent"
    queries.push({
      query: brandName
        ? `${brandName} ${itemName} ${categoryInfo.productType}`
        : `${itemName} ${categoryInfo.productType}`,
      stage: 2,
      strategy: 'Brand + Model + Category (balanced)',
      productTypeKeywords,
    });
  }

  // Stage 3: Standard query without explicit category (fallback)
  // Example: "Durston X-Dome 2" OR "X-Dome 2"
  queries.push({
    query: brandName ? `${brandName} ${itemName}` : itemName,
    stage: 3,
    strategy: hasCategory ? 'Brand + Model (category in name)' : 'Brand + Model (no category available)',
    productTypeKeywords,
  });

  return queries;
}

/**
 * Get search keywords for a product type to help with result filtering
 * Uses fuzzy matching to handle variations in product type naming
 *
 * @param productType - Product type label (e.g., "Tents", "Backpacks")
 * @returns Array of keywords that should appear in valid search results
 */
export function getProductTypeKeywords(productType: string): string[] {
  const productTypeLower = productType.toLowerCase();

  // Check for exact match first
  if (PRODUCT_TYPE_KEYWORDS[productTypeLower]) {
    return PRODUCT_TYPE_KEYWORDS[productTypeLower];
  }

  // Check for partial matches (e.g., "Tent" matches "tents")
  for (const [key, keywords] of Object.entries(PRODUCT_TYPE_KEYWORDS)) {
    if (productTypeLower.includes(key) || key.includes(productTypeLower)) {
      return keywords;
    }
  }

  // If no match, return the product type itself as a keyword
  return [productTypeLower];
}

/**
 * Validate if a search result title matches the expected product type
 * Used for pre-filtering results before price validation
 *
 * @param resultTitle - Title from Google Shopping or eBay result
 * @param productTypeKeywords - Keywords from getProductTypeKeywords()
 * @returns true if result likely matches the product type
 */
export function matchesProductType(
  resultTitle: string,
  productTypeKeywords: string[]
): boolean {
  if (productTypeKeywords.length === 0) {
    // No category info available, can't filter
    return true;
  }

  const titleLower = resultTitle.toLowerCase();

  // Check if any of the product type keywords appear in the title
  return productTypeKeywords.some(keyword => titleLower.includes(keyword));
}
