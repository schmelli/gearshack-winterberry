/**
 * useLoadoutSearch - Hook for searching, filtering, and sorting loadouts
 *
 * Feature: 007-grand-polish-sprint
 * US8: Loadouts Dashboard Search
 * Provides search by name and filter by season functionality
 *
 * Feature: 017-loadouts-search-filter
 * Extended with activity filter and sort options
 */

'use client';

import { useState, useMemo } from 'react';
import type { Loadout, Season, ActivityType, LoadoutSortOption } from '@/types/loadout';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface UseLoadoutSearchReturn {
  /** Current search query */
  searchQuery: string;
  /** Set search query */
  setSearchQuery: (query: string) => void;
  /** Current season filter */
  seasonFilter: Season | null;
  /** Set season filter */
  setSeasonFilter: (season: Season | null) => void;
  /** Current activity filter (Feature: 017) */
  activityFilter: ActivityType | null;
  /** Set activity filter (Feature: 017) */
  setActivityFilter: (activity: ActivityType | null) => void;
  /** Current sort option (Feature: 017) */
  sortOption: LoadoutSortOption;
  /** Set sort option (Feature: 017) */
  setSortOption: (option: LoadoutSortOption) => void;
  /** Clear all filters */
  clearFilters: () => void;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Filtered and sorted loadouts */
  filteredLoadouts: Loadout[];
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate total weight of a loadout from its items
 */
function getLoadoutWeight(loadout: Loadout, items: GearItem[]): number {
  return loadout.itemIds.reduce((sum, id) => {
    const item = items.find((i) => i.id === id);
    return sum + (item?.weightGrams ?? 0);
  }, 0);
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutSearch(
  loadouts: Loadout[],
  items: GearItem[] = []
): UseLoadoutSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season | null>(null);
  const [activityFilter, setActivityFilter] = useState<ActivityType | null>(null);
  const [sortOption, setSortOption] = useState<LoadoutSortOption>('date-newest');

  // Calculate filtered and sorted loadouts
  const filteredLoadouts = useMemo(() => {
    let filtered = [...loadouts];

    // Apply search filter (name matching, case-insensitive)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter((loadout) =>
        loadout.name.toLowerCase().includes(query)
      );
    }

    // Apply season filter
    if (seasonFilter) {
      filtered = filtered.filter(
        (loadout) =>
          loadout.seasons && loadout.seasons.includes(seasonFilter)
      );
    }

    // Apply activity filter (Feature: 017)
    if (activityFilter) {
      filtered = filtered.filter(
        (loadout) =>
          loadout.activityTypes && loadout.activityTypes.includes(activityFilter)
      );
    }

    // Apply sorting (Feature: 017)
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-newest':
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case 'date-oldest':
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        case 'weight-lightest':
          return getLoadoutWeight(a, items) - getLoadoutWeight(b, items);
        case 'weight-heaviest':
          return getLoadoutWeight(b, items) - getLoadoutWeight(a, items);
        default:
          return 0;
      }
    });

    return filtered;
  }, [loadouts, items, searchQuery, seasonFilter, activityFilter, sortOption]);

  // Check if any filters are active (Feature: 017 - includes activity and non-default sort)
  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    seasonFilter !== null ||
    activityFilter !== null ||
    sortOption !== 'date-newest';

  // Clear all filters (Feature: 017 - resets sort to default)
  const clearFilters = () => {
    setSearchQuery('');
    setSeasonFilter(null);
    setActivityFilter(null);
    setSortOption('date-newest');
  };

  return {
    searchQuery,
    setSearchQuery,
    seasonFilter,
    setSeasonFilter,
    activityFilter,
    setActivityFilter,
    sortOption,
    setSortOption,
    clearFilters,
    hasActiveFilters,
    filteredLoadouts,
  };
}
