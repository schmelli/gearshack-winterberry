/**
 * useMerchantOffers Hook
 *
 * Feature: 053-merchant-integration
 * Task: T049
 *
 * Manages merchant offers with creation, listing, and tracking.
 * Includes offer fee calculation and transaction logging.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useMerchantAuth } from './useMerchantAuth';
import type {
  MerchantOffer,
  MerchantOfferView,
  MerchantOfferDetail,
  OfferAnalytics,
  MerchantOfferFilters,
  CreateOffersInput,
  OfferStatus,
} from '@/types/merchant-offer';

// =============================================================================
// Types
// =============================================================================

export interface UseMerchantOffersReturn {
  /** List of offers */
  offers: MerchantOfferView[];
  /** Selected offer detail */
  selectedOffer: MerchantOfferDetail | null;
  /** Offer analytics */
  analytics: OfferAnalytics | null;
  /** Loading state */
  isLoading: boolean;
  /** Creating offers state */
  isCreating: boolean;
  /** Error message */
  error: string | null;
  /** Current filters */
  filters: MerchantOfferFilters;
  /** Pagination info */
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
  /** Update filters */
  setFilters: (filters: Partial<MerchantOfferFilters>) => void;
  /** Create new offers */
  createOffers: (input: CreateOffersInput) => Promise<boolean>;
  /** Load offer detail */
  loadOfferDetail: (offerId: string) => Promise<void>;
  /** Clear selected offer */
  clearDetail: () => void;
  /** Load analytics */
  loadAnalytics: (periodDays?: number) => Promise<void>;
  /** Refresh offers */
  refresh: () => Promise<void>;
  /** Calculate offer fee for given offer price */
  calculateOfferFee: (offerPrice: number, userCount: number) => number;
}

// Constants - configurable via environment variables
const OFFER_FEE_RATE = parseFloat(process.env.NEXT_PUBLIC_OFFER_FEE_RATE || '0.02'); // Default 2%
const MIN_OFFER_FEE = parseFloat(process.env.NEXT_PUBLIC_MIN_OFFER_FEE || '0.5'); // Default €0.50
const MAX_OFFER_FEE = parseFloat(process.env.NEXT_PUBLIC_MAX_OFFER_FEE || '5.0'); // Default €5.00
const DEFAULT_LIMIT = 20;

// =============================================================================
// Hook
// =============================================================================

