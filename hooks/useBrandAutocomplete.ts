/**
 * Hook for brand autocomplete with fuzzy search
 * Feature: 042-catalog-sync-api (US1)
 *
 * Provides debounced brand search with 300ms delay to handle fast typing.
 * Returns suggestions sorted by similarity score.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  BrandSuggestion,
  UseBrandAutocompleteOptions,
  UseBrandAutocompleteReturn,
  BrandSearchResponse,
} from '@/types/catalog';

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_CHARS = 2;

/**
 * Hook for brand name autocomplete with fuzzy matching
 * @param options - Configuration options (debounceMs, minChars)
 * @returns Autocomplete state and controls
 */
export function useBrandAutocomplete(
  options: UseBrandAutocompleteOptions = {}
): UseBrandAutocompleteReturn {
  const { debounceMs = DEFAULT_DEBOUNCE_MS, minChars = DEFAULT_MIN_CHARS } = options;

  const [suggestions, setSuggestions] = useState<BrandSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Performs the actual search request
   */
  const performSearch = useCallback(async (query: string) => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(
        `/api/catalog/brands/search?q=${encodeURIComponent(query)}&limit=5`,
        { signal: abortControllerRef.current.signal }
      );

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data: BrandSearchResponse = await response.json();

      setSuggestions(
        data.results.map((result) => ({
          id: result.id,
          name: result.name,
          logoUrl: result.logoUrl,
          websiteUrl: result.websiteUrl,
          similarity: result.similarity,
        }))
      );
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Request was cancelled, ignore
        return;
      }
      console.error('Brand autocomplete error:', err);
      setError('Failed to fetch suggestions');
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Initiates a debounced search
   * Handles fast typing by cancelling previous requests
   */
  const search = useCallback(
    (query: string) => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear suggestions if query is too short
      if (query.length < minChars) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Set debounced search
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceMs);
    },
    [debounceMs, minChars, performSearch]
  );

  /**
   * Clears all suggestions and resets state
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

    setSuggestions([]);
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
    suggestions,
    isLoading,
    error,
    search,
    clear,
  };
}
