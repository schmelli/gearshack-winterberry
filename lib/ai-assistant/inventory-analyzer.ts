/**
 * Inventory Analysis Utilities
 * Feature 050: AI Assistant - T070
 *
 * Provides gear inventory analysis functions for base weight calculation,
 * category breakdowns, and weight optimization insights.
 */

import { createClient } from '@/lib/supabase/server';

// =====================================================
// Types
// =====================================================

export interface CategoryBreakdown {
  categoryId: string;
  categoryName: string;
  itemCount: number;
  totalWeight: number; // grams
  averageWeight: number; // grams
  heaviestItem: {
    id: string;
    name: string;
    weight: number; // grams
  } | null;
}

export interface BaseWeightAnalysis {
  totalWeight: number; // grams
  itemCount: number;
  categoryBreakdowns: CategoryBreakdown[];
  heaviestCategory: CategoryBreakdown | null;
}

// =====================================================
// Core Functions
// =====================================================

/**
 * T070: Calculate base weight from user's gear inventory
 *
 * Base weight = total weight of gear excluding consumables (food, water, fuel)
 * Optimized to use a single query with join instead of N+1 queries
 *
 * @param userId - User UUID
 * @param filters - Optional filters (brand, status, categoryId)
 * @returns Base weight analysis with category breakdowns
 */
export async function calculateBaseWeight(
  userId: string,
  filters?: {
    brand?: string;
    status?: 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';
    categoryId?: string;
  }
): Promise<BaseWeightAnalysis> {
  const supabase = await createClient();

  // Fetch gear items WITH category data in single query (join optimization)
  let query = supabase
    .from('gear_items')
    .select('id, name, brand, weight_grams, category_id, status, categories(id, label, i18n)')
    .eq('user_id', userId);

  // Apply status filter (default to 'own')
  if (filters?.status) {
    query = query.eq('status', filters.status);
  } else {
    query = query.eq('status', 'own'); // Only count owned items, not wishlist
  }

  // Apply brand filter (case-insensitive)
  if (filters?.brand) {
    query = query.ilike('brand', filters.brand);
  }

  // Apply category filter
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  const { data: gearItems, error } = await query;

  if (error) {
    console.error('Error fetching gear items:', error);
    return {
      totalWeight: 0,
      itemCount: 0,
      categoryBreakdowns: [],
      heaviestCategory: null,
    };
  }

  if (!gearItems || gearItems.length === 0) {
    return {
      totalWeight: 0,
      itemCount: 0,
      categoryBreakdowns: [],
      heaviestCategory: null,
    };
  }

  // Define the category structure from the join
  interface JoinedCategory {
    id: string;
    label: string;
    i18n: Record<string, string> | null;
  }

  // Build category map from joined data (no additional query needed)
  const categoryMap = new Map<string, string>();

  for (const item of gearItems) {
    // Access the joined categories data
    const category = (item as typeof item & { categories?: JoinedCategory }).categories;
    if (category && item.category_id && !categoryMap.has(item.category_id)) {
      const i18n = category.i18n;
      const name = i18n?.en ?? category.label;
      categoryMap.set(item.category_id, name);
    }
  }

  // Group by category and calculate breakdowns
  const categoryGroups = new Map<string, typeof gearItems>();

  for (const item of gearItems) {
    const catId = item.category_id || 'uncategorized';
    if (!categoryGroups.has(catId)) {
      categoryGroups.set(catId, []);
    }
    categoryGroups.get(catId)!.push(item);
  }

  const categoryBreakdowns: CategoryBreakdown[] = [];

  for (const [categoryId, items] of categoryGroups) {
    const totalWeight = items.reduce((sum, item) => sum + (item.weight_grams || 0), 0);
    const heaviest = items.reduce((max, item) =>
      (item.weight_grams || 0) > (max.weight_grams || 0) ? item : max
    );

    categoryBreakdowns.push({
      categoryId,
      categoryName: categoryMap.get(categoryId) || 'Uncategorized',
      itemCount: items.length,
      totalWeight,
      averageWeight: items.length > 0 ? totalWeight / items.length : 0,
      heaviestItem: heaviest
        ? {
            id: heaviest.id,
            name: heaviest.name,
            weight: heaviest.weight_grams || 0,
          }
        : null,
    });
  }

  // Sort by total weight (heaviest first)
  categoryBreakdowns.sort((a, b) => b.totalWeight - a.totalWeight);

  const totalWeight = categoryBreakdowns.reduce((sum, cat) => sum + cat.totalWeight, 0);
  const heaviestCategory = categoryBreakdowns[0] || null;

  return {
    totalWeight,
    itemCount: gearItems.length,
    categoryBreakdowns,
    heaviestCategory,
  };
}

