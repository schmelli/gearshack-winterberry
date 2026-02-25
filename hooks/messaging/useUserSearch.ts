/**
 * useUserSearch - User Search Hook
 *
 * Feature: 046-user-messaging-system
 * Task: T028
 *
 * Provides debounced search for discovering other GearShack members.
 * Respects privacy settings and excludes blocked users.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface SearchedUser {
  id: string;
  display_name: string;
  avatar_url: string | null;
  trail_name: string | null;
  bio: string | null;
}

interface UseUserSearchReturn {
  /** Search query string */
  query: string;
  /** Update the search query */
  setQuery: (query: string) => void;
  /** Search results */
  results: SearchedUser[];
  /** Whether search is in progress */
  isSearching: boolean;
  /** Error message if any */
  error: string | null;
  /** Clear search results */
  clear: () => void;
}

interface UseUserSearchOptions {
  /** Debounce delay in ms (default 300) */
  debounceMs?: number;
  /** Minimum query length to trigger search (default 2) */
  minLength?: number;
}

/**
 * Hook for searching GearShack users with debouncing.
 */
export function useUserSearch(options: UseUserSearchOptions = {}): UseUserSearchReturn {
  const { debounceMs = 300, minLength = 2 } = options;
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const performSearch = useCallback(async (searchQuery: string) => {
    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (searchQuery.length < minLength) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch(
        `/api/messaging/users/search?q=${encodeURIComponent(searchQuery)}`,
        { signal: controller.signal }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Search failed');
      }

      const data = await response.json();
      setResults(data.users || []);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        // Ignore aborted requests
        return;
      }
      console.error('[useUserSearch] Search failed:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [minLength]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);

    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      performSearch(newQuery);
    }, debounceMs);
  }, [debounceMs, performSearch]);

  const clear = useCallback(() => {
    setQueryState('');
    setResults([]);
    setError(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    query,
    setQuery,
    results,
    isSearching,
    error,
    clear,
  };
}
