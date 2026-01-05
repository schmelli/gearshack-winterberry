/**
 * Main Marketplace Hook
 *
 * Feature: 056-community-hub-enhancements
 *
 * Manages marketplace state including listings, pagination,
 * loading states, and error handling. Integrates with URL filters.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { fetchMarketplaceListings } from '@/lib/supabase/marketplace-queries';
import { useMarketplaceFilters } from './useMarketplaceFilters';
import type {
  MarketplaceListing,
  MarketplaceState,
} from '@/types/marketplace';
import { MARKETPLACE_CONSTANTS } from '@/types/marketplace';

// ============================================================================
// Types
// ============================================================================

type MarketplaceLoadingState = MarketplaceState['loadingState'];

interface UseMarketplaceReturn {
  // State
  listings: MarketplaceListing[];
  hasMore: boolean;
  loadingState: MarketplaceLoadingState;
  error: string | null;

  // Filters (delegated to useMarketplaceFilters)
  filters: ReturnType<typeof useMarketplaceFilters>;

  // Actions
  loadListings: () => Promise<void>;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
}

// ============================================================================
// Hook
// ============================================================================

export function useMarketplace(): UseMarketplaceReturn {
  // Memoize Supabase client to prevent infinite re-renders
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();

  // Get filters from URL params
  const filters = useMarketplaceFilters();

  // Marketplace state
  const [state, setState] = useState<MarketplaceState>({
    listings: [],
    hasMore: true,
    nextCursor: null,
    loadingState: 'idle',
    error: null,
    filters: filters.filters,
  });

  /**
   * Load initial listings
   */
  const loadListings = useCallback(async () => {
    setState((prev) => ({ ...prev, loadingState: 'loading', error: null }));

    try {
      const result = await fetchMarketplaceListings(supabase, {
        type: filters.filters.type,
        sortBy: filters.filters.sortBy,
        sortOrder: filters.filters.sortOrder,
        search: filters.filters.search,
        limit: MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
        excludeUserId: user?.id,
      });

      setState((prev) => ({
        ...prev,
        listings: result.listings,
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
        filters: filters.filters,
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load listings';
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: message,
      }));
    }
  }, [supabase, filters.filters, user?.id]);

  /**
   * Load more listings (infinite scroll)
   */
  const loadMore = useCallback(async () => {
    if (state.loadingState !== 'idle' || !state.hasMore || !state.nextCursor) {
      return;
    }

    setState((prev) => ({ ...prev, loadingState: 'loading-more' }));

    try {
      const result = await fetchMarketplaceListings(supabase, {
        type: filters.filters.type,
        sortBy: filters.filters.sortBy,
        sortOrder: filters.filters.sortOrder,
        search: filters.filters.search,
        cursor: state.nextCursor,
        limit: MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
        excludeUserId: user?.id,
      });

      setState((prev) => ({
        ...prev,
        listings: [...prev.listings, ...result.listings],
        hasMore: result.hasMore,
        nextCursor: result.nextCursor,
        loadingState: 'idle',
      }));
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load more listings';
      setState((prev) => ({
        ...prev,
        loadingState: 'error',
        error: message,
      }));
    }
  }, [
    supabase,
    filters.filters,
    state.loadingState,
    state.hasMore,
    state.nextCursor,
    user?.id,
  ]);

  /**
   * Refresh listings (pull to refresh or filter change)
   */
  const refresh = useCallback(async () => {
    setState((prev) => ({
      ...prev,
      listings: [],
      nextCursor: null,
      hasMore: true,
    }));
    await loadListings();
  }, [loadListings]);

  // Load listings on mount and when filters change
  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.filters.type,
    filters.filters.sortBy,
    filters.filters.sortOrder,
    filters.filters.search,
  ]);

  return {
    listings: state.listings,
    hasMore: state.hasMore,
    loadingState: state.loadingState,
    error: state.error,
    filters,
    loadListings,
    loadMore,
    refresh,
  };
}
