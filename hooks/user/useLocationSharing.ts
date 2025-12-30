/**
 * useLocationSharing Hook
 *
 * Feature: 053-merchant-integration
 * Task: T029
 *
 * Manages user's location sharing preferences with merchants.
 * Handles fetching, updating, and caching location consent settings.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { LocationGranularity } from '@/types/merchant';

/**
 * Helper to get supabase client with any typing for merchant tables
 * TODO: Remove after regenerating types from migrations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMerchantClient(): any {
  return createClient();
}

// =============================================================================
// Types
// =============================================================================

export interface LocationShare {
  merchantId: string;
  granularity: LocationGranularity;
  latitude: number | null;
  longitude: number | null;
  updatedAt: string;
}

export interface UseLocationSharingReturn {
  /** Get location sharing for a specific merchant */
  getShareForMerchant: (merchantId: string) => LocationShare | undefined;
  /** Update location sharing for a merchant */
  updateShare: (
    merchantId: string,
    granularity: LocationGranularity
  ) => Promise<boolean>;
  /** Remove location sharing for a merchant */
  removeShare: (merchantId: string) => Promise<boolean>;
  /** All location shares for current user */
  shares: LocationShare[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Refresh data from server */
  refresh: () => Promise<void>;
}

// =============================================================================
// Helper: Get User Location
// =============================================================================

async function getUserLocation(): Promise<{
  latitude: number;
  longitude: number;
} | null> {
  if (!navigator.geolocation) {
    return null;
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      () => {
        // User denied or error
        resolve(null);
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes cache
      }
    );
  });
}

// =============================================================================
// Hook
// =============================================================================

export function useLocationSharing(): UseLocationSharingReturn {
  const [shares, setShares] = useState<LocationShare[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all location shares for current user
  const fetchShares = useCallback(async () => {
    const supabase = getMerchantClient();

    try {
      setIsLoading(true);
      setError(null);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setShares([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from('user_location_shares')
        .select('merchant_id, granularity, location, updated_at')
        .eq('user_id', user.id);

      if (fetchError) throw fetchError;

      // Transform data - extract lat/lng from PostGIS point
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed: LocationShare[] = (data ?? []).map((row: any) => ({
        merchantId: row.merchant_id,
        granularity: row.granularity as LocationGranularity,
        latitude: row.location ? parseFloat(row.location.split('(')[1]?.split(' ')[1] ?? '0') : null,
        longitude: row.location ? parseFloat(row.location.split('(')[1]?.split(' ')[0] ?? '0') : null,
        updatedAt: row.updated_at,
      }));

      setShares(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load location shares';
      setError(message);
      console.error('Failed to fetch location shares:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchShares();
  }, [fetchShares]);

  // Get share for a specific merchant
  const getShareForMerchant = useCallback(
    (merchantId: string): LocationShare | undefined => {
      return shares.find((s) => s.merchantId === merchantId);
    },
    [shares]
  );

  // Update location share for a merchant
  const updateShare = useCallback(
    async (
      merchantId: string,
      granularity: LocationGranularity
    ): Promise<boolean> => {
      const supabase = getMerchantClient();

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          toast.error('Please sign in to save preferences');
          return false;
        }

        // Get user's location if needed
        let locationPoint: string | null = null;
        if (granularity !== 'none') {
          const coords = await getUserLocation();
          if (coords) {
            // PostGIS point format: POINT(lng lat)
            locationPoint = `POINT(${coords.longitude} ${coords.latitude})`;
          }
        }

        // Upsert the share
        const { error: upsertError } = await supabase
          .from('user_location_shares')
          .upsert(
            {
              user_id: user.id,
              merchant_id: merchantId,
              granularity,
              location: locationPoint,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'user_id,merchant_id' }
          );

        if (upsertError) throw upsertError;

        // Update local state
        setShares((prev) => {
          const filtered = prev.filter((s) => s.merchantId !== merchantId);
          if (granularity === 'none') {
            // Don't add back if 'none' selected
            return filtered;
          }
          return [
            ...filtered,
            {
              merchantId,
              granularity,
              latitude: locationPoint ? parseFloat(locationPoint.split(' ')[1] ?? '0') : null,
              longitude: locationPoint ? parseFloat(locationPoint.split('(')[1]?.split(' ')[0] ?? '0') : null,
              updatedAt: new Date().toISOString(),
            },
          ];
        });

        toast.success('Location preference saved');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to save preference';
        toast.error(message);
        console.error('Failed to update location share:', err);
        return false;
      }
    },
    []
  );

  // Remove location share for a merchant
  const removeShare = useCallback(async (merchantId: string): Promise<boolean> => {
    const supabase = getMerchantClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return false;

      const { error: deleteError } = await supabase
        .from('user_location_shares')
        .delete()
        .eq('user_id', user.id)
        .eq('merchant_id', merchantId);

      if (deleteError) throw deleteError;

      // Update local state
      setShares((prev) => prev.filter((s) => s.merchantId !== merchantId));

      return true;
    } catch (err) {
      console.error('Failed to remove location share:', err);
      return false;
    }
  }, []);

  return {
    shares,
    isLoading,
    error,
    getShareForMerchant,
    updateShare,
    removeShare,
    refresh: fetchShares,
  };
}
