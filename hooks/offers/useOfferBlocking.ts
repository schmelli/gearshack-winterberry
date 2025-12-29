/**
 * useOfferBlocking Hook
 *
 * Feature: 053-merchant-integration
 * Task: T057
 *
 * Manages merchant blocking for offers.
 * Users can block merchants to stop receiving offers from them.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { createBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// =============================================================================
// Types
// =============================================================================

export interface BlockedMerchant {
  id: string;
  merchantId: string;
  merchantName: string;
  merchantLogo: string | null;
  reason: string | null;
  blockedAt: string;
}

export interface UseOfferBlockingReturn {
  /** List of blocked merchants */
  blockedMerchants: BlockedMerchant[];
  /** Loading state */
  isLoading: boolean;
  /** Processing state */
  isProcessing: boolean;
  /** Check if merchant is blocked */
  isMerchantBlocked: (merchantId: string) => boolean;
  /** Block a merchant */
  blockMerchant: (merchantId: string, reason?: string) => Promise<boolean>;
  /** Unblock a merchant */
  unblockMerchant: (merchantId: string) => Promise<boolean>;
  /** Refresh blocked list */
  refresh: () => Promise<void>;
}

// =============================================================================
// Hook
// =============================================================================

export function useOfferBlocking(): UseOfferBlockingReturn {
  const { user } = useAuth();

  const [blockedMerchants, setBlockedMerchants] = useState<BlockedMerchant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // ---------------------------------------------------------------------------
  // Fetch Blocked Merchants
  // ---------------------------------------------------------------------------
  const fetchBlockedMerchants = useCallback(async () => {
    if (!user?.id) {
      setBlockedMerchants([]);
      setIsLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      setIsLoading(true);

      const { data, error } = await supabase
        .from('merchant_blocks')
        .select(`
          id,
          merchant_id,
          reason,
          created_at,
          merchant:merchants!inner(
            business_name,
            logo_url
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const transformed: BlockedMerchant[] = (data ?? []).map((row) => ({
        id: row.id,
        merchantId: row.merchant_id,
        merchantName: row.merchant.business_name,
        merchantLogo: row.merchant.logo_url,
        reason: row.reason,
        blockedAt: row.created_at,
      }));

      setBlockedMerchants(transformed);
    } catch (err) {
      console.error('Failed to fetch blocked merchants:', err);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Fetch on mount
  useEffect(() => {
    fetchBlockedMerchants();
  }, [fetchBlockedMerchants]);

  // ---------------------------------------------------------------------------
  // Check if Merchant is Blocked
  // ---------------------------------------------------------------------------
  const isMerchantBlocked = useCallback(
    (merchantId: string): boolean => {
      return blockedMerchants.some((b) => b.merchantId === merchantId);
    },
    [blockedMerchants]
  );

  // ---------------------------------------------------------------------------
  // Block Merchant
  // ---------------------------------------------------------------------------
  const blockMerchant = useCallback(
    async (merchantId: string, reason?: string): Promise<boolean> => {
      if (!user?.id) {
        toast.error('Please sign in to block merchants');
        return false;
      }

      if (isMerchantBlocked(merchantId)) {
        toast.error('Merchant is already blocked');
        return false;
      }

      const supabase = createBrowserClient();
      setIsProcessing(true);

      try {
        // Get merchant name for feedback
        const { data: merchantData } = await supabase
          .from('merchants')
          .select('business_name, logo_url')
          .eq('id', merchantId)
          .single();

        const { data, error } = await supabase
          .from('merchant_blocks')
          .insert({
            user_id: user.id,
            merchant_id: merchantId,
            reason: reason ?? null,
          })
          .select()
          .single();

        if (error) throw error;

        // Update local state
        setBlockedMerchants((prev) => [
          {
            id: data.id,
            merchantId,
            merchantName: merchantData?.business_name ?? 'Unknown',
            merchantLogo: merchantData?.logo_url ?? null,
            reason: reason ?? null,
            blockedAt: data.created_at,
          },
          ...prev,
        ]);

        toast.success(`${merchantData?.business_name ?? 'Merchant'} has been blocked`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to block merchant';
        toast.error(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, isMerchantBlocked]
  );

  // ---------------------------------------------------------------------------
  // Unblock Merchant
  // ---------------------------------------------------------------------------
  const unblockMerchant = useCallback(
    async (merchantId: string): Promise<boolean> => {
      if (!user?.id) return false;

      const blocked = blockedMerchants.find((b) => b.merchantId === merchantId);
      if (!blocked) {
        toast.error('Merchant is not blocked');
        return false;
      }

      const supabase = createBrowserClient();
      setIsProcessing(true);

      try {
        const { error } = await supabase
          .from('merchant_blocks')
          .delete()
          .eq('user_id', user.id)
          .eq('merchant_id', merchantId);

        if (error) throw error;

        // Update local state
        setBlockedMerchants((prev) => prev.filter((b) => b.merchantId !== merchantId));

        toast.success(`${blocked.merchantName} has been unblocked`);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to unblock merchant';
        toast.error(message);
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [user?.id, blockedMerchants]
  );

  return {
    blockedMerchants,
    isLoading,
    isProcessing,
    isMerchantBlocked,
    blockMerchant,
    unblockMerchant,
    refresh: fetchBlockedMerchants,
  };
}
