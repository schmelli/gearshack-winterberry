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
  name: string;
  brand?: string;
  weightGrams?: number;
  priceValue?: number;
  currency?: string;
  imageUrl?: string;
  description?: string;
  sourceUrl?: string;
  operationType?: string;
  delta?: Record<string, { old: unknown; new: unknown }>;
}

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
  return rows.map((row) => ({
    id: row.id,
    contributionType: (row.contribution_type ?? 'new_product') as ContributionType,
    suggestionStatus: (row.suggestion_status ?? 'pending') as SuggestionStatus,
    catalogMatchScore: row.catalog_match_score,
    catalogMatchId: row.catalog_match_id,
    enrichmentData: (row.enrichment_data as EnrichmentData) ?? {},
    createdAt: row.created_at,
    queuedAt: row.queued_at,
    processedAt: row.processed_at,
    brandName: row.brand_name,
    productName: row.product_name,
    sourceUrl: row.source_url,
    countryCode: row.contributor_country_code,
  }));
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
   * Sends a contribution to the gardener queue for manual review
   */
  const sendToGardener = useCallback(
    async (contributionId: string) => {
      setIsProcessing(true);
      setError(null);

      try {
        // Use type assertion for columns added by migration not yet in generated types
        const updatePayload = {
          suggestion_status: 'in_gardener_queue',
          queued_at: new Date().toISOString(),
        } as Record<string, unknown>;

        const { error: updateError } = await supabase
          .from('user_contributions')
          .update(updatePayload)
          .eq('id', contributionId);

        if (updateError) {
          console.error('[useProductSuggestions] Send to gardener error:', updateError);
          throw new Error(updateError.message);
        }

        // Optimistically update local state
        setSuggestions((prev) =>
          prev.map((s) =>
            s.id === contributionId
              ? {
                  ...s,
                  suggestionStatus: 'in_gardener_queue' as SuggestionStatus,
                  queuedAt: new Date().toISOString(),
                }
              : s
          )
        );

        // If filtering by status, the item may need to be removed from list
        if (filters.status && filters.status !== 'in_gardener_queue') {
          setSuggestions((prev) => prev.filter((s) => s.id !== contributionId));
          setTotalCount((prev) => prev - 1);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to send to gardener';
        setError(message);
        throw err;
      } finally {
        setIsProcessing(false);
      }
    },
    [supabase, filters.status]
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
  useEffect(() => {
    const channel = supabase
      .channel('product_suggestions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_contributions',
        },
        (payload) => {
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
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, filters.contributionType, filters.status]);

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
  };
}
