/**
 * useShakedownGearFilters Hook
 *
 * Feature: Shakedown Detail Enhancement
 *
 * Provides search, filter, and sort functionality for gear items
 * displayed in a shakedown detail view.
 *
 * Features:
 * - Debounced text search (300ms) across name and brand
 * - Category filtering
 * - Status filtering (worn/consumable/base weight)
 * - Multiple sort options (name, weight, category)
 * - Active filter detection and clear all
 */

'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';
import type { ShakedownGearItem } from './useShakedown';
import type { LoadoutItemState } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

export type GearSortOption = 'name' | 'weight-asc' | 'weight-desc' | 'category';
export type GearStatusFilter = 'all' | 'worn' | 'consumable' | 'base';

export interface UseShakedownGearFiltersOptions {
  /** Initial gear items to filter */
  gearItems: ShakedownGearItem[];
  /** Item states from loadout (worn/consumable flags) */
  itemStates?: LoadoutItemState[];
  /** Debounce delay in ms (default: 300) */
  debounceMs?: number;
}

export interface UseShakedownGearFiltersReturn {
  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  debouncedSearchQuery: string;

  // Category filter
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  availableCategories: string[];

  // Sort
  sortOption: GearSortOption;
  setSortOption: (option: GearSortOption) => void;

  // Status filter
  statusFilter: GearStatusFilter;
  setStatusFilter: (status: GearStatusFilter) => void;

  // Results
  filteredItems: ShakedownGearItem[];
  totalCount: number;
  filteredCount: number;

  // Utilities
  hasActiveFilters: boolean;
  clearFilters: () => void;
}

// =============================================================================
// Custom Hook for Debounce
// =============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useShakedownGearFilters({
  gearItems,
  itemStates = [],
  debounceMs = 300,
}: UseShakedownGearFiltersOptions): UseShakedownGearFiltersReturn {
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, debounceMs);

  // Filter states
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<GearStatusFilter>('all');

  // Sort state
  const [sortOption, setSortOption] = useState<GearSortOption>('name');

  // Create item state lookup for O(1) access
  const itemStateMap = useMemo(() => {
    const map: Record<string, LoadoutItemState> = {};
    itemStates.forEach((state) => {
      map[state.itemId] = state;
    });
    return map;
  }, [itemStates]);

  // Extract available categories from gear items
  const availableCategories = useMemo(() => {
    const categories = new Set<string>();
    gearItems.forEach((item) => {
      if (item.productTypeId) {
        categories.add(item.productTypeId);
      }
    });
    return Array.from(categories).sort();
  }, [gearItems]);

  // Filter and sort items
  const filteredItems = useMemo(() => {
    let result = [...gearItems];

    // Apply text search
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter((item) => {
        const name = item.name.toLowerCase();
        const brand = item.brand?.toLowerCase() || '';
        const description = item.description?.toLowerCase() || '';
        return name.includes(query) || brand.includes(query) || description.includes(query);
      });
    }

    // Apply category filter
    if (categoryFilter) {
      result = result.filter((item) => item.productTypeId === categoryFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((item) => {
        const state = itemStateMap[item.id];
        if (!state) {
          // Items without state are considered base weight
          return statusFilter === 'base';
        }
        switch (statusFilter) {
          case 'worn':
            return state.isWorn === true;
          case 'consumable':
            return state.isConsumable === true;
          case 'base':
            return !state.isWorn && !state.isConsumable;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    result.sort((a, b) => {
      switch (sortOption) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'weight-asc':
          return (a.weightGrams ?? 0) - (b.weightGrams ?? 0);
        case 'weight-desc':
          return (b.weightGrams ?? 0) - (a.weightGrams ?? 0);
        case 'category':
          const catA = a.productTypeId || '';
          const catB = b.productTypeId || '';
          return catA.localeCompare(catB) || a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });

    return result;
  }, [gearItems, debouncedSearchQuery, categoryFilter, statusFilter, sortOption, itemStateMap]);

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      searchQuery.trim().length > 0 ||
      categoryFilter !== null ||
      statusFilter !== 'all' ||
      sortOption !== 'name'
    );
  }, [searchQuery, categoryFilter, statusFilter, sortOption]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setCategoryFilter(null);
    setStatusFilter('all');
    setSortOption('name');
  }, []);

  return {
    // Search
    searchQuery,
    setSearchQuery,
    debouncedSearchQuery,

    // Category filter
    categoryFilter,
    setCategoryFilter,
    availableCategories,

    // Sort
    sortOption,
    setSortOption,

    // Status filter
    statusFilter,
    setStatusFilter,

    // Results
    filteredItems,
    totalCount: gearItems.length,
    filteredCount: filteredItems.length,

    // Utilities
    hasActiveFilters,
    clearFilters,
  };
}

export default useShakedownGearFilters;
