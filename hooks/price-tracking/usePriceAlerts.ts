/**
 * Custom hook for price alerts
 * Feature: 050-price-tracking (US2)
 * Date: 2025-12-17
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PriceAlert } from '@/types/price-tracking';

interface UsePriceAlertsResult {
  alerts: PriceAlert[];
  unreadCount: number;
  isLoading: boolean;
  error: Error | null;
  markAsRead: (alertId: string) => Promise<void>;
  markAsClicked: (alertId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function usePriceAlerts(): UsePriceAlertsResult {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadAlerts = async () => {
      try {
        if (mounted) setIsLoading(true);
        if (mounted) setError(null);

        const supabase = createClient();
        const { data, error: alertsError } = await supabase
          .from('price_alerts')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);

        if (alertsError) throw alertsError;
        // Cast through unknown as DB schema may differ from client type
        if (mounted) setAlerts((data || []) as unknown as PriceAlert[]);
      } catch (err) {
        if (mounted) setError(err as Error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  // Refresh function that can be called manually
  const refresh = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();
      const { data, error: alertsError } = await supabase
        .from('price_alerts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;
      setAlerts((data || []) as unknown as PriceAlert[]);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (alertId: string) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('price_alerts')
        .update({ opened_at: new Date().toISOString() })
        .eq('id', alertId)
        .is('opened_at', null);

      if (error) throw error;
      await refresh();
    } catch (err) {
      setError(err as Error);
    }
  };

  const markAsClicked = async (alertId: string) => {
    try {
      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any)
        .from('price_alerts')
        .update({ clicked_at: new Date().toISOString() })
        .eq('id', alertId)
        .is('clicked_at', null);

      if (error) throw error;
      await refresh();
    } catch (err) {
      setError(err as Error);
    }
  };

  const unreadCount = alerts.filter(alert => !alert.opened_at).length;

  return {
    alerts,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    markAsClicked,
    refresh,
  };
}
