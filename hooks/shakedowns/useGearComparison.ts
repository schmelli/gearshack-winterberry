/**
 * useGearComparison Hook
 *
 * Feature: Shakedown Detail Enhancement - Side-by-Side Gear Comparison
 *
 * Manages the comparison state for gear items, allowing users to select
 * up to 4 items from the same category for side-by-side comparison.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import type { ShakedownGearItem } from './useShakedown';

// =============================================================================
// Types
// =============================================================================

export interface ComparisonItem extends ShakedownGearItem {
  /** Position in comparison (1-4) */
  position: number;
}

export interface ComparisonCriterion {
  /** Key for the criterion */
  key: string;
  /** Display label */
  label: string;
  /** Values for each compared item */
  values: (string | number | null)[];
  /** Which item "wins" this criterion (index, or -1 for tie/no winner) */
  winner: number;
  /** Unit for display */
  unit?: string;
  /** Whether lower is better */
  lowerIsBetter?: boolean;
}

export interface UseGearComparisonOptions {
  /** All available gear items */
  gearItems: ShakedownGearItem[];
  /** Maximum items to compare */
  maxItems?: number;
}

export interface UseGearComparisonReturn {
  // State
  isCompareMode: boolean;
  selectedItems: ComparisonItem[];
  selectedCategory: string | null;

  // Actions
  toggleCompareMode: () => void;
  selectItem: (item: ShakedownGearItem) => boolean;
  deselectItem: (itemId: string) => void;
  clearSelection: () => void;
  canSelectItem: (item: ShakedownGearItem) => boolean;
  isItemSelected: (itemId: string) => boolean;

  // Comparison data
  comparisonCriteria: ComparisonCriterion[];
  hasEnoughForComparison: boolean;

  // Suggestions
  suggestedSwaps: SuggestedSwap[];
}

export interface SuggestedSwap {
  /** Current item in comparison */
  currentItem: ShakedownGearItem;
  /** Suggested replacement */
  suggestedItem: ShakedownGearItem;
  /** Reason for suggestion */
  reason: string;
  /** Weight savings in grams (positive = lighter) */
  weightSavings: number;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_MAX_ITEMS = 4;

// =============================================================================
// Helper Functions
// =============================================================================

function getCategory(item: ShakedownGearItem): string {
  return item.productTypeId || 'uncategorized';
}

function calculateWinner(
  values: (string | number | null)[],
  lowerIsBetter: boolean = false
): number {
  const numericValues = values.map((v) =>
    typeof v === 'number' ? v : null
  );

  // Filter out nulls and find the "best" value
  const validValues = numericValues.filter((v) => v !== null) as number[];
  if (validValues.length < 2) return -1;

  const bestValue = lowerIsBetter
    ? Math.min(...validValues)
    : Math.max(...validValues);

  // Check for ties
  const winnerIndices = numericValues
    .map((v, i) => (v === bestValue ? i : -1))
    .filter((i) => i !== -1);

  if (winnerIndices.length !== 1) return -1; // Tie
  return winnerIndices[0];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useGearComparison({
  gearItems,
  maxItems = DEFAULT_MAX_ITEMS,
}: UseGearComparisonOptions): UseGearComparisonReturn {
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get selected items with positions
  const selectedItems = useMemo<ComparisonItem[]>(() => {
    const items: ComparisonItem[] = [];
    let position = 1;
    gearItems.forEach((item) => {
      if (selectedIds.has(item.id)) {
        items.push({ ...item, position });
        position++;
      }
    });
    return items;
  }, [gearItems, selectedIds]);

  // Toggle compare mode
  const toggleCompareMode = useCallback(() => {
    setIsCompareMode((prev) => {
      if (prev) {
        // Exiting compare mode - clear selection
        setSelectedIds(new Set());
        setSelectedCategory(null);
      }
      return !prev;
    });
  }, []);

  // Check if item can be selected
  const canSelectItem = useCallback(
    (item: ShakedownGearItem): boolean => {
      // Can't select if not in compare mode
      if (!isCompareMode) return false;

      // Can't select if already selected
      if (selectedIds.has(item.id)) return false;

      // Can't select if at max
      if (selectedIds.size >= maxItems) return false;

      // If we have a selected category, item must match
      if (selectedCategory !== null) {
        return getCategory(item) === selectedCategory;
      }

      return true;
    },
    [isCompareMode, selectedIds, selectedCategory, maxItems]
  );

  // Check if item is selected
  const isItemSelected = useCallback(
    (itemId: string): boolean => {
      return selectedIds.has(itemId);
    },
    [selectedIds]
  );

  // Select an item for comparison
  const selectItem = useCallback(
    (item: ShakedownGearItem): boolean => {
      if (!canSelectItem(item)) return false;

      const itemCategory = getCategory(item);

      // Use functional updates to avoid race conditions
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.add(item.id);
        return next;
      });

      // Set category if this is the first selection
      setSelectedCategory((prevCategory) => {
        if (prevCategory === null) {
          return itemCategory;
        }
        return prevCategory;
      });

      return true;
    },
    [canSelectItem]
  );

