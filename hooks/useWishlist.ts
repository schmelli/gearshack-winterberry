/**
 * useWishlist Hook
 *
 * Feature: 049-wishlist-view
 * Tasks: T019-T023
 *
 * Provides state management, filtering, and CRUD operations for wishlist items.
 * Follows the same patterns as useInventory for consistency.
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import {
  fetchWishlistItems,
  addWishlistItem,
  updateWishlistItem,
  deleteWishlistItem,
  moveWishlistItemToInventory,
  checkWishlistDuplicate,
  DuplicateError,
} from '@/lib/supabase/wishlist-queries';
import { gearItemFromDb } from '@/lib/supabase/transformers';
import type {
  WishlistItem,
  UseWishlistReturn,
  WishlistSortOption,
  AddWishlistItemParams,
  UpdateWishlistItemParams,
} from '@/types/wishlist';
import type { Tables } from '@/types/database';
import { useCategories } from '@/hooks/useCategories';
import { useSupabaseStore } from '@/hooks/useSupabaseStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';

// =============================================================================
// Session Storage Keys
// =============================================================================

const WISHLIST_SORT_OPTION_STORAGE_KEY = 'gearshack-wishlist-sort-option';

// =============================================================================
// Session Storage Helpers
// =============================================================================

/**
 * Get initial sort option from session storage (client-side only)
 */
