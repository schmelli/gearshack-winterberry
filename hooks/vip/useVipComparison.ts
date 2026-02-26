/**
 * useVipComparison Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T065
 *
 * Compares user loadout with VIP loadout.
 */

'use client';

import { useState, useCallback } from 'react';
import type {
  LoadoutComparison,
  CategoryComparison,
  ComparisonItem,
  CommonItem,
} from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface LoadoutData {
  id: string;
  name: string;
  items: Array<{
    name: string;
    brand: string | null;
    weightGrams: number;
    quantity: number;
    category: string;
  }>;
}

interface UseVipComparisonState {
  status: 'idle' | 'loading' | 'success' | 'error';
  comparison: LoadoutComparison | null;
  error: string | null;
}

interface UseVipComparisonReturn extends UseVipComparisonState {
  compareLoadouts: (userLoadout: LoadoutData, vipLoadout: LoadoutData, vipName: string) => void;
  clearComparison: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

function calculateTotalWeight(items: LoadoutData['items']): number {
  return items.reduce((sum, item) => sum + item.weightGrams * item.quantity, 0);
}

function groupByCategory(items: LoadoutData['items']): Map<string, number> {
  const categoryMap = new Map<string, number>();

  items.forEach((item) => {
    const current = categoryMap.get(item.category) ?? 0;
    categoryMap.set(item.category, current + item.weightGrams * item.quantity);
  });

  return categoryMap;
}

function normalizeItemName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// =============================================================================
// Hook
// =============================================================================

export function useVipComparison(): UseVipComparisonReturn {
  const [state, setState] = useState<UseVipComparisonState>({
    status: 'idle',
    comparison: null,
    error: null,
  });

  const compareLoadouts = useCallback(
    (userLoadout: LoadoutData, vipLoadout: LoadoutData, vipName: string) => {
      setState({ status: 'loading', comparison: null, error: null });

      try {
        // Calculate total weights
        const userTotalWeight = calculateTotalWeight(userLoadout.items);
        const vipTotalWeight = calculateTotalWeight(vipLoadout.items);

        // Calculate category weights
        const userCategoryWeights = groupByCategory(userLoadout.items);
        const vipCategoryWeights = groupByCategory(vipLoadout.items);

        // Get all categories
        const allCategories = new Set([
          ...userCategoryWeights.keys(),
          ...vipCategoryWeights.keys(),
        ]);

        // Build category comparison
        const categoryComparison: CategoryComparison[] = Array.from(allCategories).map(
          (category) => ({
            category,
            userWeightGrams: userCategoryWeights.get(category) ?? 0,
            vipWeightGrams: vipCategoryWeights.get(category) ?? 0,
            differenceGrams:
              (userCategoryWeights.get(category) ?? 0) -
              (vipCategoryWeights.get(category) ?? 0),
          })
        );

        // Find common and unique items
        const userItemMap = new Map<string, LoadoutData['items'][0]>();
        const vipItemMap = new Map<string, LoadoutData['items'][0]>();

        userLoadout.items.forEach((item) => {
          userItemMap.set(normalizeItemName(item.name), item);
        });

        vipLoadout.items.forEach((item) => {
          vipItemMap.set(normalizeItemName(item.name), item);
        });

        const commonItems: CommonItem[] = [];
        const uniqueToUser: ComparisonItem[] = [];
        const uniqueToVip: ComparisonItem[] = [];

        userItemMap.forEach((item, key) => {
          if (vipItemMap.has(key)) {
            const vipItem = vipItemMap.get(key)!;
            commonItems.push({
              name: item.name,
              brand: item.brand,
              weightGrams: item.weightGrams,
              category: item.category,
              userWeightGrams: item.weightGrams * item.quantity,
              vipWeightGrams: vipItem.weightGrams * vipItem.quantity,
            });
          } else {
            uniqueToUser.push({
              name: item.name,
              brand: item.brand,
              weightGrams: item.weightGrams * item.quantity,
              category: item.category,
            });
          }
        });

        vipItemMap.forEach((item, key) => {
          if (!userItemMap.has(key)) {
            uniqueToVip.push({
              name: item.name,
              brand: item.brand,
              weightGrams: item.weightGrams * item.quantity,
              category: item.category,
            });
          }
        });

        const comparison: LoadoutComparison = {
          userLoadout: {
            id: userLoadout.id,
            name: userLoadout.name,
            totalWeightGrams: userTotalWeight,
          },
          vipLoadout: {
            id: vipLoadout.id,
            name: vipLoadout.name,
            vipName,
            totalWeightGrams: vipTotalWeight,
          },
          weightDifferenceGrams: userTotalWeight - vipTotalWeight,
          categoryComparison,
          uniqueToUser,
          uniqueToVip,
          commonItems,
        };

        setState({
          status: 'success',
          comparison,
          error: null,
        });
      } catch (err) {
        setState({
          status: 'error',
          comparison: null,
          error: err instanceof Error ? err.message : 'Comparison failed',
        });
      }
    },
    []
  );

  const clearComparison = useCallback(() => {
    setState({
      status: 'idle',
      comparison: null,
      error: null,
    });
  }, []);

  return {
    ...state,
    compareLoadouts,
    clearComparison,
  };
}

export default useVipComparison;
