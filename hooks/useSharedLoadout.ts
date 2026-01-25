/**
 * useSharedLoadout Hook
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T012
 *
 * Orchestration hook for fetching a shared loadout with owner data.
 * Used on the shakedown page to display shared loadouts.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSharedLoadoutWithOwner } from '@/lib/supabase/queries/sharing';
import type { SharedLoadoutWithOwner } from '@/types/sharing';

// =============================================================================
// Types
// =============================================================================

export interface UseSharedLoadoutResult {
  /** The shared loadout with owner data */
  sharedLoadout: SharedLoadoutWithOwner | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Fetches a shared loadout with owner profile data
 *
 * @param shareToken - The unique share token for the loadout
 * @returns Object containing sharedLoadout, isLoading, and error
 */
export function useSharedLoadout(shareToken: string): UseSharedLoadoutResult {
  const [sharedLoadout, setSharedLoadout] = useState<SharedLoadoutWithOwner | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  // Fetch shared loadout with owner
  const fetchSharedLoadout = useCallback(async () => {
    if (!shareToken) {
      setSharedLoadout(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getSharedLoadoutWithOwner(supabase, shareToken);

      if (!data) {
        setError(new Error('Shared loadout not found'));
        setSharedLoadout(null);
      } else {
        setSharedLoadout(data);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch shared loadout';
      console.error('Error fetching shared loadout:', err);
      setError(new Error(errorMessage));
      setSharedLoadout(null);
    } finally {
      setIsLoading(false);
    }
  }, [shareToken, supabase]);

  // Initial fetch
  useEffect(() => {
    fetchSharedLoadout();
  }, [fetchSharedLoadout]);

  return {
    sharedLoadout,
    isLoading,
    error,
  };
}
