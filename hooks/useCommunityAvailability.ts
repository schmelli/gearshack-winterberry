/**
 * Community Availability Hook
 *
 * Feature: 049-wishlist-view (User Story 2)
 * Tasks: T036-T039
 *
 * Manages community availability data for wishlist items with 5-minute TTL cache.
 * Uses useRef for cache persistence across renders.
 *
 * Architecture: Feature-Sliced Light (logic in hooks, stateless UI components)
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import type {
  UseCommunityAvailabilityReturn,
  WishlistItemAvailability,
  AvailabilityCache,
} from '@/types/wishlist';
import {
  fetchCommunityAvailability,
  refreshCommunityAvailability as refreshFromDb,
} from '@/lib/supabase/community-matching';

// =============================================================================
// Constants
// =============================================================================

/** Cache TTL in milliseconds (5 minutes) */
const CACHE_TTL_MS = 5 * 60 * 1000;

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for managing community availability data with caching
 *
 * @returns UseCommunityAvailabilityReturn - availability data and actions
 *
 * @example
 * const { fetchAvailability, getAvailability, isLoading } = useCommunityAvailability();
 *
 * // Fetch availability when component mounts or items change
 * useEffect(() => {
 *   fetchAvailability(wishlistItemIds);
 * }, [wishlistItemIds, fetchAvailability]);
 *
 * // Get availability for specific item
 * const itemAvailability = getAvailability('item-id');
 */
export function useCommunityAvailability(): UseCommunityAvailabilityReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cache stored in useRef to persist across renders without triggering re-renders
  // Map<wishlistItemId, AvailabilityCache>
  const cacheRef = useRef<Map<string, AvailabilityCache>>(new Map());

  // Trigger re-renders when cache updates (separate from cache storage)
  // We use this pattern to force component re-renders when cache updates
  const [, setCacheVersion] = useState(0);

  // ---------------------------------------------------------------------------
  // Helpers - T039
  // ---------------------------------------------------------------------------

  /**
   * Check if cached data is stale (older than 5 minutes)
   *
   * @param wishlistItemId - Wishlist item UUID
   * @returns boolean - true if data is stale or not cached
   */
  const isStale = useCallback((wishlistItemId: string): boolean => {
    const cached = cacheRef.current.get(wishlistItemId);
    if (!cached) return true;

    const now = new Date();
    const age = now.getTime() - cached.fetchedAt.getTime();
    return age > CACHE_TTL_MS;
  }, []);

  /**
   * Get availability data for a wishlist item
   *
   * @param wishlistItemId - Wishlist item UUID
   * @returns WishlistItemAvailability | null - cached data or null if not found
   */
  const getAvailability = useCallback(
    (wishlistItemId: string): WishlistItemAvailability | null => {
      const cached = cacheRef.current.get(wishlistItemId);
      if (!cached) return null;

      // Return data with updated isStale flag
      return {
        ...cached.data,
        isStale: isStale(wishlistItemId),
      };
    },
    [isStale]
  );

  /**
   * Check if availability data exists for a wishlist item
   *
   * @param wishlistItemId - Wishlist item UUID
   * @returns boolean - true if data exists in cache (may be stale)
   */
  const hasAvailability = useCallback((wishlistItemId: string): boolean => {
    return cacheRef.current.has(wishlistItemId);
  }, []);

  /**
   * Get current availability state as a Map
   * Used for component rendering
   */
  const getAvailabilityMap = useCallback((): Map<string, WishlistItemAvailability> => {
    const result = new Map<string, WishlistItemAvailability>();

    cacheRef.current.forEach((cache, itemId) => {
      result.set(itemId, {
        ...cache.data,
        isStale: isStale(itemId),
      });
    });

    return result;
  }, [isStale]);

  // ---------------------------------------------------------------------------
  // Actions - T037-T038
  // ---------------------------------------------------------------------------

  /**
   * Fetch availability for multiple wishlist items
   * Only fetches items that are stale or not cached
   *
   * T037: Implement fetchAvailability action
   *
   * @param wishlistItemIds - Array of wishlist item UUIDs
   */
  const fetchAvailability = useCallback(
    async (wishlistItemIds: string[]): Promise<void> => {
      // Filter to only fetch stale/missing items
      const itemsToFetch = wishlistItemIds.filter((id) => isStale(id));

      if (itemsToFetch.length === 0) {
        // All items are cached and fresh
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Fetch from database
        const results = await fetchCommunityAvailability(itemsToFetch);
        const now = new Date();

        // Update cache with results
        results.forEach((matches, itemId) => {
          const availability: WishlistItemAvailability = {
            wishlistItemId: itemId,
            matches,
            hasMatches: matches.length > 0,
            matchCount: matches.length,
            lastFetchedAt: now,
            isStale: false,
          };

          cacheRef.current.set(itemId, {
            data: availability,
            fetchedAt: now,
          });
        });

        // Also set empty results for items that weren't returned
        // This ensures we don't re-fetch items with no matches
        itemsToFetch.forEach((itemId) => {
          if (!cacheRef.current.has(itemId)) {
            const availability: WishlistItemAvailability = {
              wishlistItemId: itemId,
              matches: [],
              hasMatches: false,
              matchCount: 0,
              lastFetchedAt: now,
              isStale: false,
            };

            cacheRef.current.set(itemId, {
              data: availability,
              fetchedAt: now,
            });
          }
        });

        // Trigger re-render
        setCacheVersion((v) => v + 1);
      } catch (err) {
        // Graceful degradation: log error but don't throw
        // This matches the spec requirement for silent fallback
        console.error('Failed to fetch community availability:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch community availability'
        );

        // Store empty results for failed items to prevent retry storm
        const now = new Date();
        itemsToFetch.forEach((itemId) => {
          if (!cacheRef.current.has(itemId)) {
            const availability: WishlistItemAvailability = {
              wishlistItemId: itemId,
              matches: [],
              hasMatches: false,
              matchCount: 0,
              lastFetchedAt: now,
              isStale: false,
            };

            cacheRef.current.set(itemId, {
              data: availability,
              fetchedAt: now,
            });
          }
        });

        setCacheVersion((v) => v + 1);
      } finally {
        setIsLoading(false);
      }
    },
    [isStale]
  );

  /**
   * Force refresh availability for a single wishlist item
   * Bypasses cache and fetches fresh data from database
   *
   * T038: Implement refreshAvailability action
   *
   * @param wishlistItemId - Wishlist item UUID
   */
  const refreshAvailability = useCallback(
    async (wishlistItemId: string): Promise<void> => {
      setIsLoading(true);
      setError(null);

      try {
        // Force fetch from database, bypassing cache
        const matches = await refreshFromDb(wishlistItemId);
        const now = new Date();

        const availability: WishlistItemAvailability = {
          wishlistItemId,
          matches,
          hasMatches: matches.length > 0,
          matchCount: matches.length,
          lastFetchedAt: now,
          isStale: false,
        };

        cacheRef.current.set(wishlistItemId, {
          data: availability,
          fetchedAt: now,
        });

        // Trigger re-render
        setCacheVersion((v) => v + 1);
      } catch (err) {
        // Graceful degradation: log error but don't throw
        console.error(
          `Failed to refresh availability for ${wishlistItemId}:`,
          err
        );
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to refresh community availability'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Return
  // ---------------------------------------------------------------------------

  return {
    // Data - regenerate map on cache version change
    availability: getAvailabilityMap(),
    isLoading,
    error,

    // Actions
    fetchAvailability,
    refreshAvailability,

    // Helpers
    getAvailability,
    hasAvailability,
    isStale,
  };
}
