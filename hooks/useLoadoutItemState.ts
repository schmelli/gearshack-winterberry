/**
 * useLoadoutItemState - Hook for managing worn/consumable item states
 *
 * Feature: 007-grand-polish-sprint
 * US4: Advanced Weight Calculations
 * Provides functions to toggle worn and consumable states for items in a loadout
 */

'use client';

import { useCallback } from 'react';
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
  toggleWorn: (itemId: string) => void;
  /** Toggle consumable state for an item */
  toggleConsumable: (itemId: string) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutItemState(loadoutId: string): UseLoadoutItemStateReturn {
  const loadout = useStore((state) =>
    state.loadouts.find((l) => l.id === loadoutId)
  );
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
    (itemId: string) => {
      const currentState = isWorn(itemId);
      setItemWorn(loadoutId, itemId, !currentState);
    },
    [loadoutId, isWorn, setItemWorn]
  );

  const toggleConsumable = useCallback(
    (itemId: string) => {
      const currentState = isConsumable(itemId);
      setItemConsumable(loadoutId, itemId, !currentState);
    },
    [loadoutId, isConsumable, setItemConsumable]
  );

  return {
    isWorn,
    isConsumable,
    toggleWorn,
    toggleConsumable,
  };
}
