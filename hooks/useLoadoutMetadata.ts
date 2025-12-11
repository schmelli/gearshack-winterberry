/**
 * useLoadoutMetadata - Hook for managing loadout metadata (activity types, seasons)
 *
 * Feature: 006-ui-makeover
 * FR-007: Interactive activity badges
 * FR-008: Interactive season badges
 * FR-010: Persist badge selections with loadout
 */

'use client';

import { useCallback } from 'react';
import { useStore } from '@/hooks/useSupabaseStore';
import type { ActivityType, Season } from '@/types/loadout';

// =============================================================================
// Types
// =============================================================================

interface UseLoadoutMetadataReturn {
  /** Currently selected activity types */
  activityTypes: ActivityType[];
  /** Currently selected seasons */
  seasons: Season[];
  /** Toggle an activity type on/off */
  toggleActivity: (activity: ActivityType) => void;
  /** Toggle a season on/off */
  toggleSeason: (season: Season) => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useLoadoutMetadata(loadoutId: string): UseLoadoutMetadataReturn {
  const loadout = useStore((state) =>
    state.loadouts.find((l) => l.id === loadoutId)
  );
  const updateLoadoutMetadata = useStore((state) => state.updateLoadoutMetadata);

  const activityTypes = loadout?.activityTypes ?? [];
  const seasons = loadout?.seasons ?? [];

  const toggleActivity = useCallback(
    (activity: ActivityType) => {
      const current = loadout?.activityTypes ?? [];
      const newActivities = current.includes(activity)
        ? current.filter((a) => a !== activity)
        : [...current, activity];
      updateLoadoutMetadata(loadoutId, { activityTypes: newActivities });
    },
    [loadoutId, loadout?.activityTypes, updateLoadoutMetadata]
  );

  const toggleSeason = useCallback(
    (season: Season) => {
      const current = loadout?.seasons ?? [];
      const newSeasons = current.includes(season)
        ? current.filter((s) => s !== season)
        : [...current, season];
      updateLoadoutMetadata(loadoutId, { seasons: newSeasons });
    },
    [loadoutId, loadout?.seasons, updateLoadoutMetadata]
  );

  return {
    activityTypes,
    seasons,
    toggleActivity,
    toggleSeason,
  };
}
