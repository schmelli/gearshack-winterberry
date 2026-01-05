'use client';

/**
 * useShakedownFilters - Zustand Store for Shakedown Filter State
 *
 * Feature: 001-community-shakedowns
 * Task: T057
 *
 * Manages filter state for the shakedowns feed using Zustand.
 * - Persists filters in localStorage for session continuity
 * - Provides URL builder for shareable filtered views
 * - Integrates with useShakedowns hook for applying filters
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useCallback, useMemo } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import type { ShakedownStatus, ExperienceLevel } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

/** Sort options for shakedowns feed */
export type SortOption = 'recent' | 'popular' | 'unanswered';

/** Season filter options */
export type SeasonFilter = 'spring' | 'summer' | 'fall' | 'winter';

/** Trip type filter options */
export type TripTypeFilter = 'day-hike' | 'overnight' | 'multi-day' | 'thru-hike';

/** State interface for shakedown filters */
export interface ShakedownFilterState {
  // Filter values
  status: ShakedownStatus | null;
  experienceLevel: ExperienceLevel | null;
  search: string;
  sort: SortOption;
  friendsFirst: boolean;
  season: SeasonFilter | null;
  tripType: TripTypeFilter | null;

  // Actions
  setStatus: (status: ShakedownStatus | null) => void;
  setExperienceLevel: (level: ExperienceLevel | null) => void;
  setSearch: (search: string) => void;
  setSort: (sort: SortOption) => void;
  setFriendsFirst: (friendsFirst: boolean) => void;
  setSeason: (season: SeasonFilter | null) => void;
  setTripType: (tripType: TripTypeFilter | null) => void;
  clearFilters: () => void;
  hasActiveFilters: () => boolean;

  // Batch update for URL sync
  setFiltersFromUrl: (params: Partial<ShakedownFilterUrlParams>) => void;
}

/** URL parameter interface for filter serialization */
export interface ShakedownFilterUrlParams {
  status: string | null;
  experience: string | null;
  search: string | null;
  sort: string | null;
  friendsFirst: string | null;
  season: string | null;
  tripType: string | null;
}

// =============================================================================
// Constants
// =============================================================================

/** Default filter values for reset */
const DEFAULT_FILTERS = {
  status: null as ShakedownStatus | null,
  experienceLevel: null as ExperienceLevel | null,
  search: '',
  sort: 'recent' as SortOption,
  friendsFirst: false,
  season: null as SeasonFilter | null,
  tripType: null as TripTypeFilter | null,
} as const;

/** Valid status values for URL parsing */
const VALID_STATUSES: ShakedownStatus[] = ['open', 'completed', 'archived'];

/** Valid experience levels for URL parsing */
const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = [
  'beginner',
  'intermediate',
  'experienced',
  'expert',
];

/** Valid sort options for URL parsing */
const VALID_SORT_OPTIONS: SortOption[] = ['recent', 'popular', 'unanswered'];

/** Valid seasons for URL parsing */
const VALID_SEASONS: SeasonFilter[] = ['spring', 'summer', 'fall', 'winter'];

/** Valid trip types for URL parsing */
const VALID_TRIP_TYPES: TripTypeFilter[] = [
  'day-hike',
  'overnight',
  'multi-day',
  'thru-hike',
];

// =============================================================================
// Validation Helpers
// =============================================================================

function isValidStatus(value: string | null): value is ShakedownStatus {
  return value !== null && VALID_STATUSES.includes(value as ShakedownStatus);
}

function isValidExperienceLevel(value: string | null): value is ExperienceLevel {
  return (
    value !== null && VALID_EXPERIENCE_LEVELS.includes(value as ExperienceLevel)
  );
}

function isValidSortOption(value: string | null): value is SortOption {
  return value !== null && VALID_SORT_OPTIONS.includes(value as SortOption);
}

function isValidSeason(value: string | null): value is SeasonFilter {
  return value !== null && VALID_SEASONS.includes(value as SeasonFilter);
}

