/**
 * Loadout Utility Functions
 *
 * Feature: 005-loadout-management
 * Weight calculations, category grouping, and formatting utilities
 */

import type { GearItem } from '@/types/gear';
import type { CategoryWeight, WeightCategory, LoadoutItemState, WeightSummary, ActivityPriorityMatrix } from '@/types/loadout';
import { WEIGHT_THRESHOLDS } from '@/types/loadout';
import type { Category } from '@/types/category';
import { getParentCategoryIds, getLocalizedLabel } from '@/lib/utils/category-helpers';

// =============================================================================
// Sort Types and Functions
// =============================================================================

export type SortOption =
  | 'name-asc'
  | 'name-desc'
  | 'weight-asc'
  | 'weight-desc'
  | 'category';

/**
 * Sort and filter gear items based on provided options.
 * Used by both LoadoutPicker and LoadoutList for consistent behavior.
 */
export function sortAndFilterItems(
  items: GearItem[],
  sortBy: SortOption,
  filterCategoryId: string | null,
  categories: Category[]
): GearItem[] {
  // First, filter by category if specified
  let filtered = items;
  if (filterCategoryId) {
    filtered = items.filter((item) => {
      const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
      return categoryId === filterCategoryId;
    });
  }

  // Then sort
  return [...filtered].sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return a.name.localeCompare(b.name);
      case 'name-desc':
        return b.name.localeCompare(a.name);
      case 'weight-asc':
        return (a.weightGrams ?? 0) - (b.weightGrams ?? 0);
      case 'weight-desc':
        return (b.weightGrams ?? 0) - (a.weightGrams ?? 0);
      case 'category': {
        const catA = getParentCategoryIds(a.productTypeId, categories);
        const catB = getParentCategoryIds(b.productTypeId, categories);
        const labelA = catA.categoryId
          ? categories.find((c) => c.id === catA.categoryId)
          : null;
        const labelB = catB.categoryId
          ? categories.find((c) => c.id === catB.categoryId)
          : null;
        const nameA = labelA ? getLocalizedLabel(labelA, 'en') : 'zzz';
        const nameB = labelB ? getLocalizedLabel(labelB, 'en') : 'zzz';
        return nameA.localeCompare(nameB);
      }
      default:
        return 0;
    }
  });
}

// =============================================================================
// Activity Priority Matrix Configuration (Feature: 009-grand-visual-polish)
// =============================================================================

/**
 * Predefined priority matrix for activity types.
 *
 * Values represent 0-100 priority score:
 * - 0-30: Low priority
 * - 31-60: Medium priority
 * - 61-80: High priority
 * - 81-100: Critical priority
 */
export const ACTIVITY_PRIORITY_MATRIX: ActivityPriorityMatrix = {
  hiking: {
    weight: 70,      // High - day hikers value lighter packs
    comfort: 60,     // Medium-high - comfort for sustained walking
    durability: 50,  // Medium - trails are generally predictable
    safety: 40,      // Medium-low - established trails are safe
  },
  camping: {
    weight: 30,      // Low - car camping doesn't restrict weight
    comfort: 90,     // Critical - comfort is primary goal
    durability: 60,  // Medium-high - gear gets used repeatedly
    safety: 50,      // Medium - camp setup matters
  },
  backpacking: {
    weight: 90,      // Critical - carrying everything on your back
    comfort: 50,     // Medium - some comfort sacrificed for weight
    durability: 70,  // High - gear must survive multi-day use
    safety: 60,      // Medium-high - remote areas need reliable gear
  },
  climbing: {
    weight: 60,      // Medium-high - weight matters but safety first
    comfort: 40,     // Medium-low - functionality over comfort
    durability: 90,  // Critical - gear failure is dangerous
    safety: 95,      // Critical - life-safety equipment
  },
  skiing: {
    weight: 50,      // Medium - some weight acceptable for performance
    comfort: 70,     // High - warmth and mobility important
    durability: 80,  // High - harsh conditions demand robust gear
    safety: 90,      // Critical - avalanche and cold weather risks
  },
};

// =============================================================================
// Weight Goal Configuration (Feature: 006-ui-makeover FR-009)
// =============================================================================

/** Default weight goal for progress bar - 4.5kg ultralight target */
export const DEFAULT_WEIGHT_GOAL_GRAMS = 4500;

/** Weight goal interface for future customization */
export interface WeightGoal {
  targetGrams: number;
  label: string;
}

