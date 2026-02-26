/**
 * useVipSearch Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T060
 *
 * Provides debounced VIP search with pagination.
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { VipWithStats, VipListResponse } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseVipSearchState {
  status: 'idle' | 'loading' | 'success' | 'error';
  results: VipWithStats[];
  total: number;
  hasMore: boolean;
  error: string | null;
}

interface UseVipSearchOptions {
  debounceMs?: number;
  limit?: number;
  featured?: boolean;
}

interface UseVipSearchReturn extends UseVipSearchState {
  query: string;
  setQuery: (query: string) => void;
  loadMore: () => Promise<void>;
  reset: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipSearch(options: UseVipSearchOptions = {}): UseVipSearchReturn {
  const { debounceMs = 300, limit = 12, featured } = options;

  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [offset, setOffset] = useState(0);
  const [state, setState] = useState<UseVipSearchState>({
    status: 'idle',
    results: [],
    total: 0,
    hasMore: false,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setOffset(0); // Reset pagination on new search
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs]);

  // Fetch VIPs
  const fetchVips = useCallback(
    async (searchQuery: string, searchOffset: number, append: boolean) => {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        status: append ? prev.status : 'loading',
        error: null,
      }));

      try {
        const params = new URLSearchParams({
          limit: String(limit),
          offset: String(searchOffset),
        });

        if (searchQuery.trim()) {
          params.set('query', searchQuery.trim());
        }

        if (featured !== undefined) {
          params.set('featured', String(featured));
        }

        const response = await fetch(`/api/vip?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to search VIPs');
        }

        const data: VipListResponse = await response.json();

        setState((prev) => ({
          status: 'success',
          results: append ? [...prev.results, ...data.vips] : data.vips,
          total: data.total,
          hasMore: data.hasMore,
          error: null,
        }));

        setOffset(searchOffset + data.vips.length);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          return; // Ignore aborted requests
        }

        setState((prev) => ({
          ...prev,
          status: 'error',
          error: err instanceof Error ? err.message : 'Search failed',
        }));
      }
    },
    [limit, featured]
  );

  // Search when debounced query changes
  useEffect(() => {
    fetchVips(debouncedQuery, 0, false);

    // Cleanup: abort any pending request on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, [debouncedQuery, fetchVips]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (state.hasMore && state.status !== 'loading') {
      await fetchVips(debouncedQuery, offset, true);
    }
  }, [state.hasMore, state.status, debouncedQuery, offset, fetchVips]);

  // Reset search
  const reset = useCallback(() => {
    setQuery('');
    setDebouncedQuery('');
    setOffset(0);
    setState({
      status: 'idle',
      results: [],
      total: 0,
      hasMore: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    query,
    setQuery,
    loadMore,
    reset,
  };
}

export default useVipSearch;
