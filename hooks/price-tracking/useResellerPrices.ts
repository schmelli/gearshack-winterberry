/**
 * useResellerPrices Hook
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Fetch best reseller prices for a wishlist item (Trailblazer only)
 *
 * Constitution: All business logic MUST reside in hooks
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { useSubscriptionCheck } from '@/hooks/ai-assistant/useSubscriptionCheck';
import type {
  ResellerPriceWithDetails,
  ResellerSearchResponse,
} from '@/types/reseller';

// =============================================================================
// Types
// =============================================================================

export interface UseResellerPricesOptions {
  /** Gear item ID */
  gearItemId: string;
  /** Search query (brand + product name) */
  query: string;
  /** User's country code */
  countryCode?: string;
  /** User's location for local shop sorting */
  userLocation?: {
    latitude: number;
    longitude: number;
  } | null;
  /** Auto-fetch on mount (default: true) */
  autoFetch?: boolean;
}

export interface UseResellerPricesReturn {
  /** Best local reseller prices (up to 2) */
  localPrices: ResellerPriceWithDetails[];
  /** Best online reseller price (up to 1) */
  onlinePrices: ResellerPriceWithDetails[];
  /** All prices combined */
  allPrices: ResellerPriceWithDetails[];
  /** Whether search is in progress */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** Whether results came from cache */
  fromCache: boolean;
  /** Whether user is Trailblazer (required for this feature) */
  isTrailblazer: boolean;
  /** Execute search */
  search: () => Promise<void>;
  /** Refresh current search */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useResellerPrices(
  options: UseResellerPricesOptions
): UseResellerPricesReturn {
  const {
    gearItemId,
    query,
    countryCode = 'DE',
    userLocation,
    autoFetch = true,
  } = options;

  const { user } = useAuthContext();
  const { isTrailblazer, isLoading: subscriptionLoading } = useSubscriptionCheck(
    user?.uid ?? null
  );

  // State
  const [localPrices, setLocalPrices] = useState<ResellerPriceWithDetails[]>([]);
  const [onlinePrices, setOnlinePrices] = useState<ResellerPriceWithDetails[]>([]);
  const [allPrices, setAllPrices] = useState<ResellerPriceWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  // Search function
  const search = useCallback(async () => {
    // Only Trailblazers can use this feature
    if (!isTrailblazer) {
      setError('Trailblazer subscription required');
      return;
    }

    if (!query.trim()) {
      setError('Search query is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build query params
      const params = new URLSearchParams({
        gearItemId,
        query,
        countryCode,
      });

      if (userLocation) {
        params.set('latitude', userLocation.latitude.toString());
        params.set('longitude', userLocation.longitude.toString());
      }

      // Fetch from API
      const response = await fetch(`/api/resellers/search?${params}`);

      if (!response.ok) {
        if (response.status === 403) {
          setError('Trailblazer subscription required');
          return;
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data: ResellerSearchResponse = await response.json();

      setLocalPrices(data.localPrices);
      setOnlinePrices(data.onlinePrices);
      setAllPrices(data.allPrices);
      setFromCache(data.fromCache);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setError(message);
      setLocalPrices([]);
      setOnlinePrices([]);
      setAllPrices([]);
      console.error('[useResellerPrices] Error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [gearItemId, query, countryCode, userLocation, isTrailblazer]);

  // Refresh function
  const refresh = useCallback(async () => {
    await search();
  }, [search]);

  // Auto-fetch on mount (if enabled and user is Trailblazer)
  useEffect(() => {
    if (autoFetch && !subscriptionLoading && isTrailblazer && query) {
      search();
    }
    // Include all dependencies to ensure proper re-fetching when props change
  }, [autoFetch, subscriptionLoading, isTrailblazer, query, search, gearItemId, countryCode, userLocation]);

  return {
    localPrices,
    onlinePrices,
    allPrices,
    isLoading: isLoading || subscriptionLoading,
    error,
    fromCache,
    isTrailblazer,
    search,
    refresh,
  };
}
