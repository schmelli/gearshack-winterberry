/**
 * useInventory Hook
 *
 * Feature: 002-inventory-gallery
 * Provides filtering and view state for the inventory gallery
 *
 * Updated: 005-loadout-management - Migrated to use zustand store
 * Updated: 045 - Removed mock data (auth is required for inventory access)
 * Updated: 046-inventory-sorting - Added sorting with category grouping
 */

'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type {
  ViewDensity,
  UseInventoryReturn,
  SortOption,
  CategoryGroup,
} from '@/types/inventory';
import { DEFAULT_SORT_OPTION } from '@/types/inventory';
import { useItems } from '@/hooks/useSupabaseStore';
import { useCategories } from '@/hooks/useCategories';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';

// =============================================================================
// Session Storage Keys
// =============================================================================

const VIEW_DENSITY_STORAGE_KEY = 'gearshack-view-density';
const SORT_OPTION_STORAGE_KEY = 'gearshack-sort-option';

// =============================================================================
// Session Storage Helpers
// =============================================================================

/**
 * Get initial view density from session storage (client-side only)
 */
function getInitialViewDensity(): ViewDensity {
  if (typeof window === 'undefined') return 'standard';
  const stored = sessionStorage.getItem(VIEW_DENSITY_STORAGE_KEY);
  if (stored && ['compact', 'standard', 'detailed'].includes(stored)) {
    return stored as ViewDensity;
  }
  return 'standard';
}

/**
 * Get initial sort option from session storage (client-side only)
 */
function getInitialSortOption(): SortOption {
  if (typeof window === 'undefined') return DEFAULT_SORT_OPTION;
  const stored = sessionStorage.getItem(SORT_OPTION_STORAGE_KEY);
  if (stored && ['name', 'category', 'dateAdded'].includes(stored)) {
    return stored as SortOption;
  }
  return DEFAULT_SORT_OPTION;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInventory(): UseInventoryReturn {
  // ---------------------------------------------------------------------------
  // Store Integration
  // ---------------------------------------------------------------------------
  const items = useItems();
  const { getLabelById, getOptionsForLevel, isLoading: categoriesLoading, error: categoriesError, refresh: refreshCategories, categories } = useCategories();

  // ---------------------------------------------------------------------------
  // State: View Density with sessionStorage persistence
  // ---------------------------------------------------------------------------
  const [viewDensity, setViewDensityState] = useState<ViewDensity>(getInitialViewDensity);

  // Note: isLoading includes categories loading state
  const isLoading = categoriesLoading;

  // Persist view density to sessionStorage
  const setViewDensity = useCallback((density: ViewDensity) => {
    setViewDensityState(density);
    sessionStorage.setItem(VIEW_DENSITY_STORAGE_KEY, density);
  }, []);

  // ---------------------------------------------------------------------------
  // State: Sort Option with sessionStorage persistence (Feature 046)
  // ---------------------------------------------------------------------------
  const [sortOption, setSortOptionState] = useState<SortOption>(getInitialSortOption);

  // Persist sort option to sessionStorage
  const setSortOption = useCallback((option: SortOption) => {
    setSortOptionState(option);
    sessionStorage.setItem(SORT_OPTION_STORAGE_KEY, option);
  }, []);

  // ---------------------------------------------------------------------------
  // State: Filters
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Auto-retry logic for category loading errors (exponential backoff)
  // ---------------------------------------------------------------------------
  const retryCountRef = useRef(0);
  const retryTimerRef = useRef<NodeJS.Timeout | null>(null);
  const MAX_RETRIES = 3;

  useEffect(() => {
    if (categoriesError && retryCountRef.current < MAX_RETRIES) {
      // Calculate exponential backoff delay (1s, 2s, 4s)
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 10000);

      retryTimerRef.current = setTimeout(() => {
        refreshCategories();
        retryCountRef.current += 1;
      }, delay);

      return () => {
        if (retryTimerRef.current) {
          clearTimeout(retryTimerRef.current);
        }
      };
    }

    // Reset retry count on successful load
    if (!categoriesError && !categoriesLoading) {
      retryCountRef.current = 0;
    }
  }, [categoriesError, categoriesLoading, refreshCategories]);

  // ---------------------------------------------------------------------------
  // Derived: Filtered and Sorted Items (Feature 046)
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    // If categories are still loading or failed to load, return unsorted items
    // to avoid race condition (getLabelById may return 'Uncategorized' for valid IDs)
    if (categoriesLoading || categoriesError) {
      return items;
    }

    // Step 1: Filter items
    const filtered = items.filter((item) => {
      // Search filter (case-insensitive, matches name or brand)
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter (Cascading Category Refactor: now works with productTypeId)
      const matchesCategory = !categoryFilter || (() => {
        if (!item.productTypeId) return false;

        // Get the parent categoryId (level 1) for this item's productTypeId (level 3)
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

        case 'category':
          // Sort by category label, then by name within category (Cascading Category Refactor: uses productTypeId)
          const catIdA = a.productTypeId ? getParentCategoryIds(a.productTypeId, categories).categoryId : null;
          const catIdB = b.productTypeId ? getParentCategoryIds(b.productTypeId, categories).categoryId : null;
          const catLabelA = getLabelById(catIdA);
          const catLabelB = getLabelById(catIdB);
          const catCompare = catLabelA.localeCompare(catLabelB, undefined, { sensitivity: 'base' });
          if (catCompare !== 0) return catCompare;
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

        case 'dateAdded':
        default:
          // Newest first
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return sorted;
  }, [items, searchQuery, categoryFilter, sortOption, getLabelById, categoriesLoading, categoriesError, categories]);

  // ---------------------------------------------------------------------------
  // Derived: Grouped Items by Category (Feature 046)
  // ---------------------------------------------------------------------------
  const groupedItems = useMemo<CategoryGroup[]>(() => {
    if (sortOption !== 'category') {
      return [];
    }

    // Group items by categoryId (Cascading Category Refactor: derived from productTypeId)
    const groups = new Map<string | null, CategoryGroup>();

    for (const item of filteredItems) {
      // Derive category (level 1) from productTypeId (level 3)
      const catId = item.productTypeId
        ? getParentCategoryIds(item.productTypeId, categories).categoryId
        : null;

      if (!groups.has(catId)) {
        groups.set(catId, {
          categoryId: catId,
          categoryLabel: getLabelById(catId),
          items: [],
        });
      }
      groups.get(catId)!.items.push(item);
    }

    // Convert to array and sort by category label
    return Array.from(groups.values()).sort((a, b) => {
      // Put uncategorized at the end
      if (a.categoryId === null) return 1;
      if (b.categoryId === null) return -1;
      return a.categoryLabel.localeCompare(b.categoryLabel, undefined, { sensitivity: 'base' });
    });
  }, [filteredItems, sortOption, getLabelById, categories]);

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived State
  // ---------------------------------------------------------------------------
  const hasActiveFilters = searchQuery !== '' || categoryFilter !== null;
  const itemCount = items.length;
  const filteredCount = filteredItems.length;

  // Get category options for filtering
  const categoryOptions = useMemo(() => getOptionsForLevel(1), [getOptionsForLevel]);

  return {
    // Data
    items,
    filteredItems,
    isLoading,

    // View Density
    viewDensity,
    setViewDensity,

    // Filters
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    clearFilters,

    // Sorting (Feature 046)
    sortOption,
    setSortOption,
    groupedItems,

    // Derived State
    hasActiveFilters,
    itemCount,
    filteredCount,

    // Category utilities
    getCategoryLabel: getLabelById,
    categoryOptions,
    refreshCategories,

    // Error state
    categoriesError,
  };
}
