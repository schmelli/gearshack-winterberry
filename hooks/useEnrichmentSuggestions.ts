/**
 * useEnrichmentSuggestions Hook
 *
 * Feature: Aggregated Enrichment Notifications
 * Manages pending GearGraph enrichment suggestions for the current user.
 *
 * Provides:
 * - Fetching pending suggestions with gear item details
 * - Individual accept/dismiss actions
 * - Bulk accept/dismiss all with sequential processing
 * - Optimistic updates with rollback
 */

'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Enrichment suggestion with joined gear item data
 */
export interface EnrichmentSuggestion {
  id: string;
  gearItemId: string;
  gearItemName: string;
  gearItemImage: string | null;
  suggestedWeight: number | null;
  suggestedDescription: string | null;
  suggestedPrice: number | null;
  matchConfidence: number;
  createdAt: Date;
}

/**
 * Result of processing a single suggestion
 */
interface ProcessResult {
  success: boolean;
  updatedFields?: string[];
  error?: string;
}

/**
 * Result of bulk processing
 */
export interface BulkProcessResult {
  processed: number;
  failed: number;
  errors: string[];
}

/**
 * Callback for progress updates during bulk operations
 */
export type ProgressCallback = (current: number, total: number, itemName: string) => void;

/**
 * Hook return interface
 */
export interface UseEnrichmentSuggestionsReturn {
  suggestions: EnrichmentSuggestion[];
  isLoading: boolean;
  pendingCount: number;
  processingId: string | null;
  isBulkProcessing: boolean;
  bulkProgress: { current: number; total: number } | null;
  acceptSuggestion: (id: string) => Promise<ProcessResult>;
  dismissSuggestion: (id: string) => Promise<ProcessResult>;
  acceptAll: (onProgress?: ProgressCallback) => Promise<BulkProcessResult>;
  dismissAll: (onProgress?: ProgressCallback) => Promise<BulkProcessResult>;
  refetch: () => Promise<void>;
}

/**
 * Database row type for the query result
 */
interface SuggestionRow {
  id: string;
  gear_item_id: string;
  suggested_weight_grams: number | null;
  suggested_description: string | null;
  suggested_price_usd: number | null;
  match_confidence: number;
  created_at: string | null;
  gear_items: {
    name: string;
    primary_image_url: string | null;
  } | null;
}

/**
 * Maps database row to EnrichmentSuggestion
 */
function mapRowToSuggestion(row: SuggestionRow): EnrichmentSuggestion {
  return {
    id: row.id,
    gearItemId: row.gear_item_id,
    gearItemName: row.gear_items?.name ?? 'Unknown Item',
    gearItemImage: row.gear_items?.primary_image_url ?? null,
    suggestedWeight: row.suggested_weight_grams,
    suggestedDescription: row.suggested_description,
    suggestedPrice: row.suggested_price_usd,
    matchConfidence: row.match_confidence,
    createdAt: row.created_at ? new Date(row.created_at) : new Date(),
  };
}

/**
 * Hook for managing enrichment suggestions
 */
