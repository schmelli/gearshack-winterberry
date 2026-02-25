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
  toggleActivity: (activity: ActivityType) => Promise<void>;
  /** Toggle a season on/off */
  toggleSeason: (season: Season) => Promise<void>;
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
    async (activity: ActivityType) => {
      const current = loadout?.activityTypes ?? [];
      const newActivities = current.includes(activity)
        ? current.filter((a) => a !== activity)
        : [...current, activity];
      try {
        await updateLoadoutMetadata(loadoutId, { activityTypes: newActivities });
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutMetadata] Failed to toggle activity:', error);
      }
    },
    [loadoutId, loadout?.activityTypes, updateLoadoutMetadata]
  );

  const toggleSeason = useCallback(
    async (season: Season) => {
      const current = loadout?.seasons ?? [];
      const newSeasons = current.includes(season)
        ? current.filter((s) => s !== season)
        : [...current, season];
      try {
        await updateLoadoutMetadata(loadoutId, { seasons: newSeasons });
      } catch (error) {
        // Error toast is already shown by the store
        console.error('[LoadoutMetadata] Failed to toggle season:', error);
      }
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
