/**
 * useWishlistActions Hook
 *
 * Feature: 048-shared-loadout-enhancement
 * Tasks: T039, T042, T043
 *
 * Provides wishlist management for shared loadout items including:
 * - Adding items to wishlist
 * - Checking if items are on wishlist
 * - Optimistic updates and error handling
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useGearItems } from '@/hooks/useGearItems';
import { addItemToWishlist } from '@/app/actions/sharing';
import { normalizeForMatch } from '@/lib/utils/matching';
import type { SharedGearItem } from '@/types/sharing';

// =============================================================================
// Types
// =============================================================================

export interface UseWishlistActionsReturn {
  /** Check if an item is on the user's wishlist */
  isOnWishlist: (brand: string | null, name: string) => boolean;
  /** Add an item to the wishlist */
  addToWishlist: (item: SharedGearItem) => Promise<{ success: boolean; error?: string }>;
  /** Set of item keys that are being added (loading state) */
  addingItems: Set<string>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * useWishlistActions (T039)
 *
 * Manages wishlist state and actions for shared loadout items.
 * Provides optimistic updates and tracks loading states.
 *
 * @param userId - Current user ID (null if not authenticated)
 * @param shareToken - The share token of the current shared loadout
 * @returns Wishlist check function, add function, and loading state
 */
export function useWishlistActions(
  userId: string | null,
  shareToken: string
): UseWishlistActionsReturn {
  const { items } = useGearItems(userId);
  const [addingItems, setAddingItems] = useState<Set<string>>(new Set());
  const [optimisticWishlist, setOptimisticWishlist] = useState<Set<string>>(new Set());

  // T042: Build wishlist set from user's items
  const wishlistSet = useMemo(() => {
    const set = new Set(
      items
        .filter(i => i.status === 'wishlist')
        .map(i => normalizeForMatch(i.brand, i.name))
    );

    // Add optimistic items
    optimisticWishlist.forEach(key => set.add(key));

    return set;
  }, [items, optimisticWishlist]);

  // T043: Check if item is on wishlist
  const isOnWishlist = useCallback((brand: string | null, name: string): boolean => {
    return wishlistSet.has(normalizeForMatch(brand, name));
  }, [wishlistSet]);

  // Add item to wishlist with optimistic update
  const addToWishlist = useCallback(async (
    item: SharedGearItem
  ): Promise<{ success: boolean; error?: string }> => {
    const itemKey = normalizeForMatch(item.brand, item.name);

    // Mark as adding
    setAddingItems(prev => new Set(prev).add(itemKey));

    // Optimistic update
    setOptimisticWishlist(prev => new Set(prev).add(itemKey));

    try {
      const result = await addItemToWishlist({
        item: {
          name: item.name,
          brand: item.brand,
          primaryImageUrl: item.primaryImageUrl,
          categoryId: item.categoryId,
          weightGrams: item.weightGrams,
          description: item.description,
        },
        sourceShareToken: shareToken,
      });

      if (!result.success) {
        // Revert optimistic update on failure
        setOptimisticWishlist(prev => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      }

      return result;
    } catch (error) {
      // Revert optimistic update on error
      setOptimisticWishlist(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });

      const message = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, error: message };
    } finally {
      // Remove from adding state
      setAddingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  }, [shareToken]);

  return {
    isOnWishlist,
    addToWishlist,
    addingItems,
  };
}
