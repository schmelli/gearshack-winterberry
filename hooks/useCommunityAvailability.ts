/**
 * Community Availability Hook
 *
 * Feature: 049-wishlist-view (User Story 2)
 * Tasks: T036-T039, T077
 *
 * Manages community availability data for wishlist items with 5-minute TTL cache.
 * Uses useRef for cache persistence across renders.
 *
 * T077: Includes retry logic with exponential backoff (1s, 2s, 4s) and max 3 attempts.
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

/** T077: Maximum retry attempts */
const MAX_RETRY_ATTEMPTS = 3;

/** T077: Base delay for exponential backoff in milliseconds */
const BASE_RETRY_DELAY_MS = 1000;

// =============================================================================
// Retry State Type
// =============================================================================

/**
 * T077: Retry state for tracking retry attempts
 */
type RetryStatus = 'idle' | 'retrying' | 'failed';

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * T077: Sleep utility for exponential backoff
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * T077: Calculate delay for exponential backoff
 * Returns delays of 1s, 2s, 4s for attempts 0, 1, 2
 */
const getRetryDelay = (attempt: number): number =>
  BASE_RETRY_DELAY_MS * Math.pow(2, attempt);

/**
 * Hook for managing community availability data with caching
 *
 * @returns UseCommunityAvailabilityReturn - availability data and actions
 *
 * @example
 * const { fetchAvailability, getAvailability, isLoading, retryStatus } = useCommunityAvailability();
 *
 * // Fetch availability when component mounts or items change
 * useEffect(() => {
 *   fetchAvailability(wishlistItemIds);
 * }, [wishlistItemIds, fetchAvailability]);
 *
 * // Get availability for specific item
 * const itemAvailability = getAvailability('item-id');
 *
 * // Show retry status to user
 * if (retryStatus === 'retrying') return <p>Retrying...</p>;
 * if (retryStatus === 'failed') return <RetryButton onClick={() => manualRetry(itemIds)} />;
 */
export function useCommunityAvailability(): UseCommunityAvailabilityReturn {
  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // T077: Retry state
  const [retryStatus, setRetryStatus] = useState<RetryStatus>('idle');
  const [retryCount, setRetryCount] = useState(0);

  // Cache stored in useRef to persist across renders without triggering re-renders
  // Map<wishlistItemId, AvailabilityCache>
  const cacheRef = useRef<Map<string, AvailabilityCache>>(new Map());

  // T077: Track items that need to be retried
  const pendingRetryItemsRef = useRef<string[]>([]);

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
  // Actions - T037-T038, T077
  // ---------------------------------------------------------------------------

  /**
   * T077: Internal fetch with retry logic
   * Implements exponential backoff (1s, 2s, 4s)
   *
   * @param itemsToFetch - Array of wishlist item UUIDs to fetch
   * @param attempt - Current attempt number (0-indexed)
   * @returns Map of results or throws on final failure
   */
  const fetchWithRetry = useCallback(
    async (
      itemsToFetch: string[],
      attempt: number = 0
    ): Promise<Map<string, WishlistItemAvailability['matches']>> => {
      try {
        return await fetchCommunityAvailability(itemsToFetch);
      } catch (err) {
        // Check if we should retry
        if (attempt < MAX_RETRY_ATTEMPTS - 1) {
          const delay = getRetryDelay(attempt);
          console.warn(
            `Community availability fetch failed (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}). ` +
            `Retrying in ${delay}ms...`
          );

          // Update retry state
          setRetryStatus('retrying');
          setRetryCount(attempt + 1);
          pendingRetryItemsRef.current = itemsToFetch;

          // Wait with exponential backoff
          await sleep(delay);

          // Recursive retry
          return fetchWithRetry(itemsToFetch, attempt + 1);
        }

        // Max retries exhausted
        throw err;
      }
    },
    []
  );

  /**
   * Fetch availability for multiple wishlist items
   * Only fetches items that are stale or not cached
   *
   * T037: Implement fetchAvailability action
   * T077: Added retry logic with exponential backoff
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
      setRetryStatus('idle');
      setRetryCount(0);

      try {
        // T077: Fetch with retry logic
        const results = await fetchWithRetry(itemsToFetch, 0);
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

        // Success - reset retry state
        setRetryStatus('idle');
        setRetryCount(0);
        pendingRetryItemsRef.current = [];

        // Trigger re-render
        setCacheVersion((v) => v + 1);
      } catch (err) {
        // T077: Max retries exhausted - set failed state
        console.error('Failed to fetch community availability after max retries:', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to fetch community availability'
        );
        setRetryStatus('failed');
        pendingRetryItemsRef.current = itemsToFetch;

        // Store empty results for failed items to prevent automatic retry storm
        // User can manually retry via manualRetry action
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
    [isStale, fetchWithRetry]
  );

  /**
   * T077: Manual retry action
   * Used after max automatic retries are exhausted
   * Resets retry state and attempts to fetch again
   *
   * @param wishlistItemIds - Array of wishlist item UUIDs to retry
   */
  const manualRetry = useCallback(
    async (wishlistItemIds: string[]): Promise<void> => {
      // Reset retry state
      setRetryStatus('idle');
      setRetryCount(0);
      setError(null);

      // Clear cached items that failed so they get re-fetched
      wishlistItemIds.forEach((itemId) => {
        cacheRef.current.delete(itemId);
      });

      // Re-fetch
      await fetchAvailability(wishlistItemIds);
    },
    [fetchAvailability]
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

    // T077: Retry state
    retryStatus,
    retryCount,

    // Actions
    fetchAvailability,
    refreshAvailability,

    // T077: Manual retry action
    manualRetry,

    // Helpers
    getAvailability,
    hasAvailability,
    isStale,
  };
}
