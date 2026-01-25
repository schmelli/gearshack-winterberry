/**
 * useMerchantAuth Hook
 *
 * Feature: 053-merchant-integration
 * Task: T013
 *
 * Provides merchant authentication status and verification.
 * Works alongside useSupabaseAuth to add merchant-specific checks.
 */

'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import { fetchMerchantByUserId } from '@/lib/supabase/merchant-queries';
import type { Merchant, MerchantStatus } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export type MerchantAuthStatus =
  | 'loading'
  | 'unauthenticated'
  | 'not_merchant'
  | 'pending_approval'
  | 'suspended'
  | 'rejected'
  | 'approved';

export interface UseMerchantAuthReturn {
  /** Current merchant profile (null if not a merchant) */
  merchant: Merchant | null;
  /** Combined auth and merchant status */
  status: MerchantAuthStatus;
  /** Whether merchant access is granted (approved status) */
  hasAccess: boolean;
  /** Whether merchant account is verified (approved + verified_at set) */
  isVerified: boolean;
  /** Whether currently loading auth/merchant state */
  isLoading: boolean;
  /** Error message if auth check failed */
  error: string | null;
  /** Refresh merchant data */
  refreshMerchant: () => Promise<void>;
}

// =============================================================================
// Status Mapping
// =============================================================================

function mapStatusToAuthStatus(
  merchantStatus: MerchantStatus | null
): MerchantAuthStatus {
  if (merchantStatus === null) return 'not_merchant';

  const statusMap: Record<MerchantStatus, MerchantAuthStatus> = {
    pending: 'pending_approval',
    approved: 'approved',
    suspended: 'suspended',
    rejected: 'rejected',
  };

  return statusMap[merchantStatus];
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMerchantAuth(): UseMerchantAuthReturn {
  const { user, isLoading: authLoading } = useSupabaseAuth();

  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [isLoadingMerchant, setIsLoadingMerchant] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch merchant profile when user is authenticated
  const fetchMerchant = useCallback(async () => {
    if (!user?.id) {
      setMerchant(null);
      setIsLoadingMerchant(false);
      return;
    }

    setIsLoadingMerchant(true);
    setError(null);

    try {
      const merchantData = await fetchMerchantByUserId(user.id);
      setMerchant(merchantData);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load merchant profile';
      setError(message);
      setMerchant(null);
    } finally {
      setIsLoadingMerchant(false);
    }
  }, [user?.id]);

  // Store latest callback in ref to avoid infinite loops in useEffect
  const fetchMerchantRef = useRef(fetchMerchant);
  useEffect(() => {
    fetchMerchantRef.current = fetchMerchant;
  });

  // Fetch merchant data on mount and when user changes
  useEffect(() => {
    if (!authLoading) {
      fetchMerchantRef.current();
    }
  }, [authLoading, user?.id]);

  // Compute status based on auth and merchant state
  const status = useMemo((): MerchantAuthStatus => {
    if (authLoading || isLoadingMerchant) return 'loading';
    if (!user) return 'unauthenticated';
    return mapStatusToAuthStatus(merchant?.status ?? null);
  }, [authLoading, isLoadingMerchant, user, merchant?.status]);

  // Compute access flags
  const hasAccess = status === 'approved';
  const isVerified = hasAccess && merchant?.verifiedAt !== null;

  // Combined loading state
  const isLoading = authLoading || isLoadingMerchant;

  // Refresh function for manual reload
  const refreshMerchant = useCallback(async () => {
    await fetchMerchant();
  }, [fetchMerchant]);

  return {
    merchant,
    status,
    hasAccess,
    isVerified,
    isLoading,
    error,
    refreshMerchant,
  };
}

// =============================================================================
// Guard Component Helper
// =============================================================================

/**
 * Hook for using in route guards - returns redirect path if unauthorized
 */
export function useMerchantAuthGuard(): {
  isAuthorized: boolean;
  isLoading: boolean;
  redirectPath: string | null;
} {
  const { status, isLoading } = useMerchantAuth();

  const redirectPath = useMemo(() => {
    if (isLoading) return null;

    switch (status) {
      case 'unauthenticated':
        return '/login?redirect=/merchant';
      case 'not_merchant':
        return '/merchant/apply';
      case 'pending_approval':
        return '/merchant/pending';
      case 'suspended':
        return '/merchant/suspended';
      case 'rejected':
        return '/merchant/rejected';
      case 'approved':
        return null; // Authorized
      default:
        return null;
    }
  }, [status, isLoading]);

  return {
    isAuthorized: status === 'approved',
    isLoading,
    redirectPath,
  };
}
