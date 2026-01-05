/**
 * useProductSearch Hook
 *
 * Feature: 039-product-search-cloudinary
 * Phase: 2 - Foundational (T005 + T006)
 *
 * Manages state and logic for product image search functionality.
 * Handles query management, search execution, result management, and error handling.
 * Designed to be composed with UI components (separation of concerns).
 *
 * Constitution Compliance:
 * - All business logic in hook (not in components)
 * - TypeScript strict mode (no `any` types)
 * - Follows existing hook patterns (useGearEditor, useImageUpload)
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import { searchGearImages } from '@/app/actions/image-search';
import type { ImageSearchResult } from '@/app/actions/image-search';
import type { ProductSearchStatus } from '@/types/cloudinary';

// =============================================================================
// Types
// =============================================================================

/**
 * Return interface for useProductSearch hook
 * Provides complete state and actions for search functionality
 */
export interface UseProductSearchReturn {
  /** Current search query string */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Array of search results from Serper API */
  results: ImageSearchResult[];
  /** Current search operation status */
  status: ProductSearchStatus;
  /** Error message (null if no error) */
  error: string | null;
  /** Execute search with current query */
  search: () => Promise<void>;
  /** Execute search with a specific query (useful for initial search) */
  searchWithQuery: (query: string) => Promise<void>;
  /** Clear all results and reset state */
  clear: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Product Search Hook
 *
 * Manages the complete lifecycle of product image searches:
 * 1. Query input management
 * 2. Search execution via server action
 * 3. Result state management
 * 4. Error handling with user feedback
 *
 * Usage:
 * ```tsx
 * const { query, setQuery, results, status, search, clear } = useProductSearch();
 *
 * // Update query
 * setQuery('camping tent');
 *
 * // Execute search
 * await search();
 *
 * // Clear results
 * clear();
 * ```
 *
 * @returns Complete search state and actions
 */
export function useProductSearch(): UseProductSearchReturn {
  const t = useTranslations('ProductSearch');

  // State management
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ImageSearchResult[]>([]);
  const [status, setStatus] = useState<ProductSearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Debounce timer ref (300ms delay per FR-004)
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Core search implementation that accepts a query string directly
   * Used by both search() and searchWithQuery()
   */
  const executeSearch = useCallback(async (searchQuery: string) => {
    // Cancel any pending search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Edge Case 1: Empty query validation
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast.error(t('enterSearchTerm'));
      return;
    }

    // Reset error state
    setError(null);

    // Set searching status
    setStatus('searching');

    try {
      // Call server action to fetch results (no debounce for direct calls)
      const searchResults = await searchGearImages(trimmedQuery);

      // Update results and return to idle
      setResults(searchResults);
      setStatus('idle');

      // Edge Case 2: No results found (informational, not an error)
      if (searchResults.length === 0) {
        toast.info(t('noResults', { query: trimmedQuery }));
      }
    } catch (err) {
      // Edge Case 3 & 4: API failure and network errors
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setStatus('error');
      setResults([]); // Clear any previous results on error
      toast.error(errorMessage);
      console.error('[ProductSearch] Search execution failed:', err);
    }
  }, [t]);

  /**
   * Execute search with current query (with 300ms debounce)
   * Used when user types in search field
   */
  const search = useCallback(async () => {
    // Cancel any pending search
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      toast.error(t('enterSearchTerm'));
      return;
    }

    // Debounce for manual searches
    debounceTimerRef.current = setTimeout(() => {
      executeSearch(trimmedQuery);
    }, 300);
  }, [query, executeSearch, t]);

  /**
   * Execute search with a specific query (no debounce)
   * Used for initial/auto search when modal opens
   */
  const searchWithQuery = useCallback(async (searchQuery: string) => {
    setQuery(searchQuery);
    await executeSearch(searchQuery);
  }, [executeSearch]);

  // Cleanup: clear timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  /**
   * Clear all results and reset state to initial values
   * Useful for "reset" or "new search" actions
   */
  const clear = useCallback(() => {
    setQuery('');
    setResults([]);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    query,
    setQuery,
    results,
    status,
    error,
    search,
    searchWithQuery,
    clear,
  };
}
