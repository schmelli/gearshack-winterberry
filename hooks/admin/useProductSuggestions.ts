/**
 * useProductSuggestions Hook
 *
 * Feature: URL-Import & Contributions Tracking
 * Task: 12 - Admin Dashboard Hook for Product Suggestions
 *
 * Provides state management and data fetching for the admin
 * product suggestions dashboard with real-time updates.
 *
 * This hook fetches user contributions from the database,
 * allows filtering by type and status, and provides actions
 * for sending suggestions to the gardener queue or rejecting them.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

/** Contribution type - what kind of contribution was made */
export type ContributionType = 'new_product' | 'incomplete_match' | 'data_update';

/** Suggestion status - where in the workflow the suggestion is */
export type SuggestionStatus =
  | 'pending'
  | 'queued_for_review'
  | 'in_gardener_queue'
  | 'processed'
  | 'rejected';

/** Enrichment data structure from Firecrawl */
export interface EnrichmentData {
  name?: string;
  brand?: string;
  weightGrams?: number;
  priceValue?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  sourceUrl?: string;
  operationType?: string;
  categoryId?: string;
  delta?: Record<string, { old: unknown; new: unknown }>;
}

/**
 * Zod schema for validating enrichment_data from database.
 * Uses passthrough() to allow additional fields while ensuring core fields are typed.
 */
const EnrichmentDataSchema = z.object({
  name: z.string().optional(),
  brand: z.string().optional(),
  weightGrams: z.number().optional(),
  priceValue: z.number().optional(),
  currency: z.string().optional(),
  imageUrl: z.string().optional(),
  description: z.string().optional(),
  sourceUrl: z.string().optional(),
  operationType: z.string().optional(),
  categoryId: z.string().optional(),
  delta: z.record(z.string(), z.object({
    old: z.unknown(),
    new: z.unknown()
  })).optional(),
}).passthrough();

/** Product suggestion row mapped from user_contributions */
export interface ProductSuggestion {
  id: string;
  contributionType: ContributionType;
  suggestionStatus: SuggestionStatus;
  catalogMatchScore: number | null;
  catalogMatchId: string | null;
  enrichmentData: EnrichmentData;
  createdAt: string;
  queuedAt: string | null;
  processedAt: string | null;
  /** Original brand name from contributor */
  brandName: string;
  /** Original product name from contributor */
  productName: string;
  /** Source URL if imported */
  sourceUrl: string | null;
  /** Contributor country code */
  countryCode: string | null;
}

/** Filter options for querying suggestions */
export interface SuggestionFilters {
  contributionType?: ContributionType;
  status?: SuggestionStatus;
  limit?: number;
  offset?: number;
}

/** Subscription status for realtime connection */
export type SubscriptionStatus = 'connecting' | 'connected' | 'disconnected';