  // Deselect an item
  const deselectItem = useCallback((itemId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(itemId);

      // Clear category if no items left (do it in the same state update)
      if (next.size === 0) {
        setSelectedCategory(null);
      }

      return next;
    });
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectedCategory(null);
  }, []);

  // Build comparison criteria
  const comparisonCriteria = useMemo<ComparisonCriterion[]>(() => {
    if (selectedItems.length < 2) return [];

    const criteria: ComparisonCriterion[] = [];

    // Weight comparison
    const weights = selectedItems.map((item) => item.weightGrams);
    criteria.push({
      key: 'weight',
      label: 'Weight',
      values: weights,
      winner: calculateWinner(weights, true), // Lower is better
      unit: 'g',
      lowerIsBetter: true,
    });

    // Brand comparison (no winner)
    const brands = selectedItems.map((item) => item.brand || '—');
    criteria.push({
      key: 'brand',
      label: 'Brand',
      values: brands,
      winner: -1,
    });

    // Category (should be same)
    const categories = selectedItems.map((item) => item.productTypeId || '—');
    criteria.push({
      key: 'category',
      label: 'Category',
      values: categories,
      winner: -1,
    });

    return criteria;
  }, [selectedItems]);

  // Generate swap suggestions (simplified)
  const suggestedSwaps = useMemo<SuggestedSwap[]>(() => {
    if (selectedItems.length === 0 || !selectedCategory) return [];

    const suggestions: SuggestedSwap[] = [];

    // Find items in same category that are not selected
    const unselectedInCategory = gearItems.filter(
      (item) =>
        getCategory(item) === selectedCategory &&
        !selectedIds.has(item.id) &&
        item.weightGrams !== null
    );

    // For each selected item, suggest a lighter alternative if available
    selectedItems.forEach((selectedItem) => {
      if (selectedItem.weightGrams === null) return;

      const lighterAlternatives = unselectedInCategory
        .filter(
          (item) =>
            item.weightGrams !== null &&
            item.weightGrams < selectedItem.weightGrams!
        )
        .sort((a, b) => (a.weightGrams || 0) - (b.weightGrams || 0));

      if (lighterAlternatives.length > 0) {
        const suggestion = lighterAlternatives[0];
        suggestions.push({
          currentItem: selectedItem,
          suggestedItem: suggestion,
          reason: 'lighter_alternative',
          weightSavings: selectedItem.weightGrams - (suggestion.weightGrams || 0),
        });
      }
    });

    return suggestions.slice(0, 3); // Max 3 suggestions
  }, [selectedItems, selectedCategory, gearItems, selectedIds]);

  const hasEnoughForComparison = selectedItems.length >= 2;

  return {
    isCompareMode,
    selectedItems,
    selectedCategory,
    toggleCompareMode,
    selectItem,
    deselectItem,
    clearSelection,
    canSelectItem,
    isItemSelected,
    comparisonCriteria,
    hasEnoughForComparison,
    suggestedSwaps,
  };
}

export default useGearComparison;
