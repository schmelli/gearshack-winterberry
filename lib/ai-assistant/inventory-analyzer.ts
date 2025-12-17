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
 * @returns Base weight analysis with category breakdowns
 */
export async function calculateBaseWeight(userId: string): Promise<BaseWeightAnalysis> {
  const supabase = await createClient();

  // Fetch gear items WITH category data in single query (join optimization)
  const { data: gearItems, error } = await supabase
    .from('gear_items')
    .select('id, name, weight_grams, category_id, status, categories(id, label, i18n)')
    .eq('user_id', userId)
    .eq('status', 'own'); // Only count owned items, not wishlist

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

  // Build category map from joined data (no additional query needed)
  const categoryMap = new Map<string, string>();

  for (const item of gearItems) {
    const category = (item as any).categories;
    if (category && item.category_id && !categoryMap.has(item.category_id)) {
      const i18n = category.i18n as Record<string, string> | null;
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
      averageWeight: totalWeight / items.length,
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
export async function findGearByBudget(
  userId: string,
  maxPrice: number,
  currency: string = 'USD'
): Promise<any[]> {
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
