/**
 * useTripRecommendations Hook
 *
 * Feature: Shakedown Detail Enhancement - Smart Trip Recommendations
 *
 * Provides intelligent recommendations for a loadout based on trip details.
 * Analyzes gear for missing essentials, redundancies, and weather concerns.
 */

'use client';

import { useMemo } from 'react';
import type { ShakedownGearItem } from './useShakedown';
import type { Loadout } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export type RecommendationType =
  | 'missing_essential'
  | 'weather_warning'
  | 'redundancy'
  | 'suggested_addition'
  | 'weight_concern';

export type RecommendationSeverity = 'critical' | 'warning' | 'info' | 'success';

export interface TripRecommendation {
  /** Unique ID for the recommendation */
  id: string;
  /** Type of recommendation */
  type: RecommendationType;
  /** Severity level */
  severity: RecommendationSeverity;
  /** Main message */
  title: string;
  /** Detailed description */
  description: string;
  /** Related item IDs (if applicable) */
  relatedItemIds?: string[];
  /** Suggested action */
  action?: string;
  /** Icon name for display */
  icon?: string;
}

export interface TripContext {
  /** Trip name */
  tripName: string;
  /** Start date */
  startDate: string;
  /** End date */
  endDate: string;
  /** Experience level */
  experienceLevel: string;
  /** Specific concerns from user */
  concerns: string | null;
  /** Seasons (if available) */
  seasons?: string[];
  /** Activity types (if available) */
  activityTypes?: string[];
}

export interface UseTripRecommendationsOptions {
  /** Gear items in the loadout */
  gearItems: ShakedownGearItem[];
  /** Loadout data */
  loadout: Loadout | null;
  /** Trip context */
  tripContext: TripContext;
  /** Total weight in grams */
  totalWeight: number;
}

export interface UseTripRecommendationsReturn {
  /** All recommendations */
  recommendations: TripRecommendation[];
  /** Critical recommendations (missing essentials) */
  criticalRecommendations: TripRecommendation[];
  /** Warning recommendations (weather, weight) */
  warnings: TripRecommendation[];
  /** Info recommendations (suggestions) */
  suggestions: TripRecommendation[];
  /** Has any critical issues */
  hasCriticalIssues: boolean;
  /** Total recommendation count */
  totalCount: number;
}

// =============================================================================
// Gear Categories for Analysis
// =============================================================================

const ESSENTIAL_CATEGORIES = {
  shelter: ['tent', 'tarp', 'hammock', 'bivvy', 'shelter'],
  sleep: ['sleeping_bag', 'quilt', 'sleeping_pad', 'pad', 'sleep'],
  water: ['water_filter', 'water_treatment', 'water_bottle', 'hydration'],
  navigation: ['map', 'compass', 'gps', 'navigation'],
  firstAid: ['first_aid', 'first_aid_kit', 'medical'],
  lighting: ['headlamp', 'flashlight', 'lantern', 'light'],
};

const SEASONAL_REQUIREMENTS: Record<string, string[]> = {
  winter: ['insulation', 'gloves', 'hat', 'puffy', 'down_jacket', 'ice_axe'],
  summer: ['sun_protection', 'sunscreen', 'hat', 'sunglasses'],
  spring: ['rain_gear', 'rain_jacket', 'rain_pants'],
  fall: ['rain_gear', 'insulation', 'layers'],
};

const ACTIVITY_REQUIREMENTS: Record<string, string[]> = {
  backpacking: ['backpack', 'pack'],
  hiking: ['trekking_poles', 'footwear'],
  mountaineering: ['ice_axe', 'crampons', 'helmet'],
  camping: ['camp_chair', 'camp_stove'],
};

// =============================================================================
// Helper Functions
// =============================================================================

function generateId(): string {
  return `rec_${crypto.randomUUID()}`;
}

