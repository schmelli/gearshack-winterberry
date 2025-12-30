'use client';

/**
 * useUserBookmarks Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T074
 *
 * Fetches the current user's bookmarked VIP loadouts.
 */

import { useState, useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

export interface BookmarkedLoadout {
  bookmarkedAt: string;
  loadout: {
    id: string;
    name: string;
    slug: string;
    publishedAt: string;
    vip: {
      id: string;
      name: string;
      slug: string;
      avatar_url: string;
    };
  };
}

interface UseUserBookmarksReturn {
  bookmarks: BookmarkedLoadout[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useUserBookmarks(): UseUserBookmarksReturn {
  const [bookmarks, setBookmarks] = useState<BookmarkedLoadout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBookmarks = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vip/bookmark');

      if (!response.ok) {
        if (response.status === 401) {
          // User not authenticated - return empty
          setBookmarks([]);
          return;
        }
        throw new Error('Failed to fetch bookmarks');
      }

      const data = await response.json();
      setBookmarks(data.bookmarks ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch bookmarks');
      console.error('Error fetching bookmarks:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBookmarks();
  }, [fetchBookmarks]);

  return {
    bookmarks,
    isLoading,
    error,
    refetch: fetchBookmarks,
  };
}

export default useUserBookmarks;
