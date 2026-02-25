/**
 * useAdminVips Hook
 *
 * Feature: 052-vip-loadouts
 * Task: T039
 *
 * Fetches all VIPs for admin management (including archived).
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getAllVips } from '@/lib/vip/vip-admin-service';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface UseAdminVipsState {
  status: 'idle' | 'loading' | 'success' | 'error';
  vips: VipWithStats[];
  error: string | null;
}

interface UseAdminVipsReturn extends UseAdminVipsState {
  refetch: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useAdminVips(): UseAdminVipsReturn {
  const [state, setState] = useState<UseAdminVipsState>({
    status: 'idle',
    vips: [],
    error: null,
  });

  const fetchVips = useCallback(async () => {
    setState((prev) => ({ ...prev, status: 'loading', error: null }));

    try {
      const vips = await getAllVips();

      setState({
        status: 'success',
        vips,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load VIPs';
      console.error('Error loading VIPs for admin:', err);
      setState({
        status: 'error',
        vips: [],
        error: message,
      });
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    const controller = new AbortController();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetching pattern
    fetchVips();
    return () => controller.abort();
  }, [fetchVips]);

  return {
    ...state,
    refetch: fetchVips,
  };
}

export default useAdminVips;
