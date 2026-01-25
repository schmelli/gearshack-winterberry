/**
 * Dashboard Summary Hook
 *
 * Feature: Community Section Restructure
 *
 * Fetches summary counts for the community dashboard:
 * - Recent shakedowns (last 7 days)
 * - New marketplace listings (last 7 days)
 * - Wiki updates (placeholder until wiki is implemented)
 */

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface DashboardSummary {
  recentShakedowns: number;
  newListings: number;
  wikiUpdates: number;
}

interface UseDashboardSummaryReturn {
  summary: DashboardSummary;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DEFAULT_SUMMARY: DashboardSummary = {
  recentShakedowns: 0,
  newListings: 0,
  wikiUpdates: 0,
};

/**
 * Hook for fetching community dashboard summary data
 */
export function useDashboardSummary(): UseDashboardSummaryReturn {
  const [summary, setSummary] = useState<DashboardSummary>(DEFAULT_SUMMARY);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Calculate date 7 days ago
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const sevenDaysAgoISO = sevenDaysAgo.toISOString();

      // Fetch recent shakedowns count (last 7 days, public only)
      const { count: shakedownCount, error: shakedownError } = await supabase
        .from('shakedowns')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', sevenDaysAgoISO)
        .eq('privacy', 'public')
        .eq('is_hidden', false);

      if (shakedownError) {
        console.error('Error fetching shakedowns count:', shakedownError);
      }

      // Fetch new marketplace listings count (last 7 days)
      const { count: listingsCount, error: listingsError } = await supabase
        .from('v_marketplace_listings')
        .select('*', { count: 'exact', head: true })
        .gte('listed_at', sevenDaysAgoISO);

      if (listingsError) {
        console.error('Error fetching listings count:', listingsError);
      }

      // Wiki updates - placeholder until wiki is implemented
      const wikiCount = 0;

      setSummary({
        recentShakedowns: shakedownCount ?? 0,
        newListings: listingsCount ?? 0,
        wikiUpdates: wikiCount,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch summary';
      setError(message);
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  return {
    summary,
    isLoading,
    error,
    refetch: fetchSummary,
  };
}
