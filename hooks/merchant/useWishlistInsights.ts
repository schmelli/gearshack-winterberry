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
import { createBrowserClient } from '@/lib/supabase/client';
import { useMerchantAuth } from './useMerchantAuth';
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

    const supabase = createBrowserClient();

    try {
      setIsLoading(true);
      setError(null);

      // Call the RPC function to get nearby users with wishlist items
      const { data: nearbyData, error: rpcError } = await supabase.rpc(
        'get_wishlist_users_nearby',
        {
          merchant_lat: primaryLocation.lat,
          merchant_lng: primaryLocation.lng,
          radius_meters: filters.radiusMeters,
          p_catalog_item_id: null, // Get all catalog items
        }
      );

      if (rpcError) throw rpcError;

      // Aggregate by catalog item
      const catalogItemMap = new Map<
        string,
        {
          userIds: Set<string>;
          proximityBuckets: Record<ProximityBucket, number>;
          recentCount: number;
        }
      >();

      for (const row of nearbyData ?? []) {
        const itemId = row.catalog_item_id as string;
        if (!catalogItemMap.has(itemId)) {
          catalogItemMap.set(itemId, {
            userIds: new Set(),
            proximityBuckets: {
              '5km': 0,
              '10km': 0,
              '25km': 0,
              '50km': 0,
              '100km+': 0,
            },
            recentCount: 0,
          });
        }

        const item = catalogItemMap.get(itemId)!;
        item.userIds.add(row.user_id as string);
        item.proximityBuckets[row.proximity_bucket as ProximityBucket]++;

        const addedDaysAgo = row.added_days_ago as number;
        if (addedDaysAgo <= 7) {
          item.recentCount++;
        }
      }

      // Filter by minimum user count and recent days
      const filteredItems = Array.from(catalogItemMap.entries()).filter(([, value]) => {
        if (value.userIds.size < filters.minUsers) return false;
        if (filters.recentDays && value.recentCount === 0) return false;
        return true;
      });

      // Fetch catalog item details for matched items
      const catalogItemIds = filteredItems.map(([id]) => id);

      if (catalogItemIds.length === 0) {
        setInsights([]);
        return;
      }

      const { data: catalogItems, error: catalogError } = await supabase
        .from('merchant_catalog_items')
        .select('id, name, brand')
        .eq('merchant_id', merchant.id)
        .in('id', catalogItemIds);

      if (catalogError) throw catalogError;

      // Build final insights
      const insightResults: WishlistInsight[] = filteredItems
        .map(([itemId, data]) => {
          const catalogItem = catalogItems?.find((c) => c.id === itemId);
          if (!catalogItem) return null;

          return {
            catalogItemId: itemId,
            catalogItemName: catalogItem.name,
            catalogItemBrand: catalogItem.brand,
            userCount: data.userIds.size,
            proximityBreakdown: {
              within5km: data.proximityBuckets['5km'],
              within10km: data.proximityBuckets['10km'],
              within25km: data.proximityBuckets['25km'],
              within50km: data.proximityBuckets['50km'],
              beyond50km: data.proximityBuckets['100km+'],
            },
            recentAddCount: data.recentCount,
          };
        })
        .filter((i): i is WishlistInsight => i !== null)
        .sort((a, b) => b.userCount - a.userCount);

      setInsights(insightResults);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load wishlist insights';
      setError(message);
      console.error('Failed to fetch wishlist insights:', err);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id, primaryLocation, filters.radiusMeters, filters.minUsers, filters.recentDays]);

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

      const supabase = createBrowserClient();

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
          users: (nearbyData ?? []).map((row) => ({
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
