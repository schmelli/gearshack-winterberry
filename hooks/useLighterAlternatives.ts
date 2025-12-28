/**
 * useLighterAlternatives Hook
 *
 * Feature: loadout-ux-enhancements
 * Detects lighter alternatives for items in a loadout by comparing
 * with other items of the same productTypeId in the user's inventory.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useItems } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

export interface LighterAlternative {
  /** The item in the loadout that has a lighter alternative */
  currentItemId: string;
  /** The lighter item in the inventory */
  alternativeItem: GearItem;
  /** Weight difference in grams (positive = how much lighter) */
  weightSavings: number;
}

export interface UseLighterAlternativesReturn {
  /** Map of item ID -> lighter alternative info */
  alternatives: Map<string, LighterAlternative>;
  /** Check if an item has a lighter alternative */
  hasLighterAlternative: (itemId: string) => boolean;
  /** Get lighter alternative info for an item */
  getLighterAlternative: (itemId: string) => LighterAlternative | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook to find lighter alternatives for items in a loadout.
 *
 * @param loadoutItems - Items currently in the loadout
 * @returns Object with map of alternatives and helper functions
 *
 * @example
 * ```tsx
 * const { hasLighterAlternative, getLighterAlternative } = useLighterAlternatives(loadoutItems);
 *
 * if (hasLighterAlternative(item.id)) {
 *   const alt = getLighterAlternative(item.id);
 *   console.log(`${alt.alternativeItem.name} is ${alt.weightSavings}g lighter`);
 * }
 * ```
 */
export function useLighterAlternatives(
  loadoutItems: GearItem[]
): UseLighterAlternativesReturn {
  const allItems = useItems();

  // Pre-group all items by productTypeId for O(1) lookup (instead of O(m) filter per item)
  // This reduces overall complexity from O(n×m) to O(n+m)
  const itemsByProductType = useMemo(() => {
    const map = new Map<string, GearItem[]>();
    for (const item of allItems) {
      if (!item.productTypeId || item.weightGrams === null) continue;
      const existing = map.get(item.productTypeId) ?? [];
      existing.push(item);
      map.set(item.productTypeId, existing);
    }
    return map;
  }, [allItems]);

  // Build a map of lighter alternatives
  const alternatives = useMemo(() => {
    const result = new Map<string, LighterAlternative>();

    // Skip if no items
    if (loadoutItems.length === 0 || itemsByProductType.size === 0) {
      return result;
    }

    // Get IDs of items in the loadout to exclude from alternatives
    const loadoutItemIds = new Set(loadoutItems.map(item => item.id));

    // For each item in the loadout, find lighter alternatives
    for (const currentItem of loadoutItems) {
      // Skip items without productTypeId or weight
      if (!currentItem.productTypeId || currentItem.weightGrams === null) {
        continue;
      }

      // O(1) lookup: Get items with the same productTypeId
      const sameTypeItems = itemsByProductType.get(currentItem.productTypeId) ?? [];

      // Find the lightest alternative that is NOT in the loadout
      let lightest: GearItem | null = null;
      for (const item of sameTypeItems) {
        // Skip items already in the loadout
        if (loadoutItemIds.has(item.id)) continue;

        if (
          item.weightGrams !== null &&
          item.weightGrams < currentItem.weightGrams &&
          (!lightest || item.weightGrams < (lightest.weightGrams ?? Infinity))
        ) {
          lightest = item;
        }
      }

      // If we found a lighter alternative, record it
      if (lightest && lightest.weightGrams !== null) {
        result.set(currentItem.id, {
          currentItemId: currentItem.id,
          alternativeItem: lightest,
          weightSavings: currentItem.weightGrams - lightest.weightGrams,
        });
      }
    }

    return result;
  }, [loadoutItems, itemsByProductType]);

  // Helper: Check if an item has a lighter alternative
  const hasLighterAlternative = useCallback(
    (itemId: string) => alternatives.has(itemId),
    [alternatives]
  );

  // Helper: Get lighter alternative info for an item
  const getLighterAlternative = useCallback(
    (itemId: string) => alternatives.get(itemId) ?? null,
    [alternatives]
  );

  return {
    alternatives,
    hasLighterAlternative,
    getLighterAlternative,
  };
}
