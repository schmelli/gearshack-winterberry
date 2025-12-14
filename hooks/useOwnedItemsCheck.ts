/**
 * useOwnedItemsCheck Hook
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T035 - User Story 5 - Owned Items Indicator
 *
 * Checks if items from a shared loadout match items the current user owns
 * in their inventory. Uses brand + name matching via normalizeForMatch utility.
 */

'use client';

import { useMemo, useCallback } from 'react';
import { useGearItems } from './useGearItems';
import { normalizeForMatch } from '@/lib/utils/matching';

// =============================================================================
// Types
// =============================================================================

export interface UseOwnedItemsCheckReturn {
  /** Function to check if a given brand+name combination is owned */
  checkOwned: (brand: string | null, name: string) => boolean;
  /** Total count of owned items (status === 'own') */
  ownedCount: number;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Checks if items from a shared loadout are owned by the current user.
 *
 * @param userId - The current user's ID (null if not authenticated)
 * @returns Object with checkOwned function and ownedCount
 *
 * @example
 * const { checkOwned, ownedCount } = useOwnedItemsCheck(userId);
 * const isOwned = checkOwned('Osprey', 'Atmos AG 65');
 */
export function useOwnedItemsCheck(userId: string | null): UseOwnedItemsCheckReturn {
  // Fetch user's gear items using existing hook
  const { items } = useGearItems(userId);

  // Create Set of normalized brand|name keys for owned items
  const ownedSet = useMemo(() => {
    return new Set(
      items
        .filter(i => i.status === 'own')
        .map(i => normalizeForMatch(i.brand, i.name))
    );
  }, [items]);

  // Callback to check if a brand+name combination is owned
  const checkOwned = useCallback((brand: string | null, name: string): boolean => {
    return ownedSet.has(normalizeForMatch(brand, name));
  }, [ownedSet]);

  return {
    checkOwned,
    ownedCount: ownedSet.size,
  };
}
