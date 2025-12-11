/**
 * useInventory Hook
 *
 * Feature: 002-inventory-gallery
 * Provides filtering and view state for the inventory gallery
 *
 * Updated: 005-loadout-management - Migrated to use zustand store
 * Updated: 045 - Removed mock data (auth is required for inventory access)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { ViewDensity, UseInventoryReturn } from '@/types/inventory';
import { useItems } from '@/hooks/useSupabaseStore';

// =============================================================================
// Session Storage Key
// =============================================================================

const VIEW_DENSITY_STORAGE_KEY = 'gearshack-view-density';

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

// =============================================================================
// Hook Implementation
// =============================================================================

export function useInventory(): UseInventoryReturn {
  // ---------------------------------------------------------------------------
  // Store Integration
  // ---------------------------------------------------------------------------
  const items = useItems();

  // ---------------------------------------------------------------------------
  // State: View Density with sessionStorage persistence
  // ---------------------------------------------------------------------------
  const [viewDensity, setViewDensityState] = useState<ViewDensity>(getInitialViewDensity);

  // Note: isLoading kept for future async data fetching
  const isLoading = false;

  // Persist view density to sessionStorage
  const setViewDensity = useCallback((density: ViewDensity) => {
    setViewDensityState(density);
    sessionStorage.setItem(VIEW_DENSITY_STORAGE_KEY, density);
  }, []);

  // ---------------------------------------------------------------------------
  // State: Filters
  // ---------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Derived: Filtered Items
  // ---------------------------------------------------------------------------
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search filter (case-insensitive, matches name or brand)
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.brand?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory =
        !categoryFilter || item.categoryId === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [items, searchQuery, categoryFilter]);

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

    // Derived State
    hasActiveFilters,
    itemCount,
    filteredCount,
  };
}