/** Predefined weight goals for different hiking styles */
export const WEIGHT_GOALS: Record<string, WeightGoal> = {
  ultralight: { targetGrams: 4500, label: 'Ultralight (<4.5kg)' },
  lightweight: { targetGrams: 6800, label: 'Lightweight (<6.8kg)' },
  traditional: { targetGrams: 11300, label: 'Traditional (<11.3kg)' },
};

// =============================================================================
// Category Labels (matches taxonomy from gear items)
// =============================================================================

export const CATEGORY_LABELS: Record<string, string> = {
  shelter: 'Shelter',
  'sleep-system': 'Sleep System',
  packs: 'Packs',
  clothing: 'Clothing',
  cooking: 'Cooking',
  water: 'Water',
  electronics: 'Electronics',
  miscellaneous: 'Miscellaneous',
  'first-aid': 'First Aid',
};

// =============================================================================
// Weight Category Functions
// =============================================================================

/**
 * Determine weight category based on total weight in grams
 * - Ultralight: < 4.5kg (< 4500g)
 * - Moderate: 4.5kg - 9kg (4500g - 9000g)
 * - Heavy: > 9kg (> 9000g)
 */
export function getWeightCategory(weightGrams: number): WeightCategory {
  if (weightGrams < WEIGHT_THRESHOLDS.ULTRALIGHT_MAX) return 'ultralight';
  if (weightGrams < WEIGHT_THRESHOLDS.MODERATE_MAX) return 'moderate';
  return 'heavy';
}

/**
 * Get the CSS color class for a weight category
 * Uses app theme colors (forest green, terracotta, destructive)
 */
export function getWeightCategoryColor(category: WeightCategory): string {
  switch (category) {
    case 'ultralight':
      return 'text-primary'; // Forest green
    case 'moderate':
      return 'text-accent'; // Terracotta
    case 'heavy':
      return 'text-destructive'; // Red
  }
}

/**
 * Get the CSS background color class for a weight category
 */
export function getWeightCategoryBgColor(category: WeightCategory): string {
  switch (category) {
    case 'ultralight':
      return 'bg-primary'; // Forest green
    case 'moderate':
      return 'bg-accent'; // Terracotta
    case 'heavy':
      return 'bg-destructive'; // Red
  }
}

// =============================================================================
// Weight Calculation Functions
// =============================================================================

/**
 * Calculate total weight of gear items in grams
 * Items with null weight contribute 0g
 *
 * Feature 013: Gear Quantity Tracking
 * Now multiplies each item's weight by its quantity for accurate totals
 */
export function calculateTotalWeight(items: GearItem[]): number {
  return items.reduce((total, item) => {
    const quantity = item.quantity ?? 1;
    return total + (item.weightGrams ?? 0) * quantity;
  }, 0);
}

/**
 * Calculate weight summary with worn/consumable breakdown (Feature: 007)
 * Base Weight = Total Weight - (Worn + Consumable), without double-subtracting
 *
 * Feature 013: Gear Quantity Tracking
 * Now multiplies each item's weight by its quantity for accurate totals
 */
export function calculateWeightSummary(
  items: GearItem[],
  itemStates: LoadoutItemState[]
): WeightSummary {
  let totalWeight = 0;
  let wornWeight = 0;
  let consumableWeight = 0;

  for (const item of items) {
    // Feature 013: Multiply weight by quantity (default to 1 for backward compatibility)
    const quantity = item.quantity ?? 1;
    const weight = (item.weightGrams ?? 0) * quantity;
    totalWeight += weight;

    const state = itemStates.find(s => s.itemId === item.id);
    if (state?.isWorn) {
      wornWeight += weight;
    }
    if (state?.isConsumable) {
      consumableWeight += weight;
    }
  }

  // Base Weight excludes worn and consumable, but don't double-subtract
  // An item that is both worn AND consumable is only excluded once
  // Feature 013: Also apply quantity multiplier here
  const excludedWeight = items.reduce((sum, item) => {
    const state = itemStates.find(s => s.itemId === item.id);
    const isExcluded = state?.isWorn || state?.isConsumable;
    const quantity = item.quantity ?? 1;
    return isExcluded ? sum + (item.weightGrams ?? 0) * quantity : sum;
  }, 0);

  return {
    totalWeight,
    baseWeight: totalWeight - excludedWeight,
    wornWeight,
    consumableWeight,
  };
}

/**
 * Calculate weight breakdown by category
 * Cascading Category Refactor: Requires categories parameter to derive categoryId from productTypeId
 */
