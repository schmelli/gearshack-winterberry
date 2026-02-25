/**
 * useWeightAnalysis Hook
 *
 * Feature: Shakedown Detail Enhancement - Weight Heatmap Analyzer
 *
 * Provides comprehensive weight analysis for gear items in a shakedown.
 * Includes category breakdowns, weight distribution, outlier detection,
 * and comparison to community averages.
 */

'use client';

import { useMemo } from 'react';
import type { ShakedownGearItem } from './useShakedown';
import type { LoadoutItemState } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export interface CategoryWeightData {
  /** Category ID/name */
  categoryId: string;
  /** Display name for category */
  categoryName: string;
  /** Total weight in grams */
  totalWeight: number;
  /** Percentage of total loadout weight */
  percentage: number;
  /** Number of items in category */
  itemCount: number;
  /** Items in this category */
  items: ShakedownGearItem[];
  /** Color for visualization (HSL hue) */
  hue: number;
}

export interface WeightOutlier {
  /** The gear item */
  item: ShakedownGearItem;
  /** Weight in grams */
  weight: number;
  /** Percentage of total weight */
  percentage: number;
  /** How many standard deviations from mean */
  zScore: number;
  /** Severity: 'moderate' (1.5-2 SD) | 'significant' (2-3 SD) | 'extreme' (>3 SD) */
  severity: 'moderate' | 'significant' | 'extreme';
}

export interface WeightDistribution {
  /** Items in base weight */
  baseWeight: {
    total: number;
    items: ShakedownGearItem[];
  };
  /** Worn items */
  wornWeight: {
    total: number;
    items: ShakedownGearItem[];
  };
  /** Consumable items */
  consumableWeight: {
    total: number;
    items: ShakedownGearItem[];
  };
}

export interface UseWeightAnalysisOptions {
  /** Gear items to analyze */
  gearItems: ShakedownGearItem[];
  /** Item states from loadout */
  itemStates?: LoadoutItemState[];
  /** Community average base weight for comparison (grams) */
  communityAverageBaseWeight?: number;
}

export interface UseWeightAnalysisReturn {
  // Totals
  totalWeight: number;
  baseWeight: number;
  wornWeight: number;
  consumableWeight: number;

  // Category breakdown
  categoryBreakdown: CategoryWeightData[];

  // Weight distribution by status
  weightDistribution: WeightDistribution;

  // Outliers (weight hogs)
  outliers: WeightOutlier[];
  hasOutliers: boolean;

  // Statistics
  averageItemWeight: number;
  heaviestItem: ShakedownGearItem | null;
  lightestItem: ShakedownGearItem | null;

  // Community comparison
  communityComparison: {
    difference: number; // positive = heavier than average
    percentageDifference: number;
    isAboveAverage: boolean;
  } | null;
}

// =============================================================================
// Constants
// =============================================================================

// Color hues for categories (spread evenly across spectrum)
const CATEGORY_HUES = [
  200, // Blue - Shelter
  140, // Green - Sleep
  30,  // Orange - Cook
  300, // Purple - Pack
  60,  // Yellow - Clothes
  180, // Cyan - Electronics
  350, // Red - Safety
  90,  // Lime - Misc
];

// Z-score thresholds for outlier detection
const OUTLIER_THRESHOLDS = {
  moderate: 1.5,
  significant: 2.0,
  extreme: 3.0,
};

// =============================================================================
// Helper Functions
// =============================================================================

