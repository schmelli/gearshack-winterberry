/**
 * useMerchantLoadoutsPublic Hook
 *
 * Feature: 053-merchant-integration
 * Task: T021
 *
 * Provides public browsing of merchant loadouts.
 * Handles filtering, sorting, pagination, and detail views.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  fetchPublishedLoadouts,
  fetchFeaturedLoadouts,
  fetchLoadoutBySlug,
} from '@/lib/supabase/merchant-loadout-queries';
import type {
  MerchantLoadoutCard,
  MerchantLoadoutDetail,
  MerchantLoadoutFilters,
  MerchantLoadoutSort,
} from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface LoadoutBrowseState {
  loadouts: MerchantLoadoutCard[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
}

export interface UseMerchantLoadoutsPublicReturn {
  /** Current browse state */
  state: LoadoutBrowseState;
  /** Current filters */
  filters: MerchantLoadoutFilters;
  /** Current sort */
  sort: MerchantLoadoutSort;
  /** Update filters (resets to page 1) */
  setFilters: (filters: Partial<MerchantLoadoutFilters>) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Update sort */
  setSort: (sort: MerchantLoadoutSort) => void;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Refresh data */
  refresh: () => Promise<void>;
}

export interface UseFeaturedLoadoutsReturn {
  loadouts: MerchantLoadoutCard[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export interface UseLoadoutDetailReturn {
  loadout: MerchantLoadoutDetail | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 12;

const DEFAULT_FILTERS: MerchantLoadoutFilters = {};

const DEFAULT_SORT: MerchantLoadoutSort = {
  field: 'createdAt',
  direction: 'desc',
};

// =============================================================================
// Main Browse Hook
// =============================================================================

export function useMerchantLoadoutsPublic(
  initialFilters: MerchantLoadoutFilters = {},
  initialSort: MerchantLoadoutSort = DEFAULT_SORT
): UseMerchantLoadoutsPublicReturn {
  const [state, setState] = useState<LoadoutBrowseState>({
    loadouts: [],
    total: 0,
    page: 1,
    pageSize: DEFAULT_PAGE_SIZE,
    totalPages: 0,
    isLoading: true,
    error: null,
  });

  const [filters, setFiltersState] = useState<MerchantLoadoutFilters>({
    ...DEFAULT_FILTERS,
    ...initialFilters,
  });

  const [sort, setSortState] = useState<MerchantLoadoutSort>(initialSort);

  // Fetch loadouts
  const fetchLoadouts = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const offset = (state.page - 1) * state.pageSize;
      const { loadouts, total } = await fetchPublishedLoadouts({
        filters,
        sort,
        limit: state.pageSize,
        offset,
      });

      setState((prev) => ({
        ...prev,
        loadouts,
        total,
        totalPages: Math.ceil(total / prev.pageSize),
        isLoading: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadouts';
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, [filters, sort, state.page, state.pageSize]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    // Data fetching in useEffect is a valid pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchLoadouts();
  }, [fetchLoadouts]);

  // Update filters (resets to page 1)
  const setFilters = useCallback((newFilters: Partial<MerchantLoadoutFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFiltersState(DEFAULT_FILTERS);
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Update sort
  const setSort = useCallback((newSort: MerchantLoadoutSort) => {
    setSortState(newSort);
    setState((prev) => ({ ...prev, page: 1 }));
  }, []);

  // Go to specific page
  const goToPage = useCallback((page: number) => {
    setState((prev) => ({
      ...prev,
      page: Math.max(1, Math.min(page, prev.totalPages || 1)),
    }));
  }, []);

  return {
    state,
    filters,
    sort,
    setFilters,
    clearFilters,
    setSort,
    goToPage,
    refresh: fetchLoadouts,
  };
}

// =============================================================================
// Featured Loadouts Hook
// =============================================================================

export function useFeaturedLoadouts(limit = 6): UseFeaturedLoadoutsReturn {
  const [loadouts, setLoadouts] = useState<MerchantLoadoutCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeatured = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchFeaturedLoadouts(limit);
      setLoadouts(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load featured loadouts';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [limit]);

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  return {
    loadouts,
    isLoading,
    error,
    refresh: fetchFeatured,
  };
}

// =============================================================================
// Loadout Detail Hook
// =============================================================================

export function useLoadoutDetail(slug: string | null): UseLoadoutDetailReturn {
  const [loadout, setLoadout] = useState<MerchantLoadoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!slug) {
      setLoadout(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchLoadoutBySlug(slug);
      setLoadout(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadout';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return {
    loadout,
    isLoading,
    error,
    refresh: fetchDetail,
  };
}

// =============================================================================
// Filter Options Hook
// =============================================================================

/**
 * Returns available filter options based on current loadouts
 */
export function useLoadoutFilterOptions() {
  // These would ideally come from a separate API endpoint
  // For now, return static options based on the data model
  const tripTypes = useMemo(
    () => [
      { value: 'day_hike', label: 'Day Hike' },
      { value: 'backpacking', label: 'Backpacking' },
      { value: 'thru_hike', label: 'Thru-Hike' },
      { value: 'ultralight', label: 'Ultralight' },
      { value: 'winter', label: 'Winter Camping' },
      { value: 'bikepacking', label: 'Bikepacking' },
      { value: 'kayaking', label: 'Kayaking' },
    ],
    []
  );

  const seasons = useMemo(
    () => [
      { value: 'spring', label: 'Spring' },
      { value: 'summer', label: 'Summer' },
      { value: 'fall', label: 'Fall' },
      { value: 'winter', label: 'Winter' },
      { value: '3-season', label: '3-Season' },
      { value: '4-season', label: '4-Season' },
    ],
    []
  );

  const sortOptions = useMemo(
    () => [
      { value: 'createdAt-desc', label: 'Newest First' },
      { value: 'createdAt-asc', label: 'Oldest First' },
      { value: 'bundlePrice-asc', label: 'Price: Low to High' },
      { value: 'bundlePrice-desc', label: 'Price: High to Low' },
      { value: 'viewCount-desc', label: 'Most Popular' },
      { value: 'name-asc', label: 'Name: A-Z' },
    ],
    []
  );

  return { tripTypes, seasons, sortOptions };
}

// =============================================================================
// Comparison Hook
// =============================================================================

/**
 * Hook for comparing merchant loadout with user's own loadout
 */
export function useLoadoutComparison(_merchantLoadoutId: string | null) {
  const [comparisonLoadoutId, setComparisonLoadoutId] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  const startComparison = useCallback((loadoutId: string) => {
    setComparisonLoadoutId(loadoutId);
    setIsComparing(true);
  }, []);

  const endComparison = useCallback(() => {
    setComparisonLoadoutId(null);
    setIsComparing(false);
  }, []);

  return {
    comparisonLoadoutId,
    isComparing,
    startComparison,
    endComparison,
  };
}
