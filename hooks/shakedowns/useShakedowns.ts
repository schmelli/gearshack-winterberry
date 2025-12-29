'use client';

/**
 * useShakedowns Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T023
 *
 * Manages the shakedowns feed with:
 * - Cursor-based pagination (20 items per page)
 * - Sort options (recent, popular, unanswered)
 * - Filter options (status, experienceLevel, search, friendsFirst)
 * - Optimistic update support for prepending new shakedowns
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  ShakedownWithAuthor,
  ShakedownStatus,
  ExperienceLevel,
  PaginatedShakedowns,
} from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

export type SortOption = 'recent' | 'popular' | 'unanswered';

export interface ShakedownFilters {
  status?: ShakedownStatus;
  experienceLevel?: ExperienceLevel;
  search?: string;
  friendsFirst?: boolean;
}

export interface UseShakedownsReturn {
  shakedowns: ShakedownWithAuthor[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  sort: SortOption;
  setSort: (sort: SortOption) => void;
  filters: ShakedownFilters;
  setFilters: (filters: ShakedownFilters) => void;
  /** Prepend a newly created shakedown to the feed (for optimistic updates) */
  prependShakedown: (shakedown: ShakedownWithAuthor) => void;
  /** Replace a temporary shakedown with the real one from the server */
  replaceShakedown: (tempId: string, shakedown: ShakedownWithAuthor) => void;
  /** Remove a shakedown from the feed (e.g., after deletion or failed creation) */
  removeShakedown: (id: string) => void;
}

// =============================================================================
// Constants
// =============================================================================

const ITEMS_PER_PAGE = 20;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Builds the query string for the shakedowns API
 */
function buildQueryString(
  sort: SortOption,
  filters: ShakedownFilters,
  cursor?: string | null
): string {
  const params = new URLSearchParams();

  params.set('limit', String(ITEMS_PER_PAGE));
  params.set('sort', sort);

  if (cursor) {
    params.set('cursor', cursor);
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.experienceLevel) {
    params.set('experience', filters.experienceLevel);
  }

  if (filters.search?.trim()) {
    params.set('search', filters.search.trim());
  }

  if (filters.friendsFirst) {
    params.set('friendsFirst', 'true');
  }

  return params.toString();
}

/**
 * Fetches shakedowns from the API
 */
async function fetchShakedownsFromApi(
  sort: SortOption,
  filters: ShakedownFilters,
  cursor?: string | null
): Promise<PaginatedShakedowns> {
  const queryString = buildQueryString(sort, filters, cursor);
  const response = await fetch(`/api/shakedowns?${queryString}`);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to fetch shakedowns: ${response.status}`);
  }

  return response.json();
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useShakedowns(
  initialSort: SortOption = 'recent',
  initialFilters: ShakedownFilters = {}
): UseShakedownsReturn {
  // Data state
  const [shakedowns, setShakedowns] = useState<ShakedownWithAuthor[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [cursor, setCursor] = useState<string | null>(null);

  // Sort and filter state
  const [sort, setSort] = useState<SortOption>(initialSort);
  const [filters, setFilters] = useState<ShakedownFilters>(initialFilters);

  // Loading state (individual states for better lint compatibility)
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Track current fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  /**
   * Fetches the initial page of shakedowns
   * Resets state and fetches fresh data
   */
  const fetchInitial = useCallback(async () => {
    const fetchId = ++fetchIdRef.current;

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);

    try {
      const data = await fetchShakedownsFromApi(sort, filters, null);

      // Only update if this is still the current fetch
      if (fetchId !== fetchIdRef.current) return;

      setShakedowns(data.shakedowns);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      // Only update if this is still the current fetch
      if (fetchId !== fetchIdRef.current) return;

      const fetchError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(fetchError);
    } finally {
      setIsLoading(false);
    }
  }, [sort, filters]);

  /**
   * Loads the next page of shakedowns
   * Appends to existing data
   */
  const loadMore = useCallback(async () => {
    // Don't load more if already loading, no more items, or no cursor
    if (isLoading || isLoadingMore || !hasMore || !cursor) {
      return;
    }

    const fetchId = ++fetchIdRef.current;

    setIsLoadingMore(true);
    setError(null);

    try {
      const data = await fetchShakedownsFromApi(sort, filters, cursor);

      // Only update if this is still the current fetch
      if (fetchId !== fetchIdRef.current) return;

      setShakedowns((prev) => [...prev, ...data.shakedowns]);
      setHasMore(data.hasMore);
      setCursor(data.nextCursor);
    } catch (err) {
      // Only update if this is still the current fetch
      if (fetchId !== fetchIdRef.current) return;

      const fetchError = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(fetchError);
    } finally {
      setIsLoadingMore(false);
    }
  }, [sort, filters, cursor, hasMore, isLoading, isLoadingMore]);

  /**
   * Refreshes the feed by re-fetching from the start
   */
  const refresh = useCallback(async () => {
    await fetchInitial();
  }, [fetchInitial]);

  /**
   * Updates sort option and triggers a refresh
   */
  const handleSetSort = useCallback((newSort: SortOption) => {
    setSort(newSort);
    // Reset pagination when sort changes
    setCursor(null);
    setHasMore(true);
  }, []);

  /**
   * Updates filters and triggers a refresh
   */
  const handleSetFilters = useCallback((newFilters: ShakedownFilters) => {
    setFilters(newFilters);
    // Reset pagination when filters change
    setCursor(null);
    setHasMore(true);
  }, []);

  // =============================================================================
  // Optimistic Update Helpers
  // =============================================================================

  /**
   * Prepends a newly created shakedown to the feed
   * Useful for optimistic updates after creating a shakedown
   */
  const prependShakedown = useCallback((shakedown: ShakedownWithAuthor) => {
    setShakedowns((prev) => [shakedown, ...prev]);
  }, []);

  /**
   * Replaces a temporary shakedown with the real one from the server
   * Used after server confirms the creation
   */
  const replaceShakedown = useCallback(
    (tempId: string, shakedown: ShakedownWithAuthor) => {
      setShakedowns((prev) =>
        prev.map((s) => (s.id === tempId ? shakedown : s))
      );
    },
    []
  );

  /**
   * Removes a shakedown from the feed
   * Used after deletion or when a creation fails
   */
  const removeShakedown = useCallback((id: string) => {
    setShakedowns((prev) => prev.filter((s) => s.id !== id));
  }, []);

  // =============================================================================
  // Effects
  // =============================================================================

  // Initial load and refresh when sort/filters change
  useEffect(() => {
    fetchInitial();
  }, [fetchInitial]);

  // =============================================================================
  // Return
  // =============================================================================

  return {
    shakedowns,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    sort,
    setSort: handleSetSort,
    filters,
    setFilters: handleSetFilters,
    prependShakedown,
    replaceShakedown,
    removeShakedown,
  };
}

export default useShakedowns;
