/**
 * useVipBookmark Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T070 (US8 Bookmark)
 *
 * Manages VIP loadout bookmark state with optimistic updates.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { bookmarkLoadout, unbookmarkLoadout } from '@/lib/vip/vip-service';

// =============================================================================
// Types
// =============================================================================

interface UseVipBookmarkReturn {
  isBookmarked: boolean;
  isLoading: boolean;
  error: string | null;
  toggleBookmark: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipBookmark(
  loadoutId: string | undefined,
  initialIsBookmarked: boolean = false
): UseVipBookmarkReturn {
  const [isBookmarked, setIsBookmarked] = useState(initialIsBookmarked);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with initial value when it changes
  useEffect(() => {
    setIsBookmarked(initialIsBookmarked);
  }, [initialIsBookmarked]);

  const toggleBookmark = useCallback(async () => {
    if (!loadoutId || isLoading) return;

    setIsLoading(true);
    setError(null);

    // Optimistic update
    const previousBookmarked = isBookmarked;
    setIsBookmarked(!isBookmarked);

    try {
      const result = isBookmarked
        ? await unbookmarkLoadout(loadoutId)
        : await bookmarkLoadout(loadoutId);

      // Update with server response
      setIsBookmarked(result.isBookmarked);
    } catch (err) {
      // Rollback on error
      setIsBookmarked(previousBookmarked);
      setError(err instanceof Error ? err.message : 'Failed to update bookmark');
      console.error('Error toggling bookmark:', err);
    } finally {
      setIsLoading(false);
    }
  }, [loadoutId, isBookmarked, isLoading]);

  return {
    isBookmarked,
    isLoading,
    error,
    toggleBookmark,
  };
}

export default useVipBookmark;
