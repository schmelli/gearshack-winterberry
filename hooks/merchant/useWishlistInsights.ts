/**
 * useWishlistInsights Hook
 *
 * Feature: 053-merchant-integration
 * Task: T046
 *
 * Provides aggregate wishlist demand insights for merchants.
 * Uses proximity-based queries to show which products are on user wishlists nearby.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useMerchantAuth } from './useMerchantAuth';

/**
 * Helper to get supabase client with any typing for merchant tables
 * TODO: Remove after regenerating types from migrations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMerchantClient(): any {
  return createClient();
}
import { useMerchantLocations } from './useMerchantLocations';
import type { WishlistInsight, WishlistInsightDetail, ProximityBucket } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface InsightFilters {
  /** Radius in meters for proximity search */
  radiusMeters: number;
  /** Minimum user count to show */
  minUsers: number;
  /** Filter by category */
  categoryId?: string;
  /** Only show recent additions (last N days) */
  recentDays?: number;
  /** Pagination limit */
  limit?: number;
  /** Pagination offset */
  offset?: number;
}

export interface UseWishlistInsightsReturn {
  /** Aggregate insights by catalog item */
  insights: WishlistInsight[];
  /** Selected insight detail */
  selectedDetail: WishlistInsightDetail | null;
  /** Loading state */
  isLoading: boolean;
  /** Detail loading state */
  isLoadingDetail: boolean;
  /** Error message */
  error: string | null;
  /** Current filters */
  filters: InsightFilters;
  /** Update filters */
  setFilters: (filters: Partial<InsightFilters>) => void;
  /** Load detail for specific catalog item */
  loadInsightDetail: (catalogItemId: string) => Promise<void>;
  /** Clear selected detail */
  clearDetail: () => void;
  /** Refresh insights */
  refresh: () => Promise<void>;
  /** Primary location for proximity calculation */
  primaryLocation: { lat: number; lng: number } | null;
  /** Total user count across all insights */
  totalUserCount: number;
}

// Default filter values
const DEFAULT_FILTERS: InsightFilters = {
  radiusMeters: 50000, // 50km default
  minUsers: 1,
  recentDays: undefined,
  limit: 100,
  offset: 0,
};

// =============================================================================
// Hook
// =============================================================================

export function useWishlistInsights(): UseWishlistInsightsReturn {
  const { merchant } = useMerchantAuth();
  const { locations } = useMerchantLocations();

  const [insights, setInsights] = useState<WishlistInsight[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<WishlistInsightDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<InsightFilters>(DEFAULT_FILTERS);

  // Get primary location for proximity calculations
  const primaryLocation = useMemo(() => {
    const primary = locations.find((l) => l.isPrimary) ?? locations[0];
    if (!primary?.latitude || !primary?.longitude) return null;
    return { lat: primary.latitude, lng: primary.longitude };
  }, [locations]);

  // ---------------------------------------------------------------------------
  // Fetch Aggregate Insights
  // ---------------------------------------------------------------------------
  const fetchInsights = useCallback(async () => {
    if (!merchant?.id || !primaryLocation) {
      setInsights([]);
      return;
    }

    const supabase = getMerchantClient();

    try {
      setIsLoading(true);
      setError(null);

      // Use optimized RPC that includes catalog item details and pagination
      const { data: insightsData, error: rpcError } = await supabase.rpc(
        'get_wishlist_insights_with_catalog',
        {
          merchant_lat: primaryLocation.lat,
          merchant_lng: primaryLocation.lng,
          radius_meters: filters.radiusMeters,
          p_merchant_id: merchant.id,
          p_limit: filters.limit ?? 100,
        }
      );

      if (rpcError) throw rpcError;

      // Transform RPC results to WishlistInsight format
       
      const insightResults: WishlistInsight[] = (insightsData ?? [])
        .map((row: Record<string, unknown>) => ({
          catalogItemId: row.catalog_item_id as string,
          catalogItemName: row.catalog_item_name as string,
          catalogItemBrand: row.catalog_item_brand as string | null,
          userCount: Number(row.user_count),
          proximityBreakdown: {
            within5km: row.proximity_5km as number,
            within10km: row.proximity_10km as number,
            within25km: row.proximity_25km as number,
            within50km: row.proximity_50km as number,
            beyond50km: row.proximity_100km_plus as number,
          },
          recentAddCount: 0, // Would need additional calculation in RPC
        }))
        .filter((i: WishlistInsight) => i.userCount >= filters.minUsers);

      setInsights(insightResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wishlist insights';
      setError(message);
      console.error('Failed to fetch wishlist insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id, primaryLocation, filters.radiusMeters, filters.minUsers, filters.limit]);

  // Fetch on mount and dependency change
  useEffect(() => {
    if (primaryLocation) {
      fetchInsights();
    }
  }, [fetchInsights, primaryLocation]);

  // ---------------------------------------------------------------------------
  // Load Insight Detail
  // ---------------------------------------------------------------------------
  const loadInsightDetail = useCallback(
    async (catalogItemId: string) => {
      if (!merchant?.id || !primaryLocation) return;

      const supabase = getMerchantClient();

      try {
        setIsLoadingDetail(true);
        setError(null);

        // Get catalog item details
        const { data: catalogItem, error: itemError } = await supabase
          .from('merchant_catalog_items')
          .select('id, name, brand, price, image_url')
          .eq('id', catalogItemId)
          .eq('merchant_id', merchant.id)
          .single();

        if (itemError) throw itemError;

        // Get nearby users for this specific item
        const { data: nearbyData, error: rpcError } = await supabase.rpc(
          'get_wishlist_users_nearby',
          {
            merchant_lat: primaryLocation.lat,
            merchant_lng: primaryLocation.lng,
            radius_meters: filters.radiusMeters,
            p_catalog_item_id: catalogItemId,
          }
        );

        if (rpcError) throw rpcError;

        const detail: WishlistInsightDetail = {
          catalogItem: {
            id: catalogItem.id,
            name: catalogItem.name,
            brand: catalogItem.brand,
            price: catalogItem.price,
            imageUrl: catalogItem.image_url,
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          users: (nearbyData ?? []).map((row: any) => ({
            anonymousId: row.anonymous_id as string,
            proximityBucket: row.proximity_bucket as ProximityBucket,
            addedDaysAgo: row.added_days_ago as number,
            canSendOffer: row.can_send_offer as boolean,
          })),
        };

        setSelectedDetail(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load insight detail';
        setError(message);
        console.error('Failed to load insight detail:', err);
      } finally {
        setIsLoadingDetail(false);
      }
    },
    [merchant?.id, primaryLocation, filters.radiusMeters]
  );

  // ---------------------------------------------------------------------------
  // Filter Management
  // ---------------------------------------------------------------------------
  const setFilters = useCallback((newFilters: Partial<InsightFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearDetail = useCallback(() => {
    setSelectedDetail(null);
  }, []);

  // Calculate total user count
  const totalUserCount = useMemo(
    () => insights.reduce((sum, i) => sum + i.userCount, 0),
    [insights]
  );

  return {
    insights,
    selectedDetail,
    isLoading,
    isLoadingDetail,
    error,
    filters,
    setFilters,
    loadInsightDetail,
    clearDetail,
    refresh: fetchInsights,
    primaryLocation,
    totalUserCount,
  };
}
