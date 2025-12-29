/**
 * useConversionTracking Hook
 *
 * Feature: 053-merchant-integration
 * Task: T066
 *
 * Hook for logging conversions and accessing conversion analytics.
 * Used by merchants to track purchases and by users to confirm/dispute conversions.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type {
  ConversionDetail,
  ConversionAnalytics,
  ConversionFilters,
  LogConversionInput,
  ConversionConfirmInput,
  ConversionDisputeInput,
  FraudFlagType,
} from '@/types/conversion';
import {
  calculateCommission,
  DEFAULT_COMMISSION_PERCENT,
  getAttributionDays,
  ATTRIBUTION_WINDOW_DAYS,
} from '@/types/conversion';

// =============================================================================
// Types
// =============================================================================

export interface UseConversionTrackingReturn {
  // Data
  conversions: ConversionDetail[];
  analytics: ConversionAnalytics | null;
  selectedConversion: ConversionDetail | null;

  // State
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;

  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };

  // Actions
  logConversion: (input: LogConversionInput) => Promise<boolean>;
  confirmConversion: (
    conversionId: string,
    input: ConversionConfirmInput
  ) => Promise<boolean>;
  disputeConversion: (
    conversionId: string,
    input: ConversionDisputeInput
  ) => Promise<boolean>;
  selectConversion: (conversionId: string) => Promise<void>;
  clearSelection: () => void;
  setFilters: (filters: Partial<ConversionFilters>) => void;
  refresh: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LIMIT = 20;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useConversionTracking(
  merchantId?: string
): UseConversionTrackingReturn {
  const supabase = useMemo(() => createBrowserClient(), []);
  const { user } = useAuth();

  // State
  const [conversions, setConversions] = useState<ConversionDetail[]>([]);
  const [analytics, setAnalytics] = useState<ConversionAnalytics | null>(null);
  const [selectedConversion, setSelectedConversion] =
    useState<ConversionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<ConversionFilters>({
    page: 1,
    limit: DEFAULT_LIMIT,
  });
  const [total, setTotal] = useState(0);

  // Derived state
  const hasMore = useMemo(() => {
    return filters.page! * filters.limit! < total;
  }, [filters.page, filters.limit, total]);

  /**
   * Fetch conversions with filters
   */
  const fetchConversions = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('conversions')
        .select(
          `
          *,
          merchant_offers!inner (
            id,
            regular_price,
            offer_price,
            responded_at
          ),
          merchant_catalog_items!inner (
            id,
            name,
            brand,
            price,
            image_url
          )
        `,
          { count: 'exact' }
        )
        .order('conversion_date', { ascending: false });

      // Apply merchant filter for merchant view
      if (merchantId) {
        query = query.eq('merchant_id', merchantId);
      } else {
        // User view - show own conversions
        query = query.eq('user_id', user.id);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply date filters
      if (filters.fromDate) {
        query = query.gte('conversion_date', filters.fromDate);
      }
      if (filters.toDate) {
        query = query.lte('conversion_date', filters.toDate);
      }

      // Apply pagination
      const from = ((filters.page || 1) - 1) * (filters.limit || DEFAULT_LIMIT);
      const to = from + (filters.limit || DEFAULT_LIMIT) - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // Map to ConversionDetail
      const mapped: ConversionDetail[] = (data || []).map((row) => {
        const acceptedAt = row.merchant_offers?.responded_at;
        const attributionDays = acceptedAt
          ? getAttributionDays(acceptedAt, row.conversion_date)
          : 0;
        const isLateAttribution = attributionDays > ATTRIBUTION_WINDOW_DAYS;

        // Build fraud flags
        const flags: FraudFlagType[] = [];
        if (isLateAttribution) flags.push('late_attribution');
        if (row.requires_review && row.review_reason === 'high_value') {
          flags.push('high_value');
        }
        if (row.status === 'disputed') flags.push('disputed');

        return {
          id: row.id,
          offerId: row.offer_id,
          userId: row.user_id,
          merchantId: row.merchant_id,
          catalogItemId: row.catalog_item_id,
          gearItemId: row.gear_item_id,
          salePrice: Number(row.sale_price),
          commissionPercent: Number(row.commission_percent),
          commissionAmount: Number(row.commission_amount),
          isLocalPickup: row.is_local_pickup,
          pickupLocationId: row.pickup_location_id,
          status: row.status,
          requiresReview: row.requires_review,
          reviewReason: row.review_reason,
          reviewedBy: row.reviewed_by,
          reviewedAt: row.reviewed_at,
          conversionDate: row.conversion_date,
          createdAt: row.created_at,
          offer: {
            id: row.merchant_offers.id,
            regularPrice: Number(row.merchant_offers.regular_price),
            offerPrice: Number(row.merchant_offers.offer_price),
            acceptedAt: row.merchant_offers.responded_at,
          },
          catalogItem: {
            id: row.merchant_catalog_items.id,
            name: row.merchant_catalog_items.name,
            brand: row.merchant_catalog_items.brand,
            price: Number(row.merchant_catalog_items.price),
            imageUrl: row.merchant_catalog_items.image_url,
          },
          attributionDays,
          isLateAttribution,
          flags,
          userRating: null,
          userFeedback: null,
        };
      });

      setConversions(mapped);
      setTotal(count || 0);
    } catch (err) {
      console.error('Failed to fetch conversions:', err);
      setError('Failed to load conversions');
    } finally {
      setIsLoading(false);
    }
  }, [user, merchantId, filters, supabase]);

  /**
   * Fetch analytics for merchant
   */
  const fetchAnalytics = useCallback(async () => {
    if (!merchantId) return;

    try {
      // Use RPC for analytics
      const { data, error: rpcError } = await supabase.rpc(
        'get_merchant_analytics',
        {
          p_merchant_id: merchantId,
          p_period_days: 30,
        }
      );

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const row = data[0];
        setAnalytics({
          periodDays: 30,
          totalConversions: Number(row.conversions || 0),
          confirmedConversions: Number(row.conversions || 0),
          disputedConversions: 0,
          totalRevenue: Number(row.revenue || 0),
          totalCommissions:
            Number(row.revenue || 0) * (DEFAULT_COMMISSION_PERCENT / 100),
          conversionRate: Number(row.conversion_rate || 0),
          averageOrderValue:
            Number(row.conversions || 0) > 0
              ? Number(row.revenue || 0) / Number(row.conversions || 1)
              : 0,
          localPickupPercent: 0,
          byProduct: [],
          trend: [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    }
  }, [merchantId, supabase]);

  /**
   * Log a new conversion
   */
  const logConversion = useCallback(
    async (input: LogConversionInput): Promise<boolean> => {
      if (!user) return false;

      setIsProcessing(true);
      setError(null);

      try {
        // Fetch offer details to calculate commission
        const { data: offer, error: offerError } = await supabase
          .from('merchant_offers')
          .select('*')
          .eq('id', input.offerId)
          .eq('status', 'accepted')
          .single();

        if (offerError || !offer) {
          throw new Error('Offer not found or not accepted');
        }

        // Calculate commission
        const commissionAmount = calculateCommission(input.salePrice);

        // Check for fraud flags
        let requiresReview = false;
        let reviewReason: string | null = null;

        // Late attribution check
        if (offer.responded_at) {
          const days = getAttributionDays(
            offer.responded_at,
            new Date().toISOString()
          );
          if (days > ATTRIBUTION_WINDOW_DAYS) {
            requiresReview = true;
            reviewReason = 'late_attribution';
          }
        }

        // High value check (>500 EUR)
        if (input.salePrice > 500) {
          requiresReview = true;
          reviewReason = reviewReason || 'high_value';
        }

        // Insert conversion
        const { error: insertError } = await supabase
          .from('conversions')
          .insert({
            offer_id: input.offerId,
            user_id: offer.user_id,
            merchant_id: offer.merchant_id,
            catalog_item_id: offer.catalog_item_id,
            sale_price: input.salePrice,
            commission_percent: DEFAULT_COMMISSION_PERCENT,
            commission_amount: commissionAmount,
            is_local_pickup: input.isLocalPickup ?? false,
            requires_review: requiresReview,
            review_reason: reviewReason,
            status: 'pending',
          });

        if (insertError) throw insertError;

        // Update offer status to converted
        await supabase
          .from('merchant_offers')
          .update({ status: 'converted' })
          .eq('id', input.offerId);

        // Log commission transaction
        const now = new Date();
        const cycleStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const cycleEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        await supabase.from('merchant_transactions').insert({
          merchant_id: offer.merchant_id,
          type: 'commission',
          amount: commissionAmount,
          description: `Commission on conversion`,
          reference_type: 'conversion',
          billing_cycle_start: cycleStart.toISOString().split('T')[0],
          billing_cycle_end: cycleEnd.toISOString().split('T')[0],
          status: 'pending',
        });

        await fetchConversions();
        return true;
      } catch (err) {
        console.error('Failed to log conversion:', err);
        setError('Failed to log conversion');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, supabase, fetchConversions]
  );

  /**
   * Confirm a conversion (user action)
   */
  const confirmConversion = useCallback(
    async (
      conversionId: string,
      input: ConversionConfirmInput
    ): Promise<boolean> => {
      if (!user) return false;

      setIsProcessing(true);

      try {
        const { error: updateError } = await supabase
          .from('conversions')
          .update({
            status: 'confirmed',
          })
          .eq('id', conversionId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setConversions((prev) =>
          prev.map((c) =>
            c.id === conversionId
              ? {
                  ...c,
                  status: 'confirmed' as const,
                  userRating: input.rating ?? null,
                  userFeedback: input.feedback ?? null,
                }
              : c
          )
        );

        return true;
      } catch (err) {
        console.error('Failed to confirm conversion:', err);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, supabase]
  );

  /**
   * Dispute a conversion (user action)
   */
  const disputeConversion = useCallback(
    async (
      conversionId: string,
      input: ConversionDisputeInput
    ): Promise<boolean> => {
      if (!user) return false;

      setIsProcessing(true);

      try {
        const { error: updateError } = await supabase
          .from('conversions')
          .update({
            status: 'disputed',
            requires_review: true,
            review_reason: input.reason,
          })
          .eq('id', conversionId)
          .eq('user_id', user.id);

        if (updateError) throw updateError;

        // Update local state
        setConversions((prev) =>
          prev.map((c) =>
            c.id === conversionId
              ? {
                  ...c,
                  status: 'disputed' as const,
                  requiresReview: true,
                  reviewReason: input.reason,
                  flags: [...c.flags, 'disputed' as FraudFlagType],
                }
              : c
          )
        );

        return true;
      } catch (err) {
        console.error('Failed to dispute conversion:', err);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user, supabase]
  );

  /**
   * Select a conversion for detail view
   */
  const selectConversion = useCallback(
    async (conversionId: string) => {
      const conversion = conversions.find((c) => c.id === conversionId);
      if (conversion) {
        setSelectedConversion(conversion);
      }
    },
    [conversions]
  );

  /**
   * Clear selection
   */
  const clearSelection = useCallback(() => {
    setSelectedConversion(null);
  }, []);

  /**
   * Update filters
   */
  const setFilters = useCallback((newFilters: Partial<ConversionFilters>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
      // Reset to page 1 if changing filters other than page
      page: newFilters.page ?? 1,
    }));
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    await Promise.all([fetchConversions(), fetchAnalytics()]);
  }, [fetchConversions, fetchAnalytics]);

  // Initial fetch
  useEffect(() => {
    if (user) {
      refresh();
    }
  }, [user, refresh]);

  return {
    conversions,
    analytics,
    selectedConversion,
    isLoading,
    isProcessing,
    error,
    pagination: {
      page: filters.page || 1,
      limit: filters.limit || DEFAULT_LIMIT,
      total,
      hasMore,
    },
    logConversion,
    confirmConversion,
    disputeConversion,
    selectConversion,
    clearSelection,
    setFilters,
    refresh,
  };
}
