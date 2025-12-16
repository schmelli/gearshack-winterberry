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
  /** Timestamp when categories were last fetched (for TTL) */
  _lastFetchedAt: number | null;

  /** Fetch categories from Supabase */
  fetchCategories: () => Promise<void>;
  /** Force refresh categories (bypasses cache) */
  refresh: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

/** Cache TTL in milliseconds (24 hours) */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// =============================================================================
// Store Implementation
// =============================================================================

export const useCategoriesStore = create<CategoriesStore>((set, get) => ({
  // State
  categories: [],
  isLoading: false,
  error: null,
  _initialized: false,
  _lastFetchedAt: null,

  // Actions
  fetchCategories: async () => {
    const { _initialized, _lastFetchedAt, isLoading } = get();

    // Prevent redundant fetches if already loading
    if (isLoading) return;

    // Check if cache is still valid (within TTL)
    if (_initialized && _lastFetchedAt) {
      const cacheAge = Date.now() - _lastFetchedAt;
      if (cacheAge < CACHE_TTL_MS) {
        // Cache hit - skip fetch
        return;
      }
    }

    set({ isLoading: true, error: null });

    try {
      const data = await fetchCategories();
      set({
        categories: data,
        isLoading: false,
        _initialized: true,
        _lastFetchedAt: Date.now(),
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      // Keep existing categories on error (preserve stale data)
      set({
        error: message,
        isLoading: false,
        // Don't clear categories - keep stale data visible
      });
      console.error('[useCategoriesStore] fetchCategories error:', err);
    }
  },

  refresh: async () => {
    const { isLoading } = get();

    // Prevent redundant fetches if already loading
    if (isLoading) return;

    // Force refresh by clearing cache flags
    set({ _initialized: false, _lastFetchedAt: null });

    // Then fetch
    await get().fetchCategories();
  },
}));