/**
 * T070: Get category breakdowns only (lighter version)
 *
 * @param userId - User UUID
 * @returns Array of category breakdowns
 */
export async function getCategoryBreakdowns(userId: string): Promise<CategoryBreakdown[]> {
  const analysis = await calculateBaseWeight(userId);
  return analysis.categoryBreakdowns;
}

/**
 * T072: Filter gear items by budget/price range
 *
 * @param userId - User UUID
 * @param maxPrice - Maximum price (in user's currency)
 * @param currency - Currency code (default: USD)
 * @returns Array of gear items within budget
 */
// Type for gear items with budget-relevant fields
interface GearItemBudgetView {
  id: string;
  name: string;
  brand: string | null;
  price_paid: number | null;
  currency: string | null;
  category_id: string | null;
  weight_grams: number | null;
  primary_image_url: string | null;
}

export async function findGearByBudget(
  userId: string,
  maxPrice: number,
  currency: string = 'USD'
): Promise<GearItemBudgetView[]> {
  const supabase = await createClient();

  const { data: gearItems, error } = await supabase
    .from('gear_items')
    .select('id, name, brand, price_paid, currency, category_id, weight_grams, primary_image_url')
    .eq('user_id', userId)
    .lte('price_paid', maxPrice)
    .eq('currency', currency)
    .order('price_paid', { ascending: true });

  if (error) {
    console.error('Error fetching gear by budget:', error);
    return [];
  }

  return gearItems || [];
}

/**
 * T072: Get price statistics for user's inventory
 *
 * @param userId - User UUID
 * @returns Price statistics (total spent, average, highest, lowest)
 */
export async function getPriceStatistics(userId: string): Promise<{
  totalSpent: number;
  averagePrice: number;
  highestPrice: number;
  lowestPrice: number;
  currency: string;
} | null> {
  const supabase = await createClient();

  const { data: gearItems, error } = await supabase
    .from('gear_items')
    .select('price_paid, currency')
    .eq('user_id', userId)
    .not('price_paid', 'is', null);

  if (error || !gearItems || gearItems.length === 0) {
    return null;
  }

  const prices = gearItems.map((item) => item.price_paid || 0);
  const totalSpent = prices.reduce((sum, price) => sum + price, 0);
  const averagePrice = totalSpent / prices.length;
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);

  // Use most common currency
  const currency = gearItems[0]?.currency || 'USD';

  return {
    totalSpent,
    averagePrice,
    highestPrice,
    lowestPrice,
    currency,
  };
}

/**
 * T073: Format weight in grams to human-readable string with unit conversion
 *
 * @param grams - Weight in grams
 * @param locale - User locale (for kg vs lbs) - 'en-US' uses imperial, others use metric
 * @param preferredUnit - Optional override for unit ('metric' or 'imperial')
 * @returns Formatted weight string
 */
export function formatWeight(
  grams: number,
  locale: string = 'en',
  preferredUnit?: 'metric' | 'imperial'
): string {
  // Determine unit system
  const useImperial =
    preferredUnit === 'imperial' || (!preferredUnit && locale === 'en-US');

  if (useImperial) {
    // Convert to ounces (1g = 0.035274oz)
    const ounces = grams * 0.035274;

    if (ounces < 16) {
      // Less than 1 lb, show in oz
      return `${ounces.toFixed(2)}oz`;
    } else {
      // 1 lb or more, show in lbs
      const pounds = ounces / 16;
      return `${pounds.toFixed(2)}lb`;
    }
  } else {
    // Metric system
    if (grams < 1000) {
      return `${Math.round(grams)}g`;
    } else {
      const kg = grams / 1000;
      return `${kg.toFixed(2)}kg`;
    }
  }
}

/**
 * T073: Convert weight from grams to display unit
 *
 * @param grams - Weight in grams
 * @param targetUnit - Target unit ('g', 'kg', 'oz', 'lb')
 * @returns Converted weight value
 */
