'use client';

/**
 * useBadges Hook
 *
 * Feature: 001-community-shakedowns
 * Task: T067
 *
 * Fetches and manages badges earned by a user through helpful feedback.
 * Badge thresholds:
 * - shakedown_helper: 10 helpful votes
 * - trail_expert: 50 helpful votes
 * - community_legend: 100 helpful votes
 *
 * Features:
 * - Auto-fetch on mount when userId is provided
 * - Computed properties for badge checks
 * - Manual refresh capability
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { ShakedownBadge } from '@/types/shakedown';

// =============================================================================
// Types
// =============================================================================

export interface ShakedownBadgeAward {
  id: string;
  badgeType: ShakedownBadge;
  awardedAt: string;
  metadata?: Record<string, unknown>;
}

interface BadgesState {
  badges: ShakedownBadgeAward[];
  isLoading: boolean;
  error: Error | null;
}

export interface UseBadgesReturn {
  badges: ShakedownBadgeAward[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  hasBadge: (badgeType: ShakedownBadge) => boolean;
  highestBadge: ShakedownBadge | null;
}

// =============================================================================
// Database Row Types (snake_case from API)
// =============================================================================

interface BadgeDbRow {
  id: string;
  user_id: string;
  badge_type: ShakedownBadge;
  awarded_at: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Badge tier order from highest to lowest
 * Used for determining the highest badge a user has earned
 */
const BADGE_TIER_ORDER: readonly ShakedownBadge[] = [
  'community_legend',
  'trail_expert',
  'shakedown_helper',
] as const;

// =============================================================================
// Transform Helpers
// =============================================================================

function transformBadgeFromDb(row: BadgeDbRow): ShakedownBadgeAward {
  return {
    id: row.id,
    badgeType: row.badge_type,
    awardedAt: row.awarded_at,
    metadata: row.metadata,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useBadges(userId?: string | null): UseBadgesReturn {
  const [state, setState] = useState<BadgesState>({
    badges: [],
    isLoading: false,
    error: null,
  });

  // =============================================================================
  // Fetch Badges
  // =============================================================================

  const fetchBadges = useCallback(async () => {
    if (!userId) {
      setState({
        badges: [],
        isLoading: false,
        error: null,
      });
      return;
    }

    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(`/api/shakedowns/badges?userId=${encodeURIComponent(userId)}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to fetch badges (${response.status})`);
      }

      const data = await response.json();
      const badges = (data.badges as BadgeDbRow[]).map(transformBadgeFromDb);

      setState({
        badges,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch badges');
      console.error('[useBadges] Fetch error:', error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error,
      }));
    }
  }, [userId]);

  // Auto-fetch on mount when userId is provided
  useEffect(() => {
    if (userId) {
      fetchBadges();
    }
  }, [userId, fetchBadges]);

  // =============================================================================
  // Computed: Badge Set for O(1) lookups
  // =============================================================================

  const badgeSet = useMemo(() => {
    return new Set(state.badges.map((b) => b.badgeType));
  }, [state.badges]);

  // =============================================================================
  // hasBadge Check
  // =============================================================================

  const hasBadge = useCallback(
    (badgeType: ShakedownBadge): boolean => {
      return badgeSet.has(badgeType);
    },
    [badgeSet]
  );

  // =============================================================================
  // Computed: Highest Badge
  // =============================================================================

  const highestBadge = useMemo((): ShakedownBadge | null => {
    if (state.badges.length === 0) {
      return null;
    }

    // Find the first badge in tier order that the user has
    for (const tier of BADGE_TIER_ORDER) {
      if (badgeSet.has(tier)) {
        return tier;
      }
    }

    return null;
  }, [state.badges.length, badgeSet]);

  // =============================================================================
  // Return Value
  // =============================================================================

  return useMemo(
    () => ({
      badges: state.badges,
      isLoading: state.isLoading,
      error: state.error,
      refresh: fetchBadges,
      hasBadge,
      highestBadge,
    }),
    [state.badges, state.isLoading, state.error, fetchBadges, hasBadge, highestBadge]
  );
}

export default useBadges;
