/**
 * useFeaturedVips Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T019
 *
 * Fetches featured VIPs for the Community page.
 * Optimized for homepage display with limited count.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getFeaturedVips } from '@/lib/vip/vip-service';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseFeaturedVipsState {
  status: 'idle' | 'loading' | 'success' | 'error';
  vips: VipWithStats[];
  error: string | null;
}

interface UseFeaturedVipsReturn extends UseFeaturedVipsState {
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useFeaturedVips(limit: number = 6): UseFeaturedVipsReturn {
  const [state, setState] = useState<UseFeaturedVipsState>({
    status: 'idle',
    vips: [],
    error: null,
  });

  const fetchFeaturedVips = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const vips = await getFeaturedVips(limit);

      setState({
        status: 'success',
        vips,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load featured VIPs';
      console.error('Error loading featured VIPs:', err);
      setState({
        status: 'error',
        vips: [],
        error: message,
      });
    }
  }, [limit]);

  // Fetch on mount
  useEffect(() => {
    fetchFeaturedVips();
  }, [fetchFeaturedVips]);

  return {
    ...state,
    refetch: fetchFeaturedVips,
  };
}

export default useFeaturedVips;
