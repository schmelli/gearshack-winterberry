/**
 * Marketplace Filters Hook with URL Query Param Sync
 *
 * Feature: 056-community-hub-enhancements
 *
 * Manages filter state and syncs with URL query parameters for:
 * - Filter persistence across page refreshes
 * - Shareable URLs with active filters
 */

'use client';

import { useCallback, useMemo } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import type {
  ListingTypeFilter,
  MarketplaceSortField,
  MarketplaceSortOrder,
  MarketplaceFilters,
} from '@/types/marketplace';

// ============================================================================
// Types
// ============================================================================

export interface UseMarketplaceFiltersReturn {
  filters: MarketplaceFilters;
  setType: (type: ListingTypeFilter) => void;
  setSortBy: (sortBy: MarketplaceSortField) => void;
  setSortOrder: (sortOrder: MarketplaceSortOrder) => void;
  setSearch: (search: string) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_TYPE: ListingTypeFilter = 'all';
const DEFAULT_SORT_BY: MarketplaceSortField = 'date';
const DEFAULT_SORT_ORDER: MarketplaceSortOrder = 'desc';

// ============================================================================
// Hook
// ============================================================================

export function useMarketplaceFilters(): UseMarketplaceFiltersReturn {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Parse filters from URL
  const filters: MarketplaceFilters = useMemo(() => {
    const type =
      (searchParams.get('type') as ListingTypeFilter) || DEFAULT_TYPE;
    const sortBy =
      (searchParams.get('sortBy') as MarketplaceSortField) || DEFAULT_SORT_BY;
    const sortOrder =
      (searchParams.get('sortOrder') as MarketplaceSortOrder) ||
      DEFAULT_SORT_ORDER;
    const search = searchParams.get('search') || undefined;

    // Validate type
    const validTypes: ListingTypeFilter[] = [
      'all',
      'for_sale',
      'for_trade',
      'for_borrow',
    ];
    const validType = validTypes.includes(type) ? type : DEFAULT_TYPE;

    // Validate sortBy
    const validSortFields: MarketplaceSortField[] = ['date', 'price', 'name'];
    const validSortBy = validSortFields.includes(sortBy)
      ? sortBy
      : DEFAULT_SORT_BY;

    // Validate sortOrder
    const validSortOrders: MarketplaceSortOrder[] = ['asc', 'desc'];
    const validSortOrder = validSortOrders.includes(sortOrder)
      ? sortOrder
      : DEFAULT_SORT_ORDER;

    return {
      type: validType,
      sortBy: validSortBy,
      sortOrder: validSortOrder,
      search,
    };
  }, [searchParams]);

  // Update URL with new params
  const updateUrl = useCallback(
    (updates: Partial<MarketplaceFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
          params.delete(key);
        } else if (
          // Don't include defaults in URL
          (key === 'type' && value === DEFAULT_TYPE) ||
          (key === 'sortBy' && value === DEFAULT_SORT_BY) ||
          (key === 'sortOrder' && value === DEFAULT_SORT_ORDER)
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const newUrl = params.toString()
        ? `${pathname}?${params.toString()}`
        : pathname;

      router.replace(newUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Filter setters
  const setType = useCallback(
    (type: ListingTypeFilter) => {
      updateUrl({ type });
    },
    [updateUrl]
  );

  const setSortBy = useCallback(
    (sortBy: MarketplaceSortField) => {
      updateUrl({ sortBy });
    },
    [updateUrl]
  );

  const setSortOrder = useCallback(
    (sortOrder: MarketplaceSortOrder) => {
      updateUrl({ sortOrder });
    },
    [updateUrl]
  );

  const setSearch = useCallback(
    (search: string) => {
      updateUrl({ search: search || undefined });
    },
    [updateUrl]
  );

  const clearFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.type !== DEFAULT_TYPE ||
      filters.sortBy !== DEFAULT_SORT_BY ||
      filters.sortOrder !== DEFAULT_SORT_ORDER ||
      !!filters.search
    );
  }, [filters]);

  return {
    filters,
    setType,
    setSortBy,
    setSortOrder,
    setSearch,
    clearFilters,
    hasActiveFilters,
  };
}
