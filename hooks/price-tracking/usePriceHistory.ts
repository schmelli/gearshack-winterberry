/**
 * Custom hook for historical price data
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPriceHistory } from '@/lib/supabase/price-tracking-queries';
import { HISTORY_CONFIG } from '@/lib/constants/price-tracking';
import type { PriceHistoryEntry } from '@/types/price-tracking';

interface UsePriceHistoryResult {
  history: PriceHistoryEntry[];
  isLoading: boolean;
  error: Error | null;
  fetchHistory: (days?: number) => Promise<void>;
}

export function usePriceHistory(trackingId: string): UsePriceHistoryResult {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Manual fetch function for re-fetching with different days
  const fetchHistory = useCallback(async (days: number = HISTORY_CONFIG.DEFAULT_DISPLAY_DAYS) => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getPriceHistory(trackingId, days);
      setHistory(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [trackingId]);

  // Initial fetch with race condition protection
  useEffect(() => {
    if (!trackingId) {
      setIsLoading(false);
      return;
    }

    let isCancelled = false;

    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getPriceHistory(trackingId, HISTORY_CONFIG.DEFAULT_DISPLAY_DAYS);
        if (!isCancelled) {
          setHistory(data);
        }
      } catch (err) {
        if (!isCancelled) {
          setError(err as Error);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadHistory();

    return () => {
      isCancelled = true;
    };
  }, [trackingId]);

  return {
    history,
    isLoading,
    error,
    fetchHistory,
  };
}
