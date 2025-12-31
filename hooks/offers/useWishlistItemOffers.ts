/**
 * useWishlistItemOffers Hook
 *
 * Feature: 142 - Price Display on Wishlist Cards
 *
 * Fetches top 3 active merchant offers for a wishlist item by price.
 * Used to display best available prices directly on gear cards.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

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

export interface WishlistItemOffer {
  id: string;
  merchantId: string;
  merchantName: string;
  offerPrice: number;
  regularPrice: number;
  discountPercent: number;
  expiresAt: string;
}

export interface UseWishlistItemOffersReturn {
  /** Top 3 offers sorted by price (lowest first) */
  offers: WishlistItemOffer[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Refresh offers */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Fetch top 3 active merchant offers for a wishlist item
 * @param wishlistItemId - ID of the wishlist item
 * @param enabled - Whether to fetch offers (default: true)
 */
export function useWishlistItemOffers(
  wishlistItemId: string | null | undefined,
  enabled: boolean = true
): UseWishlistItemOffersReturn {
  const [offers, setOffers] = useState<WishlistItemOffer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOffers = useCallback(async () => {
    if (!wishlistItemId || !enabled) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    const supabase = getMerchantClient();

    try {
      setIsLoading(true);
      setError(null);

      // Fetch active offers for this wishlist item
      // Filter: status in ('pending', 'viewed', 'accepted'), not expired
      const { data, error: fetchError } = await supabase
        .from('merchant_offers')
        .select(`
          id,
          offer_price,
          regular_price,
          expires_at,
          merchant:merchants!inner(
            id,
            business_name
          )
        `)
        .eq('wishlist_item_id', wishlistItemId)
        .in('status', ['pending', 'viewed', 'accepted'])
        .gt('expires_at', new Date().toISOString())
        .order('offer_price', { ascending: true })
        .limit(3);

      if (fetchError) {
        // If merchant_offers table doesn't exist, silently fail
        if (fetchError.code === '42P01' || fetchError.message.includes('does not exist')) {
          setOffers([]);
          setIsLoading(false);
          return;
        }
        throw fetchError;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed: WishlistItemOffer[] = (data ?? []).map((row: any) => {
        const regularPrice = row.regular_price || 0;
        const offerPrice = row.offer_price || 0;
        const discountPercent = regularPrice > 0
          ? Math.round(((regularPrice - offerPrice) / regularPrice) * 100)
          : 0;

        return {
          id: row.id,
          merchantId: row.merchant.id,
          merchantName: row.merchant.business_name,
          offerPrice,
          regularPrice,
          discountPercent,
          expiresAt: row.expires_at,
        };
      });

      setOffers(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load offers';
      setError(message);
      console.error('Failed to fetch wishlist item offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [wishlistItemId, enabled]);

  // Fetch on mount and dependency change
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  return {
    offers,
    isLoading,
    error,
    refresh: fetchOffers,
  };
}