function isValidTripType(value: string | null): value is TripTypeFilter {
  return value !== null && VALID_TRIP_TYPES.includes(value as TripTypeFilter);
}

// =============================================================================
// Store Implementation
// =============================================================================

export const useShakedownFilters = create<ShakedownFilterState>()(
  persist(
    (set, get) => ({
      // Initial state
      status: DEFAULT_FILTERS.status,
      experienceLevel: DEFAULT_FILTERS.experienceLevel,
      search: DEFAULT_FILTERS.search,
      sort: DEFAULT_FILTERS.sort,
      friendsFirst: DEFAULT_FILTERS.friendsFirst,
      season: DEFAULT_FILTERS.season,
      tripType: DEFAULT_FILTERS.tripType,

      // Actions
      setStatus: (status) => set({ status }),

      setExperienceLevel: (experienceLevel) => set({ experienceLevel }),

      setSearch: (search) => set({ search }),

      setSort: (sort) => set({ sort }),

      setFriendsFirst: (friendsFirst) => set({ friendsFirst }),

      setSeason: (season) => set({ season }),

      setTripType: (tripType) => set({ tripType }),

      clearFilters: () =>
        set({
          status: DEFAULT_FILTERS.status,
          experienceLevel: DEFAULT_FILTERS.experienceLevel,
          search: DEFAULT_FILTERS.search,
          sort: DEFAULT_FILTERS.sort,
          friendsFirst: DEFAULT_FILTERS.friendsFirst,
          season: DEFAULT_FILTERS.season,
          tripType: DEFAULT_FILTERS.tripType,
        }),

      hasActiveFilters: () => {
        const state = get();
        return !!(
          state.status !== null ||
          state.experienceLevel !== null ||
          state.search.trim() !== '' ||
          state.season !== null ||
          state.tripType !== null ||
          state.friendsFirst === true ||
          state.sort !== 'recent'
        );
      },

      setFiltersFromUrl: (params) => {
        const updates: Partial<ShakedownFilterState> = {};

        if (params.status !== undefined) {
          updates.status = isValidStatus(params.status) ? params.status : null;
        }

        if (params.experience !== undefined) {
          updates.experienceLevel = isValidExperienceLevel(params.experience)
            ? params.experience
            : null;
        }

        if (params.search !== undefined) {
          updates.search = params.search ?? '';
        }

        if (params.sort !== undefined) {
          updates.sort = isValidSortOption(params.sort)
            ? params.sort
            : DEFAULT_FILTERS.sort;
        }

        if (params.friendsFirst !== undefined) {
          updates.friendsFirst = params.friendsFirst === 'true';
        }

        if (params.season !== undefined) {
          updates.season = isValidSeason(params.season) ? params.season : null;
        }

        if (params.tripType !== undefined) {
          updates.tripType = isValidTripType(params.tripType)
            ? params.tripType
            : null;
        }

        set(updates as ShakedownFilterState);
      },
    }),
    {
      name: 'gearshack-shakedown-filters',
      version: 1,
      partialize: (state) => ({
        // Only persist these values, not actions
        status: state.status,
        experienceLevel: state.experienceLevel,
        search: state.search,
        sort: state.sort,
        friendsFirst: state.friendsFirst,
        season: state.season,
        tripType: state.tripType,
      }),
    }
  )
);

// =============================================================================
// URL Sync Hook
// =============================================================================

/**
 * Hook to sync filter state with URL parameters for shareability
 *
 * Usage:
 * ```tsx
 * const { filterUrl, syncFromUrl, updateUrl } = useFilteredShakedownsUrl();
 *
 * // On mount, sync filters from URL (only once)
 * useEffect(() => {
 *   syncFromUrl();
 * }, []); // Empty deps - syncFromUrl is stable
 *
 * // Update URL when filters change
 * useEffect(() => {
 *   updateUrl();
 * }, [filterUrl, updateUrl]);
 * ```
 */
