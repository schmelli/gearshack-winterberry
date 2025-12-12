/**
 * Loadout Search Schema
 *
 * Feature: 007-grand-polish-sprint
 * Defines the search/filter state for loadouts dashboard
 */

import { z } from 'zod';

// =============================================================================
// Season Type (re-exported for convenience)
// =============================================================================

export const seasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);
export type Season = z.infer<typeof seasonSchema>;

// =============================================================================
// Search Filter State Schema
// =============================================================================

export const loadoutSearchStateSchema = z.object({
  /** Text query for filtering by name */
  searchQuery: z.string().default(''),

  /** Season filter (null = all seasons) */
  seasonFilter: seasonSchema.nullable().default(null),
});

export type LoadoutSearchState = z.infer<typeof loadoutSearchStateSchema>;

// =============================================================================
// Search Result Schema
// =============================================================================

export const loadoutSearchResultSchema = z.object({
  /** Filtered loadouts matching search criteria */
  filteredLoadouts: z.array(z.object({
    id: z.string().uuid(),
    name: z.string(),
    tripDate: z.date().nullable(),
    itemCount: z.number().nonnegative(),
    seasons: z.array(seasonSchema).optional(),
  })),

  /** Total count before filtering */
  totalCount: z.number().nonnegative(),

  /** Count after filtering */
  filteredCount: z.number().nonnegative(),
});

export type LoadoutSearchResult = z.infer<typeof loadoutSearchResultSchema>;

// =============================================================================
// Hook Return Type
// =============================================================================

/**
 * Return type for useLoadoutSearch hook
 */
export interface UseLoadoutSearchReturn {
  /** Loadouts matching current filters */
  filteredLoadouts: Array<{
    id: string;
    name: string;
    tripDate: Date | null;
    itemCount: number;
    seasons?: Season[];
  }>;

  /** Current search query */
  searchQuery: string;

  /** Update search query */
  setSearchQuery: (query: string) => void;

  /** Current season filter (null = all) */
  seasonFilter: Season | null;

  /** Update season filter */
  setSeasonFilter: (season: Season | null) => void;

  /** Clear all filters */
  clearFilters: () => void;

  /** Whether any filter is active */
  hasActiveFilters: boolean;
}
