/**
 * useLoadoutEditor Hook
 *
 * Feature: 005-loadout-management
 * Provides search state, add/remove item logic for the loadout editor
 *
 * Feature: 006-ui-makeover
 * FR-022: Toast notification when item is added
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { useLocale } from 'next-intl';
import { useStore, useLoadout, useItems } from '@/hooks/useSupabaseStore';
import type { GearItem } from '@/types/gear';
import type { CategoryWeight, LoadoutItemState, ActivityType, ActivityPriorities } from '@/types/loadout';
import { calculateTotalWeight, calculateCategoryWeights, calculateWeightSummary, formatWeight, ACTIVITY_PRIORITY_MATRIX } from '@/lib/loadout-utils';
import { useCategories } from '@/hooks/useCategories';

// =============================================================================
// Activity Priority Computation (Feature: 009-grand-visual-polish)
// Constitution Principle I: Business logic in hooks
// =============================================================================

/**
 * Compute averaged priorities across selected activities.
 * Returns neutral values (50) if no activities selected.
 */
export function computeAveragePriorities(
  selectedActivities: ActivityType[]
): ActivityPriorities {
  if (selectedActivities.length === 0) {
    return { weight: 50, comfort: 50, durability: 50, safety: 50 };
  }

  const totals = selectedActivities.reduce(
    (acc, activity) => {
      const priorities = ACTIVITY_PRIORITY_MATRIX[activity];
      return {
        weight: acc.weight + priorities.weight,
        comfort: acc.comfort + priorities.comfort,
        durability: acc.durability + priorities.durability,
        safety: acc.safety + priorities.safety,
      };
    },
    { weight: 0, comfort: 0, durability: 0, safety: 0 }
  );

  const count = selectedActivities.length;
  return {
    weight: Math.round(totals.weight / count),
    comfort: Math.round(totals.comfort / count),
    durability: Math.round(totals.durability / count),
    safety: Math.round(totals.safety / count),
  };
}

// =============================================================================
// Types
// =============================================================================

export interface UseLoadoutEditorReturn {
  /** Items currently in the loadout */
  loadoutItems: GearItem[];
  /** Search query for picker filter */
  searchQuery: string;
  /** Update search query */
  setSearchQuery: (query: string) => void;
  /** Filtered items for the picker (based on search) */
  filteredPickerItems: GearItem[];
  /** Add an item to the loadout */
  addItem: (itemId: string) => Promise<void>;
  /** Remove an item from the loadout */
  removeItem: (itemId: string) => Promise<void>;
  /** Total weight of items in loadout */
  totalWeight: number;
  /** Base weight (total minus worn and consumable items) - Feature 007 */
  baseWeight: number;
  /** Weight breakdown by category */
  categoryWeights: CategoryWeight[];
  /** Item states for worn/consumable tracking - Feature 007 */
  itemStates: LoadoutItemState[];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutEditor(loadoutId: string): UseLoadoutEditorReturn {
  // Store state
  const loadout = useLoadout(loadoutId);
  const allItems = useItems();
  const addItemToLoadout = useStore((state) => state.addItemToLoadout);
  const removeItemFromLoadout = useStore((state) => state.removeItemFromLoadout);

  // Cascading Category Refactor: Get categories for weight calculations
  const { categories } = useCategories();
  const locale = useLocale();

  // Local state for search
  const [searchQuery, setSearchQuery] = useState('');

  // Compute loadout items
  const loadoutItems = useMemo(() => {
    if (!loadout) return [];
    return allItems.filter((item) => loadout.itemIds.includes(item.id));
  }, [loadout, allItems]);

  // Compute filtered picker items (FR-013)
  const filteredPickerItems = useMemo(() => {
    if (!searchQuery.trim()) return allItems;

    const query = searchQuery.toLowerCase();
    return allItems.filter((item) => {
      // Match on name or brand
      const nameMatch = item.name.toLowerCase().includes(query);
      const brandMatch = item.brand?.toLowerCase().includes(query) ?? false;
      return nameMatch || brandMatch;
    });
  }, [allItems, searchQuery]);

  // Get item states from loadout (Feature: 007)
  const itemStates = useMemo(() => loadout?.itemStates ?? [], [loadout]);

  // Compute weight metrics
  const totalWeight = useMemo(() => calculateTotalWeight(loadoutItems), [loadoutItems]);
  const categoryWeights = useMemo(() => calculateCategoryWeights(loadoutItems, categories, locale), [loadoutItems, categories, locale]);

  // Compute base weight using itemStates (Feature: 007)
  const baseWeight = useMemo(() => {
    const summary = calculateWeightSummary(loadoutItems, itemStates);
    return summary.baseWeight;
  }, [loadoutItems, itemStates]);

  // Actions
  const addItem = useCallback(
    async (itemId: string) => {
      const item = allItems.find((i) => i.id === itemId);
      try {
        await addItemToLoadout(loadoutId, itemId);
        // FR-022: Toast notification when item is added - only after successful save
        if (item) {
          toast.success(`Added ${item.name}`, {
            description: item.weightGrams ? formatWeight(item.weightGrams) : undefined,
          });
        }
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutEditor] Failed to add item:', error);
      }
    },
    [loadoutId, addItemToLoadout, allItems]
  );

  const removeItem = useCallback(
    async (itemId: string) => {
      try {
        await removeItemFromLoadout(loadoutId, itemId);
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutEditor] Failed to remove item:', error);
      }
    },
    [loadoutId, removeItemFromLoadout]
  );

  return {
    loadoutItems,
    searchQuery,
    setSearchQuery,
    filteredPickerItems,
    addItem,
    removeItem,
    totalWeight,
    baseWeight,
    categoryWeights,
    itemStates,
  };
}