function itemMatchesCategory(item: ShakedownGearItem, keywords: string[]): boolean {
  const itemName = item.name.toLowerCase();
  const itemCategory = item.productTypeId?.toLowerCase() || '';
  const itemBrand = item.brand?.toLowerCase() || '';

  return keywords.some(
    (keyword) =>
      itemName.includes(keyword) ||
      itemCategory.includes(keyword) ||
      itemBrand.includes(keyword)
  );
}

function findMissingCategories(
  items: ShakedownGearItem[],
  requiredCategories: Record<string, string[]>
): string[] {
  const missing: string[] = [];

  Object.entries(requiredCategories).forEach(([category, keywords]) => {
    const hasCategory = items.some((item) => itemMatchesCategory(item, keywords));
    if (!hasCategory) {
      missing.push(category);
    }
  });

  return missing;
}

function findDuplicates(items: ShakedownGearItem[]): Map<string, ShakedownGearItem[]> {
  const categoryItems = new Map<string, ShakedownGearItem[]>();

  items.forEach((item) => {
    const category = item.productTypeId || 'uncategorized';
    if (!categoryItems.has(category)) {
      categoryItems.set(category, []);
    }
    categoryItems.get(category)!.push(item);
  });

  // Filter to only categories with multiple items
  const duplicates = new Map<string, ShakedownGearItem[]>();
  categoryItems.forEach((categoryList, category) => {
    if (categoryList.length > 1) {
      duplicates.set(category, categoryList);
    }
  });

  return duplicates;
}

