/**
 * useAdminMerchants Hook
 *
 * Feature: 053-merchant-integration
 * Task: T081
 *
 * Admin hook for managing merchant applications and accounts.
 * Provides listing, filtering, approval, and rejection functionality.
 */

'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createBrowserClient } from '@/lib/supabase/client';
import type { Merchant, MerchantStatus } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface MerchantWithUser extends Merchant {
  user: {
    email: string;
    displayName: string | null;
  } | null;
}

export interface AdminMerchantFilters {
  status?: MerchantStatus;
  businessType?: 'local' | 'chain' | 'online';
  search?: string;
}

export interface AdminMerchantPagination {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

export interface UseAdminMerchantsReturn {
  // Data
  merchants: MerchantWithUser[];
  selectedMerchant: MerchantWithUser | null;

  // State
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;
  pagination: AdminMerchantPagination;
  filters: AdminMerchantFilters;

  // Actions
  setFilters: (filters: Partial<AdminMerchantFilters>) => void;
  setPage: (page: number) => void;
  selectMerchant: (id: string | null) => Promise<void>;
  approveMerchant: (id: string, note?: string) => Promise<boolean>;
  rejectMerchant: (id: string, reason: string) => Promise<boolean>;
  suspendMerchant: (id: string, reason: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LIMIT = 20;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAdminMerchants(): UseAdminMerchantsReturn {
  const supabase = useMemo(() => createBrowserClient(), []);

  // State
  const [merchants, setMerchants] = useState<MerchantWithUser[]>([]);
  const [selectedMerchant, setSelectedMerchant] =
    useState<MerchantWithUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const [filters, setFiltersState] = useState<AdminMerchantFilters>({});
  const [page, setPage] = useState(1);

  // Derived state
  const pagination: AdminMerchantPagination = useMemo(
    () => ({
      page,
      limit: DEFAULT_LIMIT,
      total,
      hasMore: page * DEFAULT_LIMIT < total,
    }),
    [page, total]
  );

  /**
   * Fetch merchants with filters and pagination
   */
  const fetchMerchants = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('merchants')
        .select(
          `
          *,
          user:profiles!merchants_user_id_fkey (
            email,
            display_name
          )
        `,
          { count: 'exact' }
        )
        .order('created_at', { ascending: false });

      // Apply status filter
      if (filters.status) {
        query = query.eq('status', filters.status);
      }

      // Apply business type filter
      if (filters.businessType) {
        query = query.eq('business_type', filters.businessType);
      }

      // Apply search filter
      if (filters.search) {
        query = query.or(
          `business_name.ilike.%${filters.search}%,contact_email.ilike.%${filters.search}%`
        );
      }

      // Apply pagination
      const from = (page - 1) * DEFAULT_LIMIT;
      const to = from + DEFAULT_LIMIT - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const mapped: MerchantWithUser[] = (data || []).map((row) => ({
        id: row.id,
        userId: row.user_id,
        businessName: row.business_name,
        businessType: row.business_type,
        status: row.status,
        verifiedAt: row.verified_at,
        verifiedBy: row.verified_by,
        contactEmail: row.contact_email,
        contactPhone: row.contact_phone,
        website: row.website,
        logoUrl: row.logo_url,
        description: row.description,
        taxId: row.tax_id,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        user: row.user
          ? {
              email: row.user.email,
              displayName: row.user.display_name,
            }
          : null,
      }));

      setMerchants(mapped);
      setTotal(count || 0);
    } catch (err) {
      console.error('Failed to fetch merchants:', err);
      setError('Failed to load merchants');
    } finally {
      setIsLoading(false);
    }
  }, [supabase, filters, page]);

  /**
   * Select a merchant for detailed view
   */
  const selectMerchant = useCallback(
    async (id: string | null) => {
      if (!id) {
        setSelectedMerchant(null);
        return;
      }

      // Check if already loaded
      const existing = merchants.find((m) => m.id === id);
      if (existing) {
        setSelectedMerchant(existing);
        return;
      }

      // Fetch from database
      try {
        const { data, error: fetchError } = await supabase
          .from('merchants')
          .select(
            `
            *,
            user:profiles!merchants_user_id_fkey (
              email,
              display_name
            )
          `
          )
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;

        const mapped: MerchantWithUser = {
          id: data.id,
          userId: data.user_id,
          businessName: data.business_name,
          businessType: data.business_type,
          status: data.status,
          verifiedAt: data.verified_at,
          verifiedBy: data.verified_by,
          contactEmail: data.contact_email,
          contactPhone: data.contact_phone,
          website: data.website,
          logoUrl: data.logo_url,
          description: data.description,
          taxId: data.tax_id,
          createdAt: data.created_at,
          updatedAt: data.updated_at,
          user: data.user
            ? {
                email: data.user.email,
                displayName: data.user.display_name,
              }
            : null,
        };

        setSelectedMerchant(mapped);
      } catch (err) {
        console.error('Failed to fetch merchant:', err);
        setError('Failed to load merchant details');
      }
    },
    [merchants, supabase]
  );

