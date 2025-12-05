/**
 * useLoadoutSearch - Hook for searching and filtering loadouts
 *
 * Feature: 007-grand-polish-sprint
 * US8: Loadouts Dashboard Search
 * Provides search by name and filter by season functionality
 */

'use client';

import { useState, useMemo } from 'react';
import type { Loadout, Season } from '@/types/loadout';

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
  /** Clear all filters */
  clearFilters: () => void;
  /** Whether any filters are active */
  hasActiveFilters: boolean;
  /** Filtered loadouts based on search and filters */
  filteredLoadouts: Loadout[];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutSearch(loadouts: Loadout[]): UseLoadoutSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');
  const [seasonFilter, setSeasonFilter] = useState<Season | null>(null);

  // Calculate filtered loadouts
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

    return filtered;
  }, [loadouts, searchQuery, seasonFilter]);

  // Check if any filters are active
  const hasActiveFilters = searchQuery.trim() !== '' || seasonFilter !== null;

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setSeasonFilter(null);
  };

  return {
    searchQuery,
    setSearchQuery,
    seasonFilter,
    setSeasonFilter,
    clearFilters,
    hasActiveFilters,
    filteredLoadouts,
  };
}