function getCategoryDisplayName(categoryId: string | null): string {
  if (!categoryId) return 'Uncategorized';
  // Extract last part of category path if it's a path
  const parts = categoryId.split('/');
  const name = parts[parts.length - 1];
  // Convert to title case
  return name
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function calculateZScore(value: number, mean: number, stdDev: number): number {
  if (stdDev === 0) return 0;
  return (value - mean) / stdDev;
}

function getOutlierSeverity(zScore: number): 'moderate' | 'significant' | 'extreme' {
  const absZ = Math.abs(zScore);
  if (absZ >= OUTLIER_THRESHOLDS.extreme) return 'extreme';
  if (absZ >= OUTLIER_THRESHOLDS.significant) return 'significant';
  return 'moderate';
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWeightAnalysis({
  gearItems,
  itemStates = [],
  communityAverageBaseWeight,
}: UseWeightAnalysisOptions): UseWeightAnalysisReturn {
  // Create item state lookup
  const itemStateMap = useMemo(() => {
    const map: Record<string, LoadoutItemState> = {};
    itemStates.forEach((state) => {
      map[state.itemId] = state;
    });
    return map;
  }, [itemStates]);

  // Calculate weight distribution
  const weightDistribution = useMemo<WeightDistribution>(() => {
    const base: ShakedownGearItem[] = [];
    const worn: ShakedownGearItem[] = [];
    const consumable: ShakedownGearItem[] = [];

    gearItems.forEach((item) => {
      const state = itemStateMap[item.id];
      if (state?.isWorn) {
        worn.push(item);
      } else if (state?.isConsumable) {
        consumable.push(item);
      } else {
        base.push(item);
      }
    });

    return {
      baseWeight: {
        total: base.reduce((sum, item) => sum + (item.weightGrams || 0), 0),
        items: base,
      },
      wornWeight: {
        total: worn.reduce((sum, item) => sum + (item.weightGrams || 0), 0),
        items: worn,
      },
      consumableWeight: {
        total: consumable.reduce((sum, item) => sum + (item.weightGrams || 0), 0),
        items: consumable,
      },
    };
  }, [gearItems, itemStateMap]);

  // Calculate totals
  const totalWeight = useMemo(() => {
    return gearItems.reduce((sum, item) => sum + (item.weightGrams || 0), 0);
  }, [gearItems]);

  const { baseWeight, wornWeight, consumableWeight } = useMemo(() => ({
    baseWeight: weightDistribution.baseWeight.total,
    wornWeight: weightDistribution.wornWeight.total,
    consumableWeight: weightDistribution.consumableWeight.total,
  }), [weightDistribution]);

  // Category breakdown
  const categoryBreakdown = useMemo<CategoryWeightData[]>(() => {
    const categoryMap = new Map<string, ShakedownGearItem[]>();

    gearItems.forEach((item) => {
      const category = item.productTypeId || 'uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(item);
    });

    const categories: CategoryWeightData[] = [];
    let hueIndex = 0;

    categoryMap.forEach((items, categoryId) => {
      const categoryWeight = items.reduce((sum, item) => sum + (item.weightGrams || 0), 0);
      categories.push({
        categoryId,
        categoryName: getCategoryDisplayName(categoryId),
        totalWeight: categoryWeight,
        percentage: totalWeight > 0 ? (categoryWeight / totalWeight) * 100 : 0,
        itemCount: items.length,
        items,
        hue: CATEGORY_HUES[hueIndex % CATEGORY_HUES.length],
      });
      hueIndex++;
    });

    // Sort by weight descending
    return categories.sort((a, b) => b.totalWeight - a.totalWeight);
  }, [gearItems, totalWeight]);

  // Calculate outliers (weight hogs)
  const outliers = useMemo<WeightOutlier[]>(() => {
    const itemsWithWeight = gearItems.filter((item) => item.weightGrams !== null && item.weightGrams > 0);
    if (itemsWithWeight.length < 3) return []; // Need at least 3 items for meaningful statistics

    const weights = itemsWithWeight.map((item) => item.weightGrams!);
    const mean = weights.reduce((sum, w) => sum + w, 0) / weights.length;
    const variance = weights.reduce((sum, w) => sum + Math.pow(w - mean, 2), 0) / weights.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return [];

    const result: WeightOutlier[] = [];

    itemsWithWeight.forEach((item) => {
      const weight = item.weightGrams!;
      const zScore = calculateZScore(weight, mean, stdDev);

      // Only consider items heavier than average as "weight hogs"
      if (zScore >= OUTLIER_THRESHOLDS.moderate) {
        result.push({
          item,
          weight,
          percentage: totalWeight > 0 ? (weight / totalWeight) * 100 : 0,
          zScore,
          severity: getOutlierSeverity(zScore),
        });
      }
    });

    // Sort by z-score descending
    return result.sort((a, b) => b.zScore - a.zScore);
  }, [gearItems, totalWeight]);

  // Find heaviest and lightest items
  const { heaviestItem, lightestItem } = useMemo(() => {
    const itemsWithWeight = gearItems.filter((item) => item.weightGrams !== null);
    if (itemsWithWeight.length === 0) {
      return { heaviestItem: null, lightestItem: null };
    }

    let heaviest = itemsWithWeight[0];
    let lightest = itemsWithWeight[0];

    itemsWithWeight.forEach((item) => {
      if ((item.weightGrams || 0) > (heaviest.weightGrams || 0)) {
        heaviest = item;
      }
      if ((item.weightGrams || 0) < (lightest.weightGrams || 0)) {
        lightest = item;
      }
    });

    return { heaviestItem: heaviest, lightestItem: lightest };
  }, [gearItems]);

  // Average item weight
  const averageItemWeight = useMemo(() => {
    const itemsWithWeight = gearItems.filter((item) => item.weightGrams !== null);
    if (itemsWithWeight.length === 0) return 0;
    return totalWeight / itemsWithWeight.length;
  }, [gearItems, totalWeight]);

  // Community comparison
  const communityComparison = useMemo(() => {
    if (communityAverageBaseWeight === undefined || communityAverageBaseWeight <= 0) {
      return null;
    }

    const difference = baseWeight - communityAverageBaseWeight;
    const percentageDifference = (difference / communityAverageBaseWeight) * 100;

    return {
      difference,
      percentageDifference,
      isAboveAverage: difference > 0,
    };
  }, [baseWeight, communityAverageBaseWeight]);

  return {
    totalWeight,
    baseWeight,
    wornWeight,
    consumableWeight,
    categoryBreakdown,
    weightDistribution,
    outliers,
    hasOutliers: outliers.length > 0,
    averageItemWeight,
    heaviestItem,
    lightestItem,
    communityComparison,
  };
}

export default useWeightAnalysis;
