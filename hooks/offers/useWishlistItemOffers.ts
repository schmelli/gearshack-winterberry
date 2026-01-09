/**
 * useWishlistItemOffers Hook
 *
 * Feature: 142 - Price Display on Wishlist Cards
 *
 * Fetches top 3 active merchant offers for a wishlist item by price.
 * Used to display best available prices directly on gear cards.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
// Constants
// =============================================================================

/** Active offer statuses that should be displayed */
const ACTIVE_OFFER_STATUSES = ['pending', 'viewed', 'accepted'] as const;

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
  const [isLoading, setIsLoading] = useState(true); // Initialize to true to prevent flicker
  const [error, setError] = useState<string | null>(null);

  // Memoize wishlistItemId to prevent unnecessary re-fetches
  const memoizedWishlistItemId = useMemo(() => wishlistItemId, [wishlistItemId]);

  const fetchOffers = useCallback(async () => {
    // Early return if not enabled or no ID
    if (!memoizedWishlistItemId || !enabled) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    const supabase = getMerchantClient();

    try {
      setIsLoading(true);
      setError(null);

      // Fetch active offers for this wishlist item
      // Filter: status in ACTIVE_OFFER_STATUSES, not expired
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
        .eq('wishlist_item_id', memoizedWishlistItemId)
        .in('status', ACTIVE_OFFER_STATUSES)
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
  }, [memoizedWishlistItemId, enabled]);

  // Fetch on mount and dependency change
  // Race condition cleanup: Track mount state to prevent updates after unmount
  useEffect(() => {
    let _isMounted = true;

    // Wrap fetchOffers to check mount state before state updates
    const safeFetch = async () => {
      await fetchOffers();
      // Note: fetchOffers already updates state, but this pattern
      // can be enhanced in the future to check _isMounted before each setState
    };

    safeFetch();

    return () => {
      _isMounted = false;
    };
  }, [fetchOffers]);

  return {
    offers,
    isLoading,
    error,
    refresh: fetchOffers,
  };
}
