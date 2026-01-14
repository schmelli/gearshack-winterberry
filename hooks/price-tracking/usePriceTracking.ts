/**
 * Custom hook for price tracking management
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  enablePriceTracking as enableTrackingQuery,
  disablePriceTracking as disableTrackingQuery,
  getPriceTrackingStatus,
  toggleAlerts as toggleAlertsQuery,
} from '@/lib/supabase/price-tracking-queries';
import type { PriceTracking } from '@/types/price-tracking';

interface UsePriceTrackingResult {
  tracking: PriceTracking | null;
  isLoading: boolean;
  error: Error | null;
  enableTracking: (alertsEnabled?: boolean) => Promise<void>;
  disableTracking: () => Promise<void>;
  toggleAlerts: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePriceTracking(gearItemId: string): UsePriceTrackingResult {
  const [tracking, setTracking] = useState<PriceTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadTrackingStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const status = await getPriceTrackingStatus(gearItemId);
      setTracking(status);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [gearItemId]);

  useEffect(() => {
    loadTrackingStatus();
  }, [loadTrackingStatus]);

  const enableTracking = async (alertsEnabled: boolean = true) => {
    try {
      setIsLoading(true);
      setError(null);
      const newTracking = await enableTrackingQuery({
        gear_item_id: gearItemId,
        alerts_enabled: alertsEnabled,
      });
      setTracking(newTracking);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const disableTracking = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await disableTrackingQuery(gearItemId);
      setTracking(null);
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAlerts = async (enabled: boolean) => {
    if (!tracking) return;

    try {
      setError(null);
      const updated = await toggleAlertsQuery(tracking.id, enabled);
      setTracking(updated);
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    tracking,
    isLoading,
    error,
    enableTracking,
    disableTracking,
    toggleAlerts,
    refresh: loadTrackingStatus,
  };
}