/** Hook return type */
export interface UseProductSuggestionsReturn {
  /** List of product suggestions */
  suggestions: ProductSuggestion[];
  /** Whether data is loading */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Total count of suggestions matching filters */
  totalCount: number;
  /** Current filter settings */
  filters: SuggestionFilters;
  /** Update filter settings */
  setFilters: React.Dispatch<React.SetStateAction<SuggestionFilters>>;
  /** Manually refetch suggestions */
  fetchSuggestions: () => Promise<void>;
  /** Send a contribution to the gardener queue for manual review */
  sendToGardener: (contributionId: string) => Promise<void>;
  /** Reject a suggestion (mark as rejected) */
  rejectSuggestion: (contributionId: string) => Promise<void>;
  /** Whether an action is currently processing */
  isProcessing: boolean;
  /** Realtime subscription status */
  subscriptionStatus: SubscriptionStatus;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Database row type from user_contributions table
 * Note: This includes columns added by migration 20260201000000_url_import_enhancement.sql
 * that may not yet be in the generated Supabase types.
 */
interface DatabaseRow {
  id: string;
  contribution_type: string | null;
  suggestion_status: string | null;
  catalog_match_score: number | null;
  catalog_match_id: string | null;
  enrichment_data: unknown;
  created_at: string;
  queued_at: string | null;
  processed_at: string | null;
  brand_name: string;
  product_name: string;
  source_url: string | null;
  contributor_country_code: string | null;
  // Fields from original schema that may be present
  geargraph_matched?: boolean | null;
  matched_catalog_product_id?: string | null;
  matched_confidence?: number | null;
}

/**
 * Maps database rows to ProductSuggestion objects
 */
function mapToProductSuggestions(rows: DatabaseRow[]): ProductSuggestion[] {
  return rows.map((row) => {
    // Safely parse enrichment_data with fallback to empty object
    const enrichmentResult = EnrichmentDataSchema.safeParse(row.enrichment_data);
    const enrichmentData: EnrichmentData = enrichmentResult.success
      ? enrichmentResult.data as EnrichmentData
      : {};

    return {
      id: row.id,
      contributionType: (row.contribution_type ?? 'new_product') as ContributionType,
      suggestionStatus: (row.suggestion_status ?? 'pending') as SuggestionStatus,
      catalogMatchScore: row.catalog_match_score,
      catalogMatchId: row.catalog_match_id,
      enrichmentData,
      createdAt: row.created_at,
      queuedAt: row.queued_at,
      processedAt: row.processed_at,
      brandName: row.brand_name,
      productName: row.product_name,
      sourceUrl: row.source_url,
      countryCode: row.contributor_country_code,
    };
  });
}

/**
 * Determines whether the payload change should trigger a refetch based on current filters.
 * This prevents unnecessary refetches when changes are unrelated to the current view.
 */
function shouldRefetchForPayload(
  payload: { eventType: string; new?: Record<string, unknown>; old?: Record<string, unknown> },
  filters: SuggestionFilters
): boolean {
  // Always refetch on INSERT to ensure new items are captured
  if (payload.eventType === 'INSERT') return true;

  // For UPDATE/DELETE, check if the record matches our filters
  const record = payload.new ?? payload.old;
  if (!record) return true;

  // Check contribution type filter
  if (filters.contributionType && record.contribution_type !== filters.contributionType) {
    return false;
  }

  // Check status filter
  if (filters.status && record.suggestion_status !== filters.status) {
    return false;
  }

  return true;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Custom hook for managing product suggestions in the admin dashboard.
 *
 * Features:
 * - Fetches paginated suggestions with filtering
 * - Real-time updates via Supabase Realtime
 * - Actions for sending to gardener queue or rejecting
 *
 * @param initialFilters - Optional initial filter settings
 * @returns Object with suggestions data, loading state, and action functions
 *
 * @example
 * ```tsx
 * function ProductSuggestionsTab() {
 *   const {
 *     suggestions,
 *     loading,
 *     error,
 *     totalCount,
 *     filters,
 *     setFilters,
 *     sendToGardener,
 *     rejectSuggestion,
 *   } = useProductSuggestions({ status: 'pending' });
 *
 *   return (
 *     <div>
 *       {suggestions.map((s) => (
 *         <SuggestionCard
 *           key={s.id}
 *           suggestion={s}
 *           onApprove={() => sendToGardener(s.id)}
 *           onReject={() => rejectSuggestion(s.id)}
 *         />
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useProductSuggestions(
  initialFilters?: SuggestionFilters
): UseProductSuggestionsReturn {
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SuggestionFilters>(initialFilters ?? {});
  const [totalCount, setTotalCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus>('disconnected');

  // Translations for toast messages
  const t = useTranslations('Admin.ingestion.productSuggestions');

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  /**
   * Fetches suggestions from the database based on current filters
   */
  const fetchSuggestions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Build query with filters
      let query = supabase
        .from('user_contributions')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      // Apply contribution type filter
      if (filters.contributionType) {
        query = query.eq('contribution_type', filters.contributionType);
      }

      // Apply status filter
      if (filters.status) {
        query = query.eq('suggestion_status', filters.status);
      }

      // Apply pagination
      const limit = filters.limit ?? 20;
      const offset = filters.offset ?? 0;
      query = query.range(offset, offset + limit - 1);

      const { data, error: queryError, count } = await query;

      if (queryError) {
        console.error('[useProductSuggestions] Query error:', queryError);
        setError(queryError.message);
        return;
      }

      // Cast through unknown to handle columns not yet in generated types
      setSuggestions(mapToProductSuggestions((data as unknown as DatabaseRow[]) ?? []));
      setTotalCount(count ?? 0);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch suggestions';
      console.error('[useProductSuggestions] Fetch error:', err);
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, supabase]);

  /**
   * Sends a contribution to the gardener queue for manual review.
   * Creates a gardener_approvals record and updates the contribution status.
   */
  const sendToGardener = useCallback(
    async (contributionId: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        // 1. Get the contribution data for the approval record
        const contribution = suggestions.find((s) => s.id === contributionId);
        if (!contribution) {
          throw new Error('Contribution not found');
        }

        // 2. Create gardener_approvals record
        // Use type assertion for table not yet in generated types
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: approval, error: approvalError } = await (supabase as any)
          .from('gardener_approvals')
          .insert({
            type: 'product_enrichment',
            contribution_id: contributionId,
            status: 'pending',
            data: {
              contributionType: contribution.contributionType,
              enrichmentData: contribution.enrichmentData,
              catalogMatchScore: contribution.catalogMatchScore,
              catalogMatchId: contribution.catalogMatchId,
            },
          })
          .select('id')
          .single();

        if (approvalError) {
          console.error('[ProductSuggestions] Failed to create gardener approval:', approvalError);
          // Continue anyway - the status update is more important
        }

        // 3. Update contribution status
        const updatePayload = {
          suggestion_status: 'in_gardener_queue',
          queued_at: new Date().toISOString(),
          gardener_task_id: approval?.id ?? null,
        } as Record<string, unknown>;

        const { error: updateError } = await supabase
          .from('user_contributions')
          .update(updatePayload)
          .eq('id', contributionId);

        if (updateError) {
          console.error('[useProductSuggestions] Send to gardener error:', updateError);
          throw new Error(updateError.message);
        }

        // Optimistic update - remove from current list
        setSuggestions((prev) => prev.filter((s) => s.id !== contributionId));
        setTotalCount((prev) => Math.max(0, prev - 1));

        toast.success(t('sentToGardener'));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send to gardener';
        console.error('[ProductSuggestions] Send to gardener failed:', err);
        setError(message);
        toast.error(t('error'));
        // Refetch to ensure state consistency
        await fetchSuggestions();
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, suggestions, fetchSuggestions, t]
  );

  /**
   * Rejects a suggestion (marks as rejected)
   */
  const rejectSuggestion = useCallback(
    async (contributionId: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Use type assertion for columns added by migration not yet in generated types
        const updatePayload = {
          suggestion_status: 'rejected',
          processed_at: new Date().toISOString(),
        } as Record<string, unknown>;

        const { error: updateError } = await supabase
          .from('user_contributions')
          .update(updatePayload)
          .eq('id', contributionId);

        if (updateError) {
          console.error('[useProductSuggestions] Reject error:', updateError);
          throw new Error(updateError.message);
        }

        // Optimistically update local state
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === contributionId
              ? {
                  ...s,
                  suggestionStatus: 'rejected' as SuggestionStatus,
                  processedAt: new Date().toISOString(),
                }
              : s
          )
        );

        // If filtering by status, the item may need to be removed from list
        if (filters.status && filters.status !== 'rejected') {
          setSuggestions((prev) => prev.filter((s) => s.id !== contributionId));
          setTotalCount((prev) => prev - 1);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to reject suggestion';
        setError(message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, filters.status]
  );

  // Initial fetch
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  // Real-time subscription for user_contributions changes
  // Uses debouncing to prevent rapid subscription changes when filters change quickly
  useEffect(() => {
    // Small delay to prevent rapid subscription changes when filters change quickly
    const timeoutId = setTimeout(() => {
      // Use unique channel name to prevent conflicts
      const channel = supabase
        .channel(`product_suggestions_${Date.now()}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_contributions',
          },
          (payload) => {
            // Only process changes that are relevant to current filters
            if (!shouldRefetchForPayload(payload, filters)) {
              return;
            }

            // Handle different event types
            switch (payload.eventType) {
              case 'INSERT': {
                // Add new suggestion if it matches current filters
                const newRow = payload.new as DatabaseRow;
                const shouldInclude =
                  (!filters.contributionType ||
                    newRow.contribution_type === filters.contributionType) &&
                  (!filters.status || newRow.suggestion_status === filters.status);

                if (shouldInclude) {
                  const newSuggestion = mapToProductSuggestions([newRow])[0];
                  setSuggestions((prev) => [newSuggestion, ...prev]);
                  setTotalCount((prev) => prev + 1);
                }
                break;
              }
              case 'UPDATE': {
                // Update existing suggestion in local state
                const updatedRow = payload.new as DatabaseRow;
                const updatedSuggestion = mapToProductSuggestions([updatedRow])[0];

                // Check if updated item still matches current filters
                const stillMatches =
                  (!filters.contributionType ||
                    updatedRow.contribution_type === filters.contributionType) &&
                  (!filters.status || updatedRow.suggestion_status === filters.status);

                if (stillMatches) {
                  setSuggestions((prev) =>
                    prev.map((s) => (s.id === updatedSuggestion.id ? updatedSuggestion : s))
                  );
                } else {
                  // Remove from list if no longer matches filters
                  setSuggestions((prev) => prev.filter((s) => s.id !== updatedSuggestion.id));
                  setTotalCount((prev) => Math.max(0, prev - 1));
                }
                break;
              }
              case 'DELETE': {
                // Remove deleted suggestion from local state
                const deletedId = (payload.old as { id: string }).id;
                setSuggestions((prev) => {
                  const wasPresent = prev.some((s) => s.id === deletedId);
                  if (wasPresent) {
                    setTotalCount((c) => Math.max(0, c - 1));
                  }
                  return prev.filter((s) => s.id !== deletedId);
                });
                break;
              }
            }
          }
        )
        .subscribe((status) => {
          // Track subscription status for debugging and UI feedback
          setSubscriptionStatus(status === 'SUBSCRIBED' ? 'connected' : 'connecting');
        });

      // Store channel reference for cleanup
      return () => {
        setSubscriptionStatus('disconnected');
        supabase.removeChannel(channel);
      };
    }, 100); // 100ms debounce to prevent rapid subscription changes

    // Cleanup timeout and subscription on filter change or unmount
    return () => {
      clearTimeout(timeoutId);
      setSubscriptionStatus('disconnected');
    };
  }, [supabase, filters]);

  return {
    suggestions,
    loading,
    error,
    totalCount,
    filters,
    setFilters,
    fetchSuggestions,
    sendToGardener,
    rejectSuggestion,
    isProcessing,
    subscriptionStatus,
  };
}
