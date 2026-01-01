/**
 * useLoadoutItemState - Hook for managing worn/consumable item states
 *
 * Feature: 007-grand-polish-sprint
 * US4: Advanced Weight Calculations
 * Provides functions to toggle worn and consumable states for items in a loadout
 *
 * Feature: 013-gear-quantity-tracking
 * Phase 5: Loadout Quantity Validation
 * Provides quantity validation before adding items to prevent over-allocation
 */

'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useStore } from '@/hooks/useSupabaseStore';

// =============================================================================
// Types
// =============================================================================

interface UseLoadoutItemStateReturn {
  /** Get worn state for an item */
  isWorn: (itemId: string) => boolean;
  /** Get consumable state for an item */
  isConsumable: (itemId: string) => boolean;
  /** Toggle worn state for an item */
  toggleWorn: (itemId: string) => Promise<void>;
  /** Toggle consumable state for an item */
  toggleConsumable: (itemId: string) => Promise<void>;
  /** Check if item can be added based on available quantity (Feature: 013) */
  canAddItem: (itemId: string) => boolean;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutItemState(loadoutId: string): UseLoadoutItemStateReturn {
  const loadout = useStore((state) =>
    state.loadouts.find((l) => l.id === loadoutId)
  );
  const items = useStore((state) => state.items);
  const setItemWorn = useStore((state) => state.setItemWorn);
  const setItemConsumable = useStore((state) => state.setItemConsumable);

  const isWorn = useCallback(
    (itemId: string): boolean => {
      const state = loadout?.itemStates.find((s) => s.itemId === itemId);
      return state?.isWorn ?? false;
    },
    [loadout?.itemStates]
  );

  const isConsumable = useCallback(
    (itemId: string): boolean => {
      const state = loadout?.itemStates.find((s) => s.itemId === itemId);
      return state?.isConsumable ?? false;
    },
    [loadout?.itemStates]
  );

  const toggleWorn = useCallback(
    async (itemId: string) => {
      const currentState = isWorn(itemId);
      try {
        await setItemWorn(loadoutId, itemId, !currentState);
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutItemState] Failed to toggle worn state:', error);
      }
    },
    [loadoutId, isWorn, setItemWorn]
  );

  const toggleConsumable = useCallback(
    async (itemId: string) => {
      const currentState = isConsumable(itemId);
      try {
        await setItemConsumable(loadoutId, itemId, !currentState);
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutItemState] Failed to toggle consumable state:', error);
      }
    },
    [loadoutId, isConsumable, setItemConsumable]
  );

  /**
   * Check if an item can be added to the loadout based on available quantity
   * Feature: 013-gear-quantity-tracking
   *
   * For MVP scope: Validates only within current loadout (cross-loadout tracking out of scope)
   *
   * @param itemId - ID of the gear item to check
   * @returns true if item can be added, false otherwise
   */
  const canAddItem = useCallback(
    (itemId: string): boolean => {
      // Get the gear item from inventory
      const gearItem = items.find((item) => item.id === itemId);
      if (!gearItem) {
        toast.error('Item not found in inventory');
        return false;
      }

      // Check if item is already in loadout
      const isInLoadout = loadout?.itemIds.includes(itemId) ?? false;

      if (isInLoadout) {
        // Item already in loadout - current system doesn't support quantity increment
        // Show error that all available quantity is already in use
        toast.error('Cannot add more items', {
          description: `This item is already in the loadout. Only ${gearItem.quantity} available in inventory.`,
        });
        return false;
      }

      // Check if item has quantity > 0 in inventory
      const availableQuantity = gearItem.quantity || 1; // Default to 1 for backward compatibility

      if (availableQuantity < 1) {
        toast.error('No items available', {
          description: 'This item has no available quantity in inventory.',
        });
        return false;
      }

      // Item can be added
      return true;
    },
    [items, loadout]
  );

  return {
    isWorn,
    isConsumable,
    toggleWorn,
    toggleConsumable,
    canAddItem,
  };
}