function getInitialSortOption(): WishlistSortOption {
  if (typeof window === 'undefined') return 'dateAdded';
  const stored = sessionStorage.getItem(WISHLIST_SORT_OPTION_STORAGE_KEY);
  if (
    stored &&
    ['dateAdded', 'dateAddedOldest', 'name', 'nameDesc', 'category', 'weight'].includes(stored)
  ) {
    return stored as WishlistSortOption;
  }
  return 'dateAdded';
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useWishlist(): UseWishlistReturn {
  const t = useTranslations('Wishlist.actions');

  // ---------------------------------------------------------------------------
  // State: Wishlist Items
  // ---------------------------------------------------------------------------
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // State: Filters and Sort
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortOption, setSortOptionState] = useState<WishlistSortOption>(getInitialSortOption);

  // ---------------------------------------------------------------------------
  // Categories Integration
  // ---------------------------------------------------------------------------
  const { getLabelById, isLoading: categoriesLoading, categories } = useCategories();

  // ---------------------------------------------------------------------------
  // Zustand Store for Inventory Sync (Feature 049 US3)
  // ---------------------------------------------------------------------------
  const inventoryItems = useSupabaseStore((state) => state.items);
  const setRemoteGearItems = useSupabaseStore((state) => state.setRemoteGearItems);

  // ---------------------------------------------------------------------------
  // Persist Sort Option to SessionStorage
  // ---------------------------------------------------------------------------
  const setSortOption = useCallback((option: WishlistSortOption) => {
    setSortOptionState(option);
    sessionStorage.setItem(WISHLIST_SORT_OPTION_STORAGE_KEY, option);
  }, []);

  // ---------------------------------------------------------------------------
  // Fetch Wishlist Items on Mount
  // ---------------------------------------------------------------------------
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const items = await fetchWishlistItems();
      setWishlistItems(items);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wishlist';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // ---------------------------------------------------------------------------
  // CRUD Actions
  // ---------------------------------------------------------------------------

  /**
   * Add item to wishlist with duplicate detection
   */
  const addToWishlist = useCallback(
    async (item: Omit<WishlistItem, 'id' | 'status' | 'createdAt' | 'updatedAt'>) => {
      try {
        const newItem = await addWishlistItem(item as AddWishlistItemParams);
        setWishlistItems((prev) => [newItem, ...prev]);
        toast.success(t('addedToWishlist'));
      } catch (err) {
        if (err instanceof DuplicateError) {
          toast.warning(t('alreadyInWishlist'));
        } else {
          const message = err instanceof Error ? err.message : 'Failed to add to wishlist';
          toast.error(message);
        }
        throw err;
      }
    },
    [t]
  );

  /**
   * Remove item from wishlist
   */
  const removeFromWishlist = useCallback(async (itemId: string) => {
    try {
      await deleteWishlistItem(itemId);
      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));
      toast.success(t('removedFromWishlist'));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to remove item';
      toast.error(message);
      throw err;
    }
  }, [t]);

  /**
   * Update wishlist item
   */
  const updateWishlistItemAction = useCallback(
    async (itemId: string, updates: Partial<WishlistItem>) => {
      try {
        const updatedItem = await updateWishlistItem(itemId, updates as UpdateWishlistItemParams);
        setWishlistItems((prev) => prev.map((item) => (item.id === itemId ? updatedItem : item)));
        toast.success(t('itemUpdated'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to update item';
        toast.error(message);
        throw err;
      }
    },
    [t]
  );

  /**
   * Move item from wishlist to inventory
   * Feature 049 US3: Also updates zustand store with the moved item
   */
  const moveToInventory = useCallback(async (itemId: string) => {
    try {
      // Get the item name before moving (for toast message)
      const movedItem = wishlistItems.find((item) => item.id === itemId);
      const itemName = movedItem?.name ?? 'Item';

      // Move item in database (returns the updated database row)
      const updatedDbRow = await moveWishlistItemToInventory(itemId);

      // Remove from local wishlist state
      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));

      // Feature 049 US3: Add the moved item to the inventory zustand store
      // Transform the database row to GearItem and add to inventory
      const transformedItem = gearItemFromDb(updatedDbRow as Tables<'gear_items'>);
      // setRemoteGearItems expects an array, not a function updater
      setRemoteGearItems([transformedItem, ...inventoryItems]);

      toast.success(t('movedToInventory', { name: itemName }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to move item';
      toast.error(message);
      throw err;
    }
  }, [wishlistItems, inventoryItems, setRemoteGearItems, t]);

  // ---------------------------------------------------------------------------
  // Duplicate Detection Helper
  // ---------------------------------------------------------------------------
  const checkDuplicate = useCallback(
    async (brand: string | null, modelNumber: string | null): Promise<WishlistItem | null> => {
      try {
        return await checkWishlistDuplicate(brand, modelNumber);
      } catch (err) {
        console.error('Duplicate check failed:', err);
        return null;
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Filtered and Sorted Items
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    // If categories are still loading, return unsorted items
    if (categoriesLoading) {
      return wishlistItems;
    }

    // Step 1: Filter items
    const filtered = wishlistItems.filter((item) => {
      // Search filter (case-insensitive, matches name or brand)
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter (Cascading Category Refactor: derive categoryId from productTypeId)
      const matchesCategory = !categoryFilter || (() => {
        const { categoryId } = getParentCategoryIds(item.productTypeId, categories);
        return categoryId === categoryFilter;
      })();

      return matchesSearch && matchesCategory;
    });

    // Step 2: Sort items based on sortOption
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOption) {
        case 'name':
          // Alphabetical sort (A-Z)
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

        case 'nameDesc':
          // Reverse alphabetical sort (Z-A)
          return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });

        case 'category':
          // Sort by category label, then by name within category (Cascading Category Refactor)
          const catIdA = getParentCategoryIds(a.productTypeId, categories).categoryId;
          const catIdB = getParentCategoryIds(b.productTypeId, categories).categoryId;
          const catLabelA = getLabelById(catIdA);
          const catLabelB = getLabelById(catIdB);
          const catCompare = catLabelA.localeCompare(catLabelB, undefined, { sensitivity: 'base' });
          if (catCompare !== 0) return catCompare;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

        case 'weight':
          // Sort by weight (lightest first), nulls last
          if (a.weightGrams === null && b.weightGrams === null) return 0;
          if (a.weightGrams === null) return 1;
          if (b.weightGrams === null) return -1;
          return a.weightGrams - b.weightGrams;

        case 'dateAddedOldest':
          // Oldest first
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();

        case 'dateAdded':
        default:
          // Newest first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [wishlistItems, searchQuery, categoryFilter, sortOption, getLabelById, categoriesLoading, categories]);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const itemCount = wishlistItems.length;
  const filteredCount = filteredItems.length;
  const hasActiveFilters = searchQuery !== '' || categoryFilter !== null;

  // ---------------------------------------------------------------------------
  // Filter Actions
  // ---------------------------------------------------------------------------
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Return Hook Interface
  // ---------------------------------------------------------------------------
  return {
    // Data
    wishlistItems,
    filteredItems,
    isLoading,
    error,

    // Actions
    addToWishlist,
    removeFromWishlist,
    updateWishlistItem: updateWishlistItemAction,
    moveToInventory,
    refresh,

    // Filters
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    sortOption,
    setSortOption,
    clearFilters,

    // Derived state
    itemCount,
    filteredCount,
    hasActiveFilters,

    // Duplicate detection
    checkDuplicate,
  };
}
