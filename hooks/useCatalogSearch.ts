/**
 * Hook for catalog item search with fuzzy text search
 * Feature: 042-catalog-sync-api (US1, US2)
 *
 * Provides debounced search with 300ms delay to handle fast typing.
 * Currently supports fuzzy text search mode only.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  ItemSearchResult,
  UseCatalogSearchOptions,
  UseCatalogSearchReturn,
  ItemSearchResponse,
  CatalogSearchMode,
} from '@/types/catalog';

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_LIMIT = 5;

/**
 * Hook for catalog item search with fuzzy text search
 * @param options - Configuration options (mode, debounceMs, limit)
 * @returns Search state and controls
 */
export function useCatalogSearch(
  options: UseCatalogSearchOptions = {}
): UseCatalogSearchReturn {
  const { mode = 'fuzzy', debounceMs = DEFAULT_DEBOUNCE_MS, limit = DEFAULT_LIMIT } = options;

  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const currentModeRef = useRef<CatalogSearchMode>(mode);

  // Update mode ref when option changes
  useEffect(() => {
    currentModeRef.current = mode;
  }, [mode]);

  /**
   * Performs the actual search request
   */
  const performSearch = useCallback(
    async (query: string, _embedding?: number[]) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        setError(null);

        // Build URL with query parameters
        const params = new URLSearchParams();
        params.set('mode', currentModeRef.current);
        params.set('limit', limit.toString());

        if (query) {
          params.set('q', query);
        }

        const response = await fetch(`/api/catalog/items/search?${params.toString()}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Search failed');
        }

        const data: ItemSearchResponse = await response.json();

        setResults(data.results);
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Catalog search error:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch results');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  /**
   * Initiates a debounced search
   * Handles fast typing by cancelling previous requests
   * @param query - Text search query (required for fuzzy search)
   */
  const search = useCallback(
    (query: string, embedding?: number[]) => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Validate inputs - fuzzy mode requires query
      if (!query) {
        setResults([]);
        setError(null);
        return;
      }

      // Set debounced search
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query, embedding);
      }, debounceMs);
    },
    [debounceMs, performSearch]
  );

  /**
   * Clears all results and resets state
   */
  const clear = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setResults([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    results,
    isLoading,
    error,
    search,
    clear,
  };
}
