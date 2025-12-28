/**
 * useLoadoutItemState - Hook for managing worn/consumable item states
 *
 * Feature: 007-grand-polish-sprint
 * US4: Advanced Weight Calculations
 * Provides functions to toggle worn and consumable states for items in a loadout
 */

'use client';

import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('Loadouts.errors');

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
        toast.error(t('updateWornStateFailed'));
        console.error('[LoadoutItemState] Failed to toggle worn state:', error);
      }
    },
    [loadoutId, isWorn, setItemWorn, t]
  );

  const toggleConsumable = useCallback(
    async (itemId: string) => {
      const currentState = isConsumable(itemId);
      try {
        await setItemConsumable(loadoutId, itemId, !currentState);
      } catch (error) {
        toast.error(t('updateConsumableStateFailed'));
        console.error('[LoadoutItemState] Failed to toggle consumable state:', error);
      }
    },
    [loadoutId, isConsumable, setItemConsumable, t]
  );

  return {
    isWorn,
    isConsumable,
    toggleWorn,
    toggleConsumable,
  };
}
