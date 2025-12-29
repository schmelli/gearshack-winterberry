/**
 * useUserOffers Hook
 *
 * Feature: 053-merchant-integration
 * Task: T056
 *
 * Manages user-facing offers with fetch, accept, decline, and view tracking.
 * Implements offer status transitions with validation.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  UserOffer,
  UserOfferDetail,
  OfferStatus,
  UserOfferFilters,
} from '@/types/merchant-offer';
import { canOfferTransitionTo, getExpiresIn, calculateDiscountPercent } from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface UseUserOffersReturn {
  /** List of offers for the user */
  offers: UserOffer[];
  /** Selected offer detail */
  selectedOffer: UserOfferDetail | null;
  /** Loading state */
  isLoading: boolean;
  /** Processing action state */
  isProcessing: boolean;
  /** Error message */
  error: string | null;
  /** Current filters */
  filters: UserOfferFilters;
  /** Count of unread offers */
  unreadCount: number;
  /** Update filters */
  setFilters: (filters: Partial<UserOfferFilters>) => void;
  /** Load offer detail and mark as viewed */
  viewOffer: (offerId: string) => Promise<void>;
  /** Accept an offer */
  acceptOffer: (offerId: string) => Promise<boolean>;
  /** Decline an offer */
  declineOffer: (offerId: string) => Promise<boolean>;
  /** Clear selected offer */
  clearDetail: () => void;
  /** Refresh offers */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useUserOffers(): UseUserOffersReturn {
  const { user } = useAuth();

  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<UserOfferDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<UserOfferFilters>({
    includeExpired: false,
  });

  // ---------------------------------------------------------------------------
  // Fetch Offers
  // ---------------------------------------------------------------------------
  const fetchOffers = useCallback(async () => {
    if (!user?.id) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('merchant_offers')
        .select(`
          id,
          regular_price,
          offer_price,
          status,
          expires_at,
          created_at,
          merchant:merchants!inner(
            id,
            business_name,
            logo_url,
            business_type
          ),
          catalog_item:merchant_catalog_items!inner(
            name,
            brand,
            image_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Exclude expired unless requested
      if (!filters.includeExpired) {
        query = query.not('status', 'in', '("expired","declined","converted")');
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      const transformed: UserOffer[] = (data ?? []).map((row) => ({
        id: row.id,
        merchant: {
          id: row.merchant.id,
          businessName: row.merchant.business_name,
          logoUrl: row.merchant.logo_url,
          businessType: row.merchant.business_type,
          isVerified: true, // Merchants with offers are verified
        },
        productName: row.catalog_item.name,
        productBrand: row.catalog_item.brand,
        productImageUrl: row.catalog_item.image_url,
        regularPrice: row.regular_price,
        offerPrice: row.offer_price,
        discountPercent: calculateDiscountPercent(row.regular_price, row.offer_price),
        status: row.status as Exclude<OfferStatus, 'converted'>,
        expiresAt: row.expires_at,
        createdAt: row.created_at,
      }));

      setOffers(transformed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load offers';
      setError(message);
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, filters.status, filters.includeExpired]);

  // Fetch on mount and dependency change
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ---------------------------------------------------------------------------
  // View Offer (mark as viewed)
  // ---------------------------------------------------------------------------
  const viewOffer = useCallback(
    async (offerId: string) => {
      if (!user?.id) return;

      const supabase = createBrowserClient();

      try {
        setError(null);

        // Fetch full offer details
        const { data, error: fetchError } = await supabase
          .from('merchant_offers')
          .select(`
            id,
            regular_price,
            offer_price,
            message,
            status,
            expires_at,
            created_at,
            wishlist_item_id,
            merchant:merchants!inner(
              id,
              business_name,
              logo_url,
              business_type
            ),
            catalog_item:merchant_catalog_items!inner(
              name,
              brand,
              image_url
            )
          `)
          .eq('id', offerId)
          .eq('user_id', user.id)
          .single();

        if (fetchError) throw fetchError;

        // Find nearest store location
        const { data: locationData } = await supabase
          .from('merchant_locations')
          .select('name, address_line1, city')
          .eq('merchant_id', data.merchant.id)
          .eq('is_primary', true)
          .single();

        // Mark as viewed if pending
        if (data.status === 'pending') {
          await supabase
            .from('merchant_offers')
            .update({
              status: 'viewed',
              viewed_at: new Date().toISOString(),
            })
            .eq('id', offerId);

          // Update local state
          setOffers((prev) =>
            prev.map((o) => (o.id === offerId ? { ...o, status: 'viewed' as const } : o))
          );
        }

        const detail: UserOfferDetail = {
          id: data.id,
          merchant: {
            id: data.merchant.id,
            businessName: data.merchant.business_name,
            logoUrl: data.merchant.logo_url,
            businessType: data.merchant.business_type,
            isVerified: true,
          },
          productName: data.catalog_item.name,
          productBrand: data.catalog_item.brand,
          productImageUrl: data.catalog_item.image_url,
          regularPrice: data.regular_price,
          offerPrice: data.offer_price,
          discountPercent: calculateDiscountPercent(data.regular_price, data.offer_price),
          status: (data.status === 'pending' ? 'viewed' : data.status) as Exclude<OfferStatus, 'converted'>,
          expiresAt: data.expires_at,
          createdAt: data.created_at,
          message: data.message,
          nearestLocation: locationData
            ? {
                name: locationData.name,
                distanceKm: 0, // Would need user location for real distance
                address: `${locationData.address_line1}, ${locationData.city}`,
              }
            : null,
          wishlistItemId: data.wishlist_item_id,
          expiresIn: getExpiresIn(data.expires_at),
        };

        setSelectedOffer(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load offer';
        setError(message);
        console.error('Failed to view offer:', err);
      }
    },
    [user?.id]
  );

  // ---------------------------------------------------------------------------
  // Accept Offer
  // ---------------------------------------------------------------------------
  const acceptOffer = useCallback(
    async (offerId: string): Promise<boolean> => {
      if (!user?.id) return false;

      const offer = offers.find((o) => o.id === offerId);
      if (!offer) {
        toast.error('Offer not found');
        return false;
      }

      // Validate transition
      if (!canOfferTransitionTo(offer.status, 'accepted')) {
        toast.error('This offer cannot be accepted');
        return false;
      }

      const supabase = createBrowserClient();
      setIsProcessing(true);

      try {
        const { error: updateError } = await supabase
          .from('merchant_offers')
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
          })
          .eq('id', offerId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setOffers((prev) =>
          prev.map((o) => (o.id === offerId ? { ...o, status: 'accepted' as const } : o))
        );

        if (selectedOffer?.id === offerId) {
          setSelectedOffer((prev) => (prev ? { ...prev, status: 'accepted' as const } : null));
        }

        toast.success('Offer accepted! Check your messages to arrange pickup or delivery.');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to accept offer';
        toast.error(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, offers, selectedOffer?.id]
  );

  // ---------------------------------------------------------------------------
  // Decline Offer
  // ---------------------------------------------------------------------------
  const declineOffer = useCallback(
    async (offerId: string): Promise<boolean> => {
      if (!user?.id) return false;

      const offer = offers.find((o) => o.id === offerId);
      if (!offer) {
        toast.error('Offer not found');
        return false;
      }

      // Validate transition
      if (!canOfferTransitionTo(offer.status, 'declined')) {
        toast.error('This offer cannot be declined');
        return false;
      }

      const supabase = createBrowserClient();
      setIsProcessing(true);

      try {
        const { error: updateError } = await supabase
          .from('merchant_offers')
          .update({
            status: 'declined',
            responded_at: new Date().toISOString(),
          })
          .eq('id', offerId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setOffers((prev) =>
          prev.map((o) => (o.id === offerId ? { ...o, status: 'declined' as const } : o))
        );

        if (selectedOffer?.id === offerId) {
          setSelectedOffer((prev) => (prev ? { ...prev, status: 'declined' as const } : null));
        }

        toast.success('Offer declined');
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to decline offer';
        toast.error(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, offers, selectedOffer?.id]
  );

  // ---------------------------------------------------------------------------
  // Filter Management
  // ---------------------------------------------------------------------------
  const setFilters = useCallback((newFilters: Partial<UserOfferFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearDetail = useCallback(() => {
    setSelectedOffer(null);
  }, []);

  // Calculate unread count
  const unreadCount = useMemo(
    () => offers.filter((o) => o.status === 'pending').length,
    [offers]
  );

  return {
    offers,
    selectedOffer,
    isLoading,
    isProcessing,
    error,
    filters,
    unreadCount,
    setFilters,
    viewOffer,
    acceptOffer,
    declineOffer,
    clearDetail,
    refresh: fetchOffers,
  };
}
