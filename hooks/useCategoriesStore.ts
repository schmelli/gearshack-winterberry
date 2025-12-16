/**
 * useCategoriesStore - Zustand Store for Categories
 *
 * Feature: 043-ontology-i18n-import (Performance Optimization)
 *
 * Provides a global Zustand store for categories to prevent redundant fetches.
 * Caches categories in memory and shares them across all components.
 */

'use client';

import { create } from 'zustand';
import { fetchCategories } from '@/lib/supabase/categories';
import type { Category } from '@/types/category';

// =============================================================================
// Types
// =============================================================================

interface CategoriesStore {
  /** All categories */
  categories: Category[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Indicates if categories have been fetched at least once */
  _initialized: boolean;

  /** Fetch categories from Supabase */
  fetchCategories: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  // State
  categories: [],
  isLoading: false,
  error: null,
  _initialized: false,

  // Actions
  fetchCategories: async () => {
    const { _initialized, isLoading } = get();

    // Prevent redundant fetches if already loading
    if (isLoading) return;

    // Skip fetch if already initialized (cache hit)
    if (_initialized) return;

    set({ isLoading: true, error: null });

    try {
      const data = await fetchCategories();
      set({
        categories: data,
        isLoading: false,
        _initialized: true,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      set({
        error: message,
        isLoading: false,
      });
      console.error('[useCategoriesStore] fetchCategories error:', err);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