function getTripDuration(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

function getSeasonFromDate(dateString: string): string {
  const date = new Date(dateString);
  const month = date.getMonth();

  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useTripRecommendations({
  gearItems,
  loadout,
  tripContext,
  totalWeight,
}: UseTripRecommendationsOptions): UseTripRecommendationsReturn {
  const recommendations = useMemo<TripRecommendation[]>(() => {
    const results: TripRecommendation[] = [];

    if (gearItems.length === 0) {
      return results;
    }

    // 1. Check for missing essentials
    const missingEssentials = findMissingCategories(gearItems, ESSENTIAL_CATEGORIES);
    missingEssentials.forEach((category) => {
      results.push({
        id: generateId(),
        type: 'missing_essential',
        severity: 'critical',
        title: `Missing ${category.replace('_', ' ')}`,
        description: `Consider adding ${category.replace('_', ' ')} gear for safety.`,
        action: `Add ${category.replace('_', ' ')}`,
        icon: 'AlertTriangle',
      });
    });

    // 2. Check seasonal requirements
    const inferredSeason = tripContext.seasons?.[0] || getSeasonFromDate(tripContext.startDate);
    const seasonalKeywords = SEASONAL_REQUIREMENTS[inferredSeason] || [];

    if (seasonalKeywords.length > 0) {
      const hasSeasonalGear = gearItems.some((item) =>
        itemMatchesCategory(item, seasonalKeywords)
      );

      if (!hasSeasonalGear) {
        results.push({
          id: generateId(),
          type: 'weather_warning',
          severity: 'warning',
          title: `${inferredSeason.charAt(0).toUpperCase() + inferredSeason.slice(1)} gear check`,
          description: `Your trip appears to be in ${inferredSeason}. Consider reviewing seasonal gear requirements.`,
          action: 'Review seasonal gear',
          icon: 'Cloud',
        });
      }
    }

    // 3. Check for redundancies
    const duplicates = findDuplicates(gearItems);
    duplicates.forEach((items, category) => {
      if (items.length > 2) {
        // Only flag if more than 2 of same category
        const totalWeight = items.reduce((sum, i) => sum + (i.weightGrams || 0), 0);
        results.push({
          id: generateId(),
          type: 'redundancy',
          severity: 'info',
          title: `Multiple ${category.replace('_', ' ')} items`,
          description: `You have ${items.length} items in this category (${totalWeight}g total). Consider if all are needed.`,
          relatedItemIds: items.map((i) => i.id),
          action: 'Review duplicates',
          icon: 'Copy',
        });
      }
    });

    // 4. Weight concerns based on experience level
    const tripDuration = getTripDuration(tripContext.startDate, tripContext.endDate);
    const weightPerDay = totalWeight / tripDuration;

    // Approximate thresholds (grams per day)
    const weightThresholds: Record<string, number> = {
      beginner: 4000,
      intermediate: 3500,
      experienced: 3000,
      expert: 2500,
    };

    const threshold = weightThresholds[tripContext.experienceLevel] || 4000;

    if (weightPerDay > threshold) {
      results.push({
        id: generateId(),
        type: 'weight_concern',
        severity: 'warning',
        title: 'Pack weight may be high',
        description: `Your weight per day (${Math.round(weightPerDay / 1000 * 10) / 10}kg/day) is above typical for ${tripContext.experienceLevel} level hikers.`,
        action: 'Review heavy items',
        icon: 'Scale',
      });
    } else if (weightPerDay < threshold * 0.6) {
      results.push({
        id: generateId(),
        type: 'suggested_addition',
        severity: 'success',
        title: 'Ultralight pack achieved!',
        description: `Great job! Your weight per day (${Math.round(weightPerDay / 1000 * 10) / 10}kg/day) is well optimized.`,
        icon: 'Sparkles',
      });
    }

    // 5. Trip duration specific suggestions
    if (tripDuration > 3) {
      const hasStove = gearItems.some((item) =>
        itemMatchesCategory(item, ['stove', 'cooker', 'burner'])
      );
      const hasCookware = gearItems.some((item) =>
        itemMatchesCategory(item, ['pot', 'pan', 'cookware'])
      );

      if (!hasStove || !hasCookware) {
        results.push({
          id: generateId(),
          type: 'suggested_addition',
          severity: 'info',
          title: 'Cooking gear for longer trip',
          description: `For a ${tripDuration}-day trip, you may want cooking gear for hot meals.`,
          action: 'Consider adding cooking gear',
          icon: 'Flame',
        });
      }
    }

    // 6. Analyze user concerns
    if (tripContext.concerns) {
      const concernsLower = tripContext.concerns.toLowerCase();

      if (concernsLower.includes('bear') || concernsLower.includes('food storage')) {
        const hasBearCanister = gearItems.some((item) =>
          itemMatchesCategory(item, ['bear_canister', 'bear_can', 'ursack'])
        );
        if (!hasBearCanister) {
          results.push({
            id: generateId(),
            type: 'missing_essential',
            severity: 'critical',
            title: 'Bear canister may be required',
            description: 'You mentioned bear concerns. Check if your area requires a bear canister.',
            action: 'Add bear canister',
            icon: 'AlertTriangle',
          });
        }
      }

      if (concernsLower.includes('water') || concernsLower.includes('desert')) {
        const hasWaterCapacity = gearItems.filter((item) =>
          itemMatchesCategory(item, ['water_bottle', 'hydration', 'bladder'])
        ).length;
        if (hasWaterCapacity < 2) {
          results.push({
            id: generateId(),
            type: 'weather_warning',
            severity: 'warning',
            title: 'Consider additional water capacity',
            description: 'For desert or water-scarce areas, consider carrying more water storage.',
            action: 'Add water storage',
            icon: 'Droplet',
          });
        }
      }
    }

    return results;
  }, [gearItems, loadout, tripContext, totalWeight]);

  // Categorize recommendations
  const criticalRecommendations = useMemo(
    () => recommendations.filter((r) => r.severity === 'critical'),
    [recommendations]
  );

  const warnings = useMemo(
    () => recommendations.filter((r) => r.severity === 'warning'),
    [recommendations]
  );

  const suggestions = useMemo(
    () => recommendations.filter((r) => r.severity === 'info' || r.severity === 'success'),
    [recommendations]
  );

  return {
    recommendations,
    criticalRecommendations,
    warnings,
    suggestions,
    hasCriticalIssues: criticalRecommendations.length > 0,
    totalCount: recommendations.length,
  };
}

export default useTripRecommendations;
