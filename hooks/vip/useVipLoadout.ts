/**
 * useVipLoadout Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T018
 *
 * Fetches a single VIP loadout with all items.
 * Handles loading states, error handling, and bookmark status.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getVipLoadout } from '@/lib/vip/vip-service';
import type { VipLoadoutWithItems } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseVipLoadoutState {
  status: 'idle' | 'loading' | 'success' | 'error';
  loadout: VipLoadoutWithItems | null;
  error: string | null;
}

interface UseVipLoadoutReturn extends UseVipLoadoutState {
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipLoadout(
  vipSlug: string | undefined,
  loadoutSlug: string | undefined
): UseVipLoadoutReturn {
  const [state, setState] = useState<UseVipLoadoutState>({
    status: 'idle',
    loadout: null,
    error: null,
  });

  const fetchLoadout = useCallback(async () => {
    if (!vipSlug || !loadoutSlug) {
      setState({ status: 'idle', loadout: null, error: null });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const loadout = await getVipLoadout(vipSlug, loadoutSlug);

      if (!loadout) {
        setState({
          status: 'error',
          loadout: null,
          error: 'Loadout not found',
        });
        return;
      }

      setState({
        status: 'success',
        loadout,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load loadout';
      console.error('Error loading VIP loadout:', err);
      setState({
        status: 'error',
        loadout: null,
        error: message,
      });
    }
  }, [vipSlug, loadoutSlug]);

  // Fetch on mount and when slugs change
  useEffect(() => {
    if (!vipSlug || !loadoutSlug) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset state when slugs are missing
      setState({ status: 'idle', loadout: null, error: null });
      return;
    }

    let isCancelled = false;

    const doFetch = async () => {
      setState((prev) => ({ ...prev, status: 'loading', error: null }));

      try {
        const loadout = await getVipLoadout(vipSlug, loadoutSlug);

        // Check if cancelled before updating state
        if (isCancelled) return;

        if (!loadout) {
          setState({
            status: 'error',
            loadout: null,
            error: 'Loadout not found',
          });
          return;
        }

        setState({
          status: 'success',
          loadout,
          error: null,
        });
      } catch (err) {
        // Only handle error if not cancelled
        if (isCancelled) return;

        const message = err instanceof Error ? err.message : 'Failed to load loadout';
        console.error('Error loading VIP loadout:', err);
        setState({
          status: 'error',
          loadout: null,
          error: message,
        });
      }
    };

    doFetch();

    return () => {
      isCancelled = true;
    };
  }, [vipSlug, loadoutSlug]);

  return {
    ...state,
    refetch: fetchLoadout,
  };
}

export default useVipLoadout;