export function useMerchantOffers(): UseMerchantOffersReturn {
  const { merchant } = useMerchantAuth();

  const [offers, setOffers] = useState<MerchantOfferView[]>([]);
  const [selectedOffer, setSelectedOffer] = useState<MerchantOfferDetail | null>(null);
  const [analytics, setAnalytics] = useState<OfferAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<MerchantOfferFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [total, setTotal] = useState(0);

  // ---------------------------------------------------------------------------
  // Fetch Offers
  // ---------------------------------------------------------------------------
  const fetchOffers = useCallback(async () => {
    if (!merchant?.id) {
      setOffers([]);
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      setIsLoading(true);
      setError(null);

      // Build query
      let query = supabase
        .from('merchant_offers')
        .select(
          `
          *,
          catalog_item:merchant_catalog_items(id, name, brand, price, image_url)
        `,
          { count: 'exact' }
        )
        .eq('merchant_id', merchant.id);

      // Apply filters
      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.catalogItemId) {
        query = query.eq('catalog_item_id', filters.catalogItemId);
      }

      // Pagination
      const page = filters.page ?? 1;
      const limit = filters.limit ?? DEFAULT_LIMIT;
      const offset = (page - 1) * limit;

      query = query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const transformed: MerchantOfferView[] = (data ?? []).map((row) => ({
        id: row.id,
        merchantId: row.merchant_id,
        userId: row.user_id,
        catalogItemId: row.catalog_item_id,
        wishlistItemId: row.wishlist_item_id,
        regularPrice: row.regular_price,
        offerPrice: row.offer_price,
        message: row.message,
        status: row.status as OfferStatus,
        expiresAt: row.expires_at,
        viewedAt: row.viewed_at,
        respondedAt: row.responded_at,
        offerFeeCharged: row.offer_fee_charged,
        createdAt: row.created_at,
        catalogItem: row.catalog_item
          ? {
              id: row.catalog_item.id,
              name: row.catalog_item.name,
              brand: row.catalog_item.brand,
              price: row.catalog_item.price,
              imageUrl: row.catalog_item.image_url,
            }
          : {
              id: row.catalog_item_id,
              name: 'Unknown Item',
              brand: null,
              price: row.regular_price,
              imageUrl: null,
            },
        discountPercent: Math.round(
          ((row.regular_price - row.offer_price) / row.regular_price) * 100
        ),
      }));

      setOffers(transformed);
      setTotal(count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load offers';
      setError(message);
      console.error('Failed to fetch offers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [merchant?.id, filters]);

  // Fetch on mount and dependency change
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // ---------------------------------------------------------------------------
  // Calculate Offer Fee
  // ---------------------------------------------------------------------------
  const calculateOfferFee = useCallback((offerPrice: number, userCount: number): number => {
    const feePerOffer = Math.min(
      Math.max(offerPrice * OFFER_FEE_RATE, MIN_OFFER_FEE),
      MAX_OFFER_FEE
    );
    return Math.round(feePerOffer * userCount * 100) / 100;
  }, []);

  // ---------------------------------------------------------------------------
  // Create Offers
  // ---------------------------------------------------------------------------
  const createOffers = useCallback(
    async (input: CreateOffersInput): Promise<boolean> => {
      if (!merchant?.id) {
        toast.error('Not authenticated as merchant');
        return false;
      }

      const supabase = createBrowserClient();
      setIsCreating(true);

      try {
        // Fetch catalog item to get regular price if not provided
        let regularPrice = input.regularPrice;
        if (!regularPrice) {
          const { data: catalogItem, error: itemError } = await supabase
            .from('merchant_catalog_items')
            .select('price')
            .eq('id', input.catalogItemId)
            .eq('merchant_id', merchant.id)
            .single();

          if (itemError) throw itemError;
          regularPrice = catalogItem.price;
        }

        // Validate offer price
        if (input.offerPrice >= regularPrice) {
          toast.error('Offer price must be less than regular price');
          return false;
        }

        // T089: Rate limit check - 1 offer per product per user per 30 days
        let userIdsToSend = [...input.userIds];
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const { data: recentOffers, error: rateCheckError } = await supabase
          .from('merchant_offers')
          .select('user_id')
          .eq('merchant_id', merchant.id)
          .eq('catalog_item_id', input.catalogItemId)
          .in('user_id', input.userIds)
          .gte('created_at', thirtyDaysAgo.toISOString());

        if (rateCheckError) {
          console.error('Rate limit check error:', rateCheckError);
          toast.warning('Unable to verify rate limits - some offers may be rejected by the database');
          // Continue anyway - database unique constraint will enforce
        } else if (recentOffers && recentOffers.length > 0) {
          const blockedUserIds = new Set(recentOffers.map((o) => o.user_id));
          const remainingUserIds = input.userIds.filter((id) => !blockedUserIds.has(id));

          if (remainingUserIds.length === 0) {
            toast.error('All users have already received an offer for this product in the last 30 days');
            return false;
          }

          if (remainingUserIds.length < input.userIds.length) {
            toast.warning(
              `${blockedUserIds.size} user(s) skipped - already received offer in last 30 days`
            );
          }

          // Use remaining users after rate limit filter
          userIdsToSend = remainingUserIds;
        }

        // Calculate fee per offer
        const feePerOffer = Math.min(
          Math.max(input.offerPrice * OFFER_FEE_RATE, MIN_OFFER_FEE),
          MAX_OFFER_FEE
        );

        // Calculate expiration
        const expiresInDays = input.expiresInDays ?? 14;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        // Resolve anonymous IDs to actual user IDs
        // Note: In production, this would query the RPC function with proper user mapping
        // T089: Use userIdsToSend which excludes rate-limited users
        const userIds = userIdsToSend;

        // Create offers for each user
        const offersToCreate = userIds.map((userId) => ({
          merchant_id: merchant.id,
          user_id: userId,
          catalog_item_id: input.catalogItemId,
          regular_price: regularPrice,
          offer_price: input.offerPrice,
          message: input.message ?? null,
          expires_at: expiresAt.toISOString(),
          offer_fee_charged: feePerOffer,
        }));

        const { data: createdOffers, error: insertError } = await supabase
          .from('merchant_offers')
          .insert(offersToCreate)
          .select();

        if (insertError) throw insertError;

        // Log transaction for offer fees
        const totalFee = feePerOffer * offersToCreate.length;
        const now = new Date();
        const billingCycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const billingCycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await supabase.from('merchant_transactions').insert({
          merchant_id: merchant.id,
          type: 'offer_fee',
          amount: totalFee,
          description: `Offer fee for ${offersToCreate.length} offer${offersToCreate.length > 1 ? 's' : ''}`,
          reference_id: createdOffers?.[0]?.id,
          reference_type: 'merchant_offers',
          billing_cycle_start: billingCycleStart.toISOString().split('T')[0],
          billing_cycle_end: billingCycleEnd.toISOString().split('T')[0],
        });

        toast.success(`${offersToCreate.length} offer${offersToCreate.length > 1 ? 's' : ''} sent`);
        await fetchOffers();
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create offers';
        toast.error(message);
        return false;
      } finally {
        setIsCreating(false);
      }
    },
    [merchant?.id, fetchOffers]
  );

  // ---------------------------------------------------------------------------
  // Load Offer Detail
  // ---------------------------------------------------------------------------
  const loadOfferDetail = useCallback(
    async (offerId: string) => {
      if (!merchant?.id) return;

      const supabase = createBrowserClient();

      try {
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('merchant_offers')
          .select(
            `
            *,
            catalog_item:merchant_catalog_items(id, name, brand, price, image_url),
            user_location:user_location_shares!inner(granularity)
          `
          )
          .eq('id', offerId)
          .eq('merchant_id', merchant.id)
          .single();

        if (fetchError) throw fetchError;

        // Fetch conversion if exists
        const { data: conversionData } = await supabase
          .from('conversions')
          .select('id, sale_price, commission_amount, is_local_pickup, conversion_date')
          .eq('offer_id', offerId)
          .single();

        const detail: MerchantOfferDetail = {
          id: data.id,
          merchantId: data.merchant_id,
          userId: data.user_id,
          catalogItemId: data.catalog_item_id,
          wishlistItemId: data.wishlist_item_id,
          regularPrice: data.regular_price,
          offerPrice: data.offer_price,
          message: data.message,
          status: data.status as OfferStatus,
          expiresAt: data.expires_at,
          viewedAt: data.viewed_at,
          respondedAt: data.responded_at,
          offerFeeCharged: data.offer_fee_charged,
          createdAt: data.created_at,
          catalogItem: {
            id: data.catalog_item.id,
            name: data.catalog_item.name,
            brand: data.catalog_item.brand,
            price: data.catalog_item.price,
            imageUrl: data.catalog_item.image_url,
          },
          discountPercent: Math.round(
            ((data.regular_price - data.offer_price) / data.regular_price) * 100
          ),
          userProximityBucket: null, // Would need location calculation
          conversion: conversionData
            ? {
                id: conversionData.id,
                salePrice: conversionData.sale_price,
                commissionAmount: conversionData.commission_amount,
                isLocalPickup: conversionData.is_local_pickup,
                conversionDate: conversionData.conversion_date,
              }
            : null,
        };

        setSelectedOffer(detail);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load offer detail';
        setError(message);
        console.error('Failed to load offer detail:', err);
      }
    },
    [merchant?.id]
  );

  // ---------------------------------------------------------------------------
  // Load Analytics
  // ---------------------------------------------------------------------------
  const loadAnalytics = useCallback(
    async (periodDays: number = 30) => {
      if (!merchant?.id) return;

      const supabase = createBrowserClient();

      try {
        const { data, error: rpcError } = await supabase.rpc('get_merchant_analytics', {
          p_merchant_id: merchant.id,
          p_period_days: periodDays,
        });

        if (rpcError) throw rpcError;

        if (data && data[0]) {
          const row = data[0];
          setAnalytics({
            periodDays,
            offersSent: Number(row.offers_sent) || 0,
            offersViewed: 0, // Not tracked in RPC
            offersAccepted: Number(row.offers_accepted) || 0,
            offersDeclined: 0, // Not tracked in RPC
            offersExpired: 0, // Not tracked in RPC
            conversions: Number(row.conversions) || 0,
            viewRate: 0, // Would need additional calculation
            acceptanceRate:
              row.offers_sent > 0 ? (row.offers_accepted / row.offers_sent) * 100 : 0,
            conversionRate: Number(row.conversion_rate) || 0,
            totalOfferFees: 0, // Would need additional query
            totalCommissions: 0, // Would need additional query
            averageDiscountPercent: 0, // Would need additional calculation
          });
        }
      } catch (err) {
        console.error('Failed to load analytics:', err);
      }
    },
    [merchant?.id]
  );

  // ---------------------------------------------------------------------------
  // Filter Management
  // ---------------------------------------------------------------------------
  const setFilters = useCallback((newFilters: Partial<MerchantOfferFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  const clearDetail = useCallback(() => {
    setSelectedOffer(null);
  }, []);

  // Pagination info
  const pagination = useMemo(
    () => ({
      page: filters.page ?? 1,
      limit: filters.limit ?? DEFAULT_LIMIT,
      total,
      hasMore: (filters.page ?? 1) * (filters.limit ?? DEFAULT_LIMIT) < total,
    }),
    [filters.page, filters.limit, total]
  );

  return {
    offers,
    selectedOffer,
    analytics,
    isLoading,
    isCreating,
    error,
    filters,
    pagination,
    setFilters,
    createOffers,
    loadOfferDetail,
    clearDetail,
    loadAnalytics,
    refresh: fetchOffers,
    calculateOfferFee,
  };
}