  /**
   * Approve a merchant application
   */
  const approveMerchant = useCallback(
    async (id: string, note?: string): Promise<boolean> => {
      setIsProcessing(true);
      setError(null);

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { error: updateError } = await supabase
          .from('merchants')
          .update({
            status: 'approved',
            verified_at: new Date().toISOString(),
            verified_by: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // T086: Create approval notification
        const merchant = merchants.find((m) => m.id === id);
        if (merchant) {
          await supabase.from('notifications').insert({
            user_id: merchant.userId,
            type: 'merchant_approved',
            title: 'Merchant Application Approved',
            message: note || 'Your merchant application has been approved!',
            reference_id: id,
            reference_type: 'merchant',
          });
        }

        // Update local state
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === id
              ? {
                  ...m,
                  status: 'approved' as MerchantStatus,
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: user.id,
                }
              : m
          )
        );

        if (selectedMerchant?.id === id) {
          setSelectedMerchant((prev) =>
            prev
              ? {
                  ...prev,
                  status: 'approved' as MerchantStatus,
                  verifiedAt: new Date().toISOString(),
                  verifiedBy: user.id,
                }
              : null
          );
        }

        return true;
      } catch (err) {
        console.error('Failed to approve merchant:', err);
        setError('Failed to approve merchant');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, merchants, selectedMerchant]
  );

  /**
   * Reject a merchant application
   */
  const rejectMerchant = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      setIsProcessing(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('merchants')
          .update({
            status: 'rejected',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // T086: Create rejection notification
        const merchant = merchants.find((m) => m.id === id);
        if (merchant) {
          await supabase.from('notifications').insert({
            user_id: merchant.userId,
            type: 'merchant_rejected',
            title: 'Merchant Application Update',
            message: reason || 'Your merchant application was not approved.',
            reference_id: id,
            reference_type: 'merchant',
          });
        }

        // Update local state
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, status: 'rejected' as MerchantStatus }
              : m
          )
        );

        if (selectedMerchant?.id === id) {
          setSelectedMerchant((prev) =>
            prev ? { ...prev, status: 'rejected' as MerchantStatus } : null
          );
        }

        return true;
      } catch (err) {
        console.error('Failed to reject merchant:', err);
        setError('Failed to reject merchant');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, merchants, selectedMerchant]
  );

  /**
   * Suspend an active merchant
   */
  const suspendMerchant = useCallback(
    async (id: string, reason: string): Promise<boolean> => {
      setIsProcessing(true);
      setError(null);

      try {
        const { error: updateError } = await supabase
          .from('merchants')
          .update({
            status: 'suspended',
            updated_at: new Date().toISOString(),
          })
          .eq('id', id);

        if (updateError) throw updateError;

        // Create suspension notification
        const merchant = merchants.find((m) => m.id === id);
        if (merchant) {
          await supabase.from('notifications').insert({
            user_id: merchant.userId,
            type: 'merchant_suspended',
            title: 'Merchant Account Suspended',
            message: reason,
            reference_id: id,
            reference_type: 'merchant',
          });
        }

        // Update local state
        setMerchants((prev) =>
          prev.map((m) =>
            m.id === id
              ? { ...m, status: 'suspended' as MerchantStatus }
              : m
          )
        );

        if (selectedMerchant?.id === id) {
          setSelectedMerchant((prev) =>
            prev ? { ...prev, status: 'suspended' as MerchantStatus } : null
          );
        }

        return true;
      } catch (err) {
        console.error('Failed to suspend merchant:', err);
        setError('Failed to suspend merchant');
        return false;
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, merchants, selectedMerchant]
  );

  /**
   * Update filters (resets to page 1)
   */
  const setFilters = useCallback((newFilters: Partial<AdminMerchantFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  }, []);

  /**
   * Refresh data
   */
  const refresh = useCallback(async () => {
    await fetchMerchants();
  }, [fetchMerchants]);

  // Initial fetch and refetch on filter/page change
  useEffect(() => {
    fetchMerchants();
  }, [fetchMerchants]);

  return {
    merchants,
    selectedMerchant,
    isLoading,
    isProcessing,
    error,
    pagination,
    filters,
    setFilters,
    setPage,
    selectMerchant,
    approveMerchant,
    rejectMerchant,
    suspendMerchant,
    refresh,
  };
}