export function calculateCategoryWeights(items: GearItem[], categories: Category[], locale: string = 'en'): CategoryWeight[] {
  const totalWeight = calculateTotalWeight(items);

  // Group items by category
  // Feature 013: Include quantity in weight calculation
  const categoryMap = new Map<string, { items: GearItem[]; weight: number }>();

  for (const item of items) {
    const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
    const catId = categoryId ?? 'miscellaneous';
    const existing = categoryMap.get(catId) ?? { items: [], weight: 0 };
    existing.items.push(item);
    const quantity = item.quantity ?? 1;
    existing.weight += (item.weightGrams ?? 0) * quantity;
    categoryMap.set(catId, existing);
  }

  // Convert to CategoryWeight array
  const categoryWeights: CategoryWeight[] = [];

  for (const [categoryId, data] of categoryMap) {
    // Look up category label from categories array (new cascading system)
    const category = categories.find(c => c.id === categoryId);
    const categoryLabel = category
      ? getLocalizedLabel(category, locale)
      : (CATEGORY_LABELS[categoryId] ?? 'Miscellaneous');

    categoryWeights.push({
      categoryId,
      categoryLabel,
      totalWeightGrams: data.weight,
      itemCount: data.items.length,
      percentage: totalWeight > 0 ? (data.weight / totalWeight) * 100 : 0,
    });
  }

  // Sort by weight descending
  return categoryWeights.sort((a, b) => b.totalWeightGrams - a.totalWeightGrams);
}

// =============================================================================
// Item Grouping Functions
// =============================================================================

/**
 * Group items by category for display in loadout list
 * Cascading Category Refactor: Requires categories parameter to derive categoryId from productTypeId
 */
export function groupItemsByCategory(
  items: GearItem[],
  categories: Category[]
): Map<string, GearItem[]> {
  const groups = new Map<string, GearItem[]>();

  for (const item of items) {
    const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
    const catId = categoryId ?? 'miscellaneous';
    const existing = groups.get(catId) ?? [];
    existing.push(item);
    groups.set(catId, existing);
  }

  return groups;
}

/**
 * Get sorted category entries for rendering
 * Returns array of [categoryId, items] sorted based on the provided sort option.
 * Items within each category are also sorted according to the sort option.
 * Cascading Category Refactor: Requires categories parameter
 */
export function getSortedCategoryGroups(
  items: GearItem[],
  categories: Category[],
  sortBy: SortOption = 'category',
  locale: string = 'en'
): Array<[string, GearItem[]]> {
  const groups = groupItemsByCategory(items, categories);

  // Sort items within each category based on sort option
  for (const [, categoryItems] of groups) {
    categoryItems.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'weight-asc':
          return (a.weightGrams ?? 0) - (b.weightGrams ?? 0);
        case 'weight-desc':
          return (b.weightGrams ?? 0) - (a.weightGrams ?? 0);
        case 'category':
        default:
          // For category sort, sort by name within each category
          return a.name.localeCompare(b.name);
      }
    });
  }

  // Calculate total weight per category for sorting
  const withMeta = Array.from(groups.entries()).map(([categoryId, categoryItems]) => {
    const category = categories.find(c => c.id === categoryId);
    const categoryLabel = category ? getLocalizedLabel(category, locale) : 'zzz';
    return {
      categoryId,
      items: categoryItems,
      weight: calculateTotalWeight(categoryItems),
      label: categoryLabel,
    };
  });

  // Sort categories based on sort option
  switch (sortBy) {
    case 'name-asc':
    case 'name-desc':
    case 'category':
      // For name/category sorts, sort categories alphabetically
      withMeta.sort((a, b) => a.label.localeCompare(b.label));
      break;
    case 'weight-asc':
      // Lightest categories first
      withMeta.sort((a, b) => a.weight - b.weight);
      break;
    case 'weight-desc':
    default:
      // Heaviest categories first
      withMeta.sort((a, b) => b.weight - a.weight);
      break;
  }

  return withMeta.map(({ categoryId, items: categoryItems }) => [categoryId, categoryItems]);
}

// =============================================================================
// Formatting Functions
// =============================================================================

/**
 * Format weight in grams with thousands separator
 * FR-020: Display weight in grams with thousands separator (e.g., "1,483 g")
 */
export function formatWeight(grams: number | null): string {
  if (grams === null || grams === undefined || !Number.isFinite(grams)) return '-- g';
  return `${grams.toLocaleString()} g`;
}

/**
 * Format date for display
 * Returns format like "Jul 15, 2025"
 */
export function formatTripDate(date: Date | null): string | null {
  if (!date) return null;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
