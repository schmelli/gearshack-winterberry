/**
 * useMerchantBilling Hook
 *
 * Feature: 053-merchant-integration
 * Task: T067
 *
 * Hook for managing merchant billing cycles, transactions, and summaries.
 */

'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Helper to get supabase client with any typing for merchant tables
 * TODO: Remove after regenerating types from migrations
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getMerchantClient(): any {
  return createClient();
}
import { useMerchantProfile } from './useMerchantProfile';
import type {
  MerchantTransaction,
  BillingCycle,
  BillingCycleDetail,
  BillingSummary,
  TransactionFilters,
  BillingCycleFilters,
  TransactionType,
  TransactionStatus,
} from '@/types/conversion';
import { calculateBillingTotal } from '@/types/conversion';

// =============================================================================
// Types
// =============================================================================

export interface UseMerchantBillingReturn {
  // Data
  transactions: MerchantTransaction[];
  billingCycles: BillingCycle[];
  currentCycle: BillingCycleDetail | null;
  summary: BillingSummary | null;

  // State
  isLoading: boolean;
  isProcessing: boolean;
  error: string | null;

  // Pagination
  transactionPagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };

  // Actions
  fetchBillingCycle: (cycleId: string) => Promise<void>;
  setTransactionFilters: (filters: Partial<TransactionFilters>) => void;
  setCycleFilters: (filters: Partial<BillingCycleFilters>) => void;
  downloadInvoice: (cycleId: string) => Promise<string | null>;
  refresh: () => Promise<void>;
}

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_LIMIT = 20;
const SUMMARY_MONTHS = 12;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useMerchantBilling(): UseMerchantBillingReturn {
  const supabase = useMemo(() => getMerchantClient(), []);
  useAuth(); // Ensure user is authenticated
  const { merchant } = useMerchantProfile();

  // State
  const [transactions, setTransactions] = useState<MerchantTransaction[]>([]);
  const [billingCycles, setBillingCycles] = useState<BillingCycle[]>([]);
  const [currentCycle, setCurrentCycle] = useState<BillingCycleDetail | null>(
    null
  );
  const [summary, setSummary] = useState<BillingSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [transactionFilters, setTransactionFiltersState] =
    useState<TransactionFilters>({
      page: 1,
      limit: DEFAULT_LIMIT,
    });
  const [cycleFilters, setCycleFiltersState] = useState<BillingCycleFilters>({
    year: new Date().getFullYear(),
  });
  const [transactionTotal, setTransactionTotal] = useState(0);

  // Derived state
  const hasMore = useMemo(() => {
    return (
      (transactionFilters.page || 1) * (transactionFilters.limit || DEFAULT_LIMIT) <
      transactionTotal
    );
  }, [transactionFilters.page, transactionFilters.limit, transactionTotal]);

  /**
   * Fetch transactions for merchant
   */
  const fetchTransactions = useCallback(async () => {
    if (!merchant?.id) return;

    try {
      let query = supabase
        .from('merchant_transactions')
        .select('*', { count: 'exact' })
        .eq('merchant_id', merchant.id)
        .order('created_at', { ascending: false });

      // Apply type filter
      if (transactionFilters.type) {
        query = query.eq('type', transactionFilters.type);
      }

      // Apply date filters
      if (transactionFilters.fromDate) {
        query = query.gte('created_at', transactionFilters.fromDate);
      }
      if (transactionFilters.toDate) {
        query = query.lte('created_at', transactionFilters.toDate);
      }

      // Apply pagination
      const from =
        ((transactionFilters.page || 1) - 1) *
        (transactionFilters.limit || DEFAULT_LIMIT);
      const to = from + (transactionFilters.limit || DEFAULT_LIMIT) - 1;
      query = query.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapped: MerchantTransaction[] = (data || []).map((row: any) => ({
        id: row.id,
        merchantId: row.merchant_id,
        type: row.type as TransactionType,
        amount: Number(row.amount),
        description: row.description,
        referenceId: row.reference_id,
        referenceType: row.reference_type,
        billingCycleStart: row.billing_cycle_start,
        billingCycleEnd: row.billing_cycle_end,
        status: row.status as TransactionStatus,
        invoiceNumber: row.invoice_number,
        createdAt: row.created_at,
      }));

      setTransactions(mapped);
      setTransactionTotal(count || 0);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
      setError('Failed to load transactions');
    }
  }, [merchant?.id, transactionFilters, supabase]);

  /**
   * Calculate billing cycles from transactions
   */
  const calculateBillingCycles = useCallback(async () => {
    if (!merchant?.id) return;

    try {
      // Get all transactions grouped by billing cycle
      const { data, error: fetchError } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchant.id)
        .order('billing_cycle_start', { ascending: false });

      if (fetchError) throw fetchError;

      // Group transactions by billing cycle
      const cycleMap = new Map<
        string,
        {
          start: string;
          end: string;
          listingFees: number;
          offerFees: number;
          commissions: number;
          status: TransactionStatus;
        }
      >();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((tx: any) => {
        const key = `${tx.billing_cycle_start}_${tx.billing_cycle_end}`;
        const existing = cycleMap.get(key) || {
          start: tx.billing_cycle_start,
          end: tx.billing_cycle_end,
          listingFees: 0,
          offerFees: 0,
          commissions: 0,
          status: tx.status as TransactionStatus,
        };

        switch (tx.type) {
          case 'listing_fee':
            existing.listingFees += Number(tx.amount);
            break;
          case 'offer_fee':
            existing.offerFees += Number(tx.amount);
            break;
          case 'commission':
            existing.commissions += Number(tx.amount);
            break;
        }

        cycleMap.set(key, existing);
      });

      // Convert to BillingCycle array
      const cycles: BillingCycle[] = Array.from(cycleMap.entries()).map(
        ([key, value]) => {
          const [start, end] = key.split('_');
          const totalDue = calculateBillingTotal(
            value.listingFees,
            value.offerFees,
            value.commissions
          );

          // Calculate due date (15th of following month)
          const endDate = new Date(end);
          const dueDate = new Date(
            endDate.getFullYear(),
            endDate.getMonth() + 1,
            15
          );

          return {
            id: key,
            merchantId: merchant.id,
            cycleStart: start,
            cycleEnd: end,
            listingFees: value.listingFees,
            offerFees: value.offerFees,
            commissions: value.commissions,
            totalDue,
            status: value.status === 'paid' ? 'paid' : 'pending',
            invoiceUrl: null,
            dueDate: dueDate.toISOString(),
            paidAt: null,
            createdAt: new Date().toISOString(),
          };
        }
      );

      // Filter by year if specified
      const filtered = cycleFilters.year
        ? cycles.filter((c) => c.cycleStart.startsWith(`${cycleFilters.year}`))
        : cycles;

      setBillingCycles(filtered);
    } catch (err) {
      console.error('Failed to calculate billing cycles:', err);
    }
  }, [merchant?.id, cycleFilters.year, supabase]);

  /**
   * Calculate billing summary
   */
  const calculateSummary = useCallback(async () => {
    if (!merchant?.id) return;

    try {
      // Get transactions for past 12 months
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - SUMMARY_MONTHS);

      const { data, error: fetchError } = await supabase
        .from('merchant_transactions')
        .select('*')
        .eq('merchant_id', merchant.id)
        .gte('billing_cycle_start', startDate.toISOString().split('T')[0]);

      if (fetchError) throw fetchError;

      let totalListingFees = 0;
      let totalOfferFees = 0;
      let totalCommissions = 0;
      let totalPaid = 0;

      const monthlyData = new Map<
        string,
        { listingFees: number; offerFees: number; commissions: number }
      >();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (data || []).forEach((tx: any) => {
        const month = tx.billing_cycle_start.substring(0, 7); // YYYY-MM

        const monthData = monthlyData.get(month) || {
          listingFees: 0,
          offerFees: 0,
          commissions: 0,
        };

        const amount = Number(tx.amount);

        switch (tx.type) {
          case 'listing_fee':
            totalListingFees += amount;
            monthData.listingFees += amount;
            break;
          case 'offer_fee':
            totalOfferFees += amount;
            monthData.offerFees += amount;
            break;
          case 'commission':
            totalCommissions += amount;
            monthData.commissions += amount;
            break;
        }

        if (tx.status === 'paid') {
          totalPaid += amount;
        }

        monthlyData.set(month, monthData);
      });

      const monthlyBreakdown = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          listingFees: data.listingFees,
          offerFees: data.offerFees,
          commissions: data.commissions,
          total: calculateBillingTotal(
            data.listingFees,
            data.offerFees,
            data.commissions
          ),
        }))
        .sort((a, b) => b.month.localeCompare(a.month));

      setSummary({
        periodMonths: SUMMARY_MONTHS,
        totalListingFees,
        totalOfferFees,
        totalCommissions,
        totalPaid,
        totalOutstanding:
          calculateBillingTotal(
            totalListingFees,
            totalOfferFees,
            totalCommissions
          ) - totalPaid,
        monthlyBreakdown,
      });
    } catch (err) {
      console.error('Failed to calculate summary:', err);
    }
  }, [merchant?.id, supabase]);

  /**
   * Fetch specific billing cycle details
   */
  const fetchBillingCycle = useCallback(
    async (cycleId: string) => {
      if (!merchant?.id) return;

      setIsProcessing(true);

      try {
        const [start, end] = cycleId.split('_');

        const { data, error: fetchError } = await supabase
          .from('merchant_transactions')
          .select('*')
          .eq('merchant_id', merchant.id)
          .eq('billing_cycle_start', start)
          .eq('billing_cycle_end', end)
          .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        let listingFees = 0;
        let offerFees = 0;
        let commissions = 0;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const lineItems = (data || []).map((tx: any) => {
          const amount = Number(tx.amount);

          switch (tx.type) {
            case 'listing_fee':
              listingFees += amount;
              break;
            case 'offer_fee':
              offerFees += amount;
              break;
            case 'commission':
              commissions += amount;
              break;
          }

          return {
            id: tx.id,
            type: tx.type as TransactionType,
            description: tx.description || `${tx.type} charge`,
            quantity: 1,
            unitPrice: amount,
            totalPrice: amount,
            relatedEntityId: tx.reference_id,
            date: tx.created_at,
          };
        });

        const totalDue = calculateBillingTotal(
          listingFees,
          offerFees,
          commissions
        );
        const endDate = new Date(end);
        const dueDate = new Date(
          endDate.getFullYear(),
          endDate.getMonth() + 1,
          15
        );

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const isPaid = data?.every((tx: any) => tx.status === 'paid');

        setCurrentCycle({
          id: cycleId,
          merchantId: merchant.id,
          cycleStart: start,
          cycleEnd: end,
          listingFees,
          offerFees,
          commissions,
          totalDue,
          status: isPaid ? 'paid' : 'pending',
          invoiceUrl: null,
          dueDate: dueDate.toISOString(),
          paidAt: null,
          createdAt: new Date().toISOString(),
          lineItems,
          paymentHistory: [],
        });
      } catch (err) {
        console.error('Failed to fetch billing cycle:', err);
        setError('Failed to load billing cycle details');
      } finally {
        setIsProcessing(false);
      }
    },
    [merchant?.id, supabase]
  );

  /**
   * Download invoice (stub - would integrate with PDF generation)
   */
  const downloadInvoice = useCallback(
    async (cycleId: string): Promise<string | null> => {
      // In production, this would:
      // 1. Call an API to generate a PDF invoice
      // 2. Return the download URL
      console.log('Download invoice for cycle:', cycleId);
      return null;
    },
    []
  );

  /**
   * Update transaction filters
   */
  const setTransactionFilters = useCallback(
    (filters: Partial<TransactionFilters>) => {
      setTransactionFiltersState((prev) => ({
        ...prev,
        ...filters,
        page: filters.page ?? 1,
      }));
    },
    []
  );

  /**
   * Update cycle filters
   */
  const setCycleFilters = useCallback(
    (filters: Partial<BillingCycleFilters>) => {
      setCycleFiltersState((prev) => ({
        ...prev,
        ...filters,
      }));
    },
    []
  );

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    await Promise.all([
      fetchTransactions(),
      calculateBillingCycles(),
      calculateSummary(),
    ]);

    setIsLoading(false);
  }, [fetchTransactions, calculateBillingCycles, calculateSummary]);

  // Store latest callbacks in refs to avoid infinite loops in useEffect
  const refreshRef = useRef(refresh);
  const fetchTransactionsRef = useRef(fetchTransactions);
  const calculateBillingCyclesRef = useRef(calculateBillingCycles);

  useEffect(() => {
    refreshRef.current = refresh;
    fetchTransactionsRef.current = fetchTransactions;
    calculateBillingCyclesRef.current = calculateBillingCycles;
  });

  // Initial fetch - use ref to avoid infinite loop
  useEffect(() => {
    if (merchant?.id) {
      refreshRef.current();
    }
  }, [merchant?.id]);

  // Refetch when filters change - use ref to avoid infinite loop
  useEffect(() => {
    if (merchant?.id) {
      fetchTransactionsRef.current();
    }
  }, [merchant?.id, transactionFilters]);

  useEffect(() => {
    if (merchant?.id) {
      calculateBillingCyclesRef.current();
    }
  }, [merchant?.id, cycleFilters]);

  return {
    transactions,
    billingCycles,
    currentCycle,
    summary,
    isLoading,
    isProcessing,
    error,
    transactionPagination: {
      page: transactionFilters.page || 1,
      limit: transactionFilters.limit || DEFAULT_LIMIT,
      total: transactionTotal,
      hasMore,
    },
    fetchBillingCycle,
    setTransactionFilters,
    setCycleFilters,
    downloadInvoice,
    refresh,
  };
}