export function useFilteredShakedownsUrl() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  // Use individual selectors to avoid infinite loops
  const status = useShakedownFilters((state) => state.status);
  const experienceLevel = useShakedownFilters((state) => state.experienceLevel);
  const search = useShakedownFilters((state) => state.search);
  const sort = useShakedownFilters((state) => state.sort);
  const friendsFirst = useShakedownFilters((state) => state.friendsFirst);
  const season = useShakedownFilters((state) => state.season);
  const tripType = useShakedownFilters((state) => state.tripType);
  const setFiltersFromUrl = useShakedownFilters((state) => state.setFiltersFromUrl);

  /**
   * Build URL with current filter state
   */
  const filterUrl = useMemo(() => {
    const params = new URLSearchParams();

    if (status) {
      params.set('status', status);
    }

    if (experienceLevel) {
      params.set('experience', experienceLevel);
    }

    if (search.trim()) {
      params.set('search', search.trim());
    }

    if (sort !== 'recent') {
      params.set('sort', sort);
    }

    if (friendsFirst) {
      params.set('friendsFirst', 'true');
    }

    if (season) {
      params.set('season', season);
    }

    if (tripType) {
      params.set('tripType', tripType);
    }

    const queryString = params.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  }, [
    status,
    experienceLevel,
    search,
    sort,
    friendsFirst,
    season,
    tripType,
    pathname,
  ]);

  /**
   * Sync filter state from current URL params
   * Uses stable reference - safe to call without causing infinite loops
   */
  const syncFromUrl = useCallback(() => {
    setFiltersFromUrl({
      status: searchParams.get('status'),
      experience: searchParams.get('experience'),
      search: searchParams.get('search'),
      sort: searchParams.get('sort'),
      friendsFirst: searchParams.get('friendsFirst'),
      season: searchParams.get('season'),
      tripType: searchParams.get('tripType'),
    });
  }, [searchParams, setFiltersFromUrl]);

  /**
   * Update URL with current filter state (shallow navigation)
   */
  const updateUrl = useCallback(() => {
    router.replace(filterUrl, { scroll: false });
  }, [router, filterUrl]);

  /**
   * Get shareable URL with current filters
   */
  const getShareableUrl = useCallback(() => {
    if (typeof window === 'undefined') return filterUrl;
    return `${window.location.origin}${filterUrl}`;
  }, [filterUrl]);

  return {
    /** URL path with query params for current filters */
    filterUrl,
    /** Sync filter store from URL search params */
    syncFromUrl,
    /** Update browser URL to match filter state */
    updateUrl,
    /** Get full shareable URL with filters */
    getShareableUrl,
  };
}

// =============================================================================
// Selector Hooks (for optimized re-renders)
// =============================================================================

/**
 * Returns only the active filter count for badges/indicators
 */
export function useActiveFilterCount(): number {
  return useShakedownFilters((state) => {
    let count = 0;
    if (state.status !== null) count++;
    if (state.experienceLevel !== null) count++;
    if (state.search.trim() !== '') count++;
    if (state.season !== null) count++;
    if (state.tripType !== null) count++;
    if (state.friendsFirst) count++;
    if (state.sort !== 'recent') count++;
    return count;
  });
}

/**
 * Returns filter values formatted for the useShakedowns hook
 */
export function useShakedownFiltersForQuery() {
  const status = useShakedownFilters((state) => state.status);
  const experienceLevel = useShakedownFilters((state) => state.experienceLevel);
  const search = useShakedownFilters((state) => state.search);
  const friendsFirst = useShakedownFilters((state) => state.friendsFirst);

  return useMemo(
    () => ({
      status: status ?? undefined,
      experienceLevel: experienceLevel ?? undefined,
      search: search || undefined,
      friendsFirst: friendsFirst || undefined,
    }),
    [status, experienceLevel, search, friendsFirst]
  );
}

export default useShakedownFilters;
