/**
 * useVipProfile Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T017
 *
 * Fetches VIP profile data by slug, including loadouts list.
 * Handles loading states and error handling.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getVipBySlug } from '@/lib/vip/vip-service';
import type { VipProfile } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseVipProfileState {
  status: 'idle' | 'loading' | 'success' | 'error';
  vip: VipProfile | null;
  error: string | null;
}

interface UseVipProfileReturn extends UseVipProfileState {
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useVipProfile(slug: string | undefined): UseVipProfileReturn {
  const [state, setState] = useState<UseVipProfileState>({
    status: 'idle',
    vip: null,
    error: null,
  });

  const fetchVip = useCallback(async () => {
    if (!slug) {
      setState({ status: 'idle', vip: null, error: null });
      return;
    }

    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const vip = await getVipBySlug(slug);

      if (!vip) {
        setState({
          status: 'error',
          vip: null,
          error: 'VIP not found',
        });
        return;
      }

      setState({
        status: 'success',
        vip,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load VIP profile';
      console.error('Error loading VIP profile:', err);
      setState({
        status: 'error',
        vip: null,
        error: message,
      });
    }
  }, [slug]);

  // Fetch on mount and when slug changes
  useEffect(() => {
    fetchVip();
  }, [fetchVip]);

  return {
    ...state,
    refetch: fetchVip,
  };
}

export default useVipProfile;