export function useEnrichmentSuggestions(): UseEnrichmentSuggestionsReturn {
  const supabase = useMemo(() => createClient(), []);
  const { user } = useAuth();
  const userId = user?.id ?? null;

  const [suggestions, setSuggestions] = useState<EnrichmentSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);

  // Track current suggestions with ref to avoid stale closures in async operations
  const suggestionsRef = useRef(suggestions);
  useEffect(() => {
    suggestionsRef.current = suggestions;
  }, [suggestions]);

  /**
   * Fetches pending suggestions with joined gear item data
   */
  const fetchSuggestions = useCallback(async () => {
    if (!userId) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('gear_enrichment_suggestions')
        .select(`
          id,
          gear_item_id,
          suggested_weight_grams,
          suggested_description,
          suggested_price_usd,
          match_confidence,
          created_at,
          gear_items!inner (
            name,
            primary_image_url
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[useEnrichmentSuggestions] Fetch error:', error);
        setSuggestions([]);
      } else {
        const mapped = (data as SuggestionRow[]).map(mapRowToSuggestion);
        setSuggestions(mapped);
      }
    } catch (error) {
      console.error('[useEnrichmentSuggestions] Unexpected error:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  /**
   * Initial fetch on mount/user change
   */
  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions]);

  /**
   * Computed pending count
   */
  const pendingCount = useMemo(() => suggestions.length, [suggestions]);

  /**
   * Processes a single suggestion (accept or dismiss)
   */
  const processSuggestion = useCallback(
    async (suggestionId: string, action: 'accept' | 'dismiss'): Promise<ProcessResult> => {
      setProcessingId(suggestionId);

      // Capture current suggestions from ref for rollback (avoids stale closure)
      const previousSuggestions = suggestionsRef.current;
      setSuggestions((prev) => prev.filter((s) => s.id !== suggestionId));

      try {
        const response = await fetch('/api/gear-items/apply-enrichment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestion_id: suggestionId,
            action,
            // Don't pass notification_id - we handle notifications separately now
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          // Rollback on error using captured state
          setSuggestions(previousSuggestions);
          return { success: false, error: data.error || 'Failed to process suggestion' };
        }

        return {
          success: true,
          updatedFields: data.updated_fields,
        };
      } catch (error) {
        // Rollback on network error using captured state
        setSuggestions(previousSuggestions);
        console.error('[useEnrichmentSuggestions] Process error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Network error',
        };
      } finally {
        setProcessingId(null);
      }
    },
    []
  );

  /**
   * Accepts a single suggestion
   */
  const acceptSuggestion = useCallback(
    async (id: string): Promise<ProcessResult> => {
      return processSuggestion(id, 'accept');
    },
    [processSuggestion]
  );

  /**
   * Dismisses a single suggestion
   */
  const dismissSuggestion = useCallback(
    async (id: string): Promise<ProcessResult> => {
      return processSuggestion(id, 'dismiss');
    },
    [processSuggestion]
  );

  /**
   * Processes all suggestions with sequential execution and progress callbacks
   */
  const processAll = useCallback(
    async (
      action: 'accept' | 'dismiss',
      onProgress?: ProgressCallback
    ): Promise<BulkProcessResult> => {
      const toProcess = [...suggestions];
      const total = toProcess.length;
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      setIsBulkProcessing(true);
      setBulkProgress({ current: 0, total });

      for (const suggestion of toProcess) {
        // Update progress
        setBulkProgress({ current: processed + 1, total });
        onProgress?.(processed + 1, total, suggestion.gearItemName);

        // Process this suggestion
        const result = await processSuggestion(suggestion.id, action);

        if (result.success) {
          processed++;
        } else {
          failed++;
          errors.push(`${suggestion.gearItemName}: ${result.error}`);
        }

        // Small delay between items for visual feedback
        if (toProcess.indexOf(suggestion) < toProcess.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
      }

      setIsBulkProcessing(false);
      setBulkProgress(null);

      return { processed, failed, errors };
    },
    [suggestions, processSuggestion]
  );

  /**
   * Accepts all pending suggestions sequentially
   */
  const acceptAll = useCallback(
    async (onProgress?: ProgressCallback): Promise<BulkProcessResult> => {
      return processAll('accept', onProgress);
    },
    [processAll]
  );

  /**
   * Dismisses all pending suggestions sequentially
   */
  const dismissAll = useCallback(
    async (onProgress?: ProgressCallback): Promise<BulkProcessResult> => {
      return processAll('dismiss', onProgress);
    },
    [processAll]
  );

  return {
    suggestions,
    isLoading,
    pendingCount,
    processingId,
    isBulkProcessing,
    bulkProgress,
    acceptSuggestion,
    dismissSuggestion,
    acceptAll,
    dismissAll,
    refetch: fetchSuggestions,
  };
}