export function convertWeight(
  grams: number,
  targetUnit: 'g' | 'kg' | 'oz' | 'lb'
): number {
  switch (targetUnit) {
    case 'g':
      return grams;
    case 'kg':
      return grams / 1000;
    case 'oz':
      return grams * 0.035274;
    case 'lb':
      return (grams * 0.035274) / 16;
    default:
      return grams;
  }
}

/**
 * Fetch user's gear items for AI context
 *
 * Returns a formatted list of gear items to prevent AI hallucination.
 * Limits to 50 items to stay within token limits.
 *
 * @param userId - User UUID
 * @returns Formatted string of gear items
 */
export async function getUserGearList(userId: string): Promise<string> {
  const supabase = await createClient();

  const { data: gearItems, error } = await supabase
    .from('gear_items')
    .select('id, name, brand, weight_grams, status, product_type_id, categories!inner(label, i18n)')
    .eq('user_id', userId)
    .eq('status', 'own')
    .order('name', { ascending: true })
    .limit(50);

  if (error || !gearItems || gearItems.length === 0) {
    return '';
  }

  // Define the category structure from the inner join
  interface JoinedCategoryLabel {
    label: string;
    i18n: Record<string, string> | null;
  }

  // Format items as a bulleted list
  const formattedItems = gearItems.map((item) => {
    const category = (item as typeof item & { categories?: JoinedCategoryLabel }).categories;
    const categoryLabel = category?.label || 'Uncategorized';
    const brand = item.brand ? `${item.brand} ` : '';
    const weight = item.weight_grams ? ` - ${item.weight_grams}g` : '';

    return `  * ${brand}${item.name}${weight} (${categoryLabel})`;
  });

  return formattedItems.join('\n');
}

/**
 * Search GearGraph catalog for products mentioned in user query
 *
 * Extracts potential product/brand names from the query and searches the catalog.
 * Returns formatted results to provide AI with accurate product information.
 *
 * @param query - User's message
 * @returns Formatted string of catalog search results
 */
export async function searchCatalogForQuery(query: string): Promise<string> {
  const supabase = await createClient();

  // Extract potential search terms (words with 3+ chars, excluding common words)
  const stopWords = new Set(['the', 'and', 'for', 'with', 'what', 'how', 'about', 'tell', 'show', 'find', 'get', 'recommend', 'suggest', 'best', 'good', 'better', 'lighter', 'heavier', 'cheaper']);
  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w));

  if (words.length === 0) return '';

  // Search for products matching any of the extracted terms
  // SECURITY: Sanitize for ILIKE wildcards AND PostgREST .or() injection
  const rawTerm = words.slice(0, 3).join(' '); // Use first 3 words as search term
  const searchTerm = rawTerm
    .slice(0, 100)            // Limit length to prevent DoS
    .replace(/\\/g, '\\\\')   // Escape backslash first
    .replace(/%/g, '\\%')     // Escape percent (ILIKE wildcard)
    .replace(/_/g, '\\_')     // Escape underscore (ILIKE single-char wildcard)
    .replace(/,/g, '')        // Remove commas (PostgREST .or() delimiter)
    .replace(/[()]/g, '')     // Remove parens (PostgREST grouping)
    .replace(/\./g, ' ');     // Replace dots (prevents .eq. injection)

  // Note: category_main/subcategory removed - use product_type for category display
  const { data: products, error } = await supabase
    .from('catalog_products')
    .select(`
      id,
      name,
      product_type,
      description,
      price_usd,
      weight_grams,
      catalog_brands!catalog_products_brand_id_fkey (
        id,
        name
      )
    `)
    .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
    .limit(5);

  if (error || !products || products.length === 0) {
    return '';
  }

  // Format catalog results
  // NOTE: Treat weight_grams = 0 as invalid/missing data (no outdoor gear weighs 0g)
  const formattedProducts = products.map((product) => {
    const brand = product.catalog_brands ? `${product.catalog_brands.name} ` : '';
    // Only show weight if > 0 (0 is invalid data, same as null)
    const weight = product.weight_grams && product.weight_grams > 0 ? ` - ${product.weight_grams}g` : '';
    const price = product.price_usd ? ` - $${product.price_usd}` : '';
    const category = product.product_type || 'Uncategorized';
    const description = product.description ? `\n    ${product.description.substring(0, 150)}${product.description.length > 150 ? '...' : ''}` : '';

    return `  * ${brand}${product.name}${weight}${price} (${category})${description}`;
  });

  return formattedProducts.join('\n\n');
}
