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
 * Traverses the category hierarchy to get all three levels
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
    // Fetch the category and its parents in one query
    const { data, error } = await (supabase as any)
      .from('categories')
      .select('id, label, level, parent_id')
      .eq('id', productTypeId)
      .single();

    if (error || !data) {
      console.warn(`Failed to fetch category for ID ${productTypeId}:`, error);
      return null;
    }

    const productType = data.label;
    let categoryMain: string | null = null;
    let categoryTop: string | null = null;

    // If this is level 3, fetch level 2 parent
    if (data.level === 3 && data.parent_id) {
      const { data: level2Data } = await (supabase as any)
        .from('categories')
        .select('label, parent_id')
        .eq('id', data.parent_id)
        .single();

      if (level2Data) {
        categoryMain = level2Data.label;

        // Fetch level 1 grandparent
        if (level2Data.parent_id) {
          const { data: level1Data } = await (supabase as any)
            .from('categories')
            .select('label')
            .eq('id', level2Data.parent_id)
            .single();

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
    console.error('Error fetching product category info:', error);
    return null;
  }
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
  const { itemName, brandName, categoryInfo } = config;
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
