/**
 * useWeightSearch Hook
 *
 * Feature: XXX-weight-lookup
 * Constitution: All business logic MUST reside in hooks
 *
 * Manages state and logic for product weight search functionality.
 * Searches the web for product specifications and returns the most common weight.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';

import {
  searchProductWeight,
  type WeightSearchResult,
} from '@/app/actions/weight-search';

// =============================================================================
// Types
// =============================================================================

export type WeightSearchStatus = 'idle' | 'searching' | 'success' | 'error';

export interface UseWeightSearchReturn {
  /** Current search status */
  status: WeightSearchStatus;
  /** The weight result (null if not found or not searched) */
  result: WeightSearchResult | null;
  /** Error message (null if no error) */
  error: string | null;
  /** Execute search for a product weight */
  search: (query: string) => Promise<WeightSearchResult | null>;
  /** Clear results and reset state */
  clear: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Weight Search Hook
 *
 * Searches the web for product weight specifications and returns
 * the most commonly found weight in grams.
 *
 * Usage:
 * ```tsx
 * const { status, result, search } = useWeightSearch();
 *
 * // Search for weight
 * const weight = await search('MSR Hubba Hubba NX 2');
 *
 * if (weight) {
 *   form.setValue('weightValue', String(weight.weightGrams));
 *   form.setValue('weightDisplayUnit', 'g');
 * }
 * ```
 */
export function useWeightSearch(): UseWeightSearchReturn {
  const [status, setStatus] = useState<WeightSearchStatus>('idle');
  const [result, setResult] = useState<WeightSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute weight search for a product
   */
  const search = useCallback(async (query: string): Promise<WeightSearchResult | null> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      toast.error('Please enter a product name to search');
      return null;
    }

    setStatus('searching');
    setError(null);
    setResult(null);

    try {
      const searchResult = await searchProductWeight(trimmedQuery);

      if (searchResult) {
        setResult(searchResult);
        setStatus('success');

        // Show confidence-based feedback
        if (searchResult.confidence === 'high') {
          toast.success(`Found weight: ${searchResult.weightGrams}g (${searchResult.sourceCount} sources)`);
        } else if (searchResult.confidence === 'medium') {
          toast.success(`Found weight: ${searchResult.weightGrams}g (moderate confidence)`);
        } else {
          toast.info(`Found weight: ${searchResult.weightGrams}g (low confidence - verify manually)`);
        }

        return searchResult;
      } else {
        setStatus('idle');
        toast.info(`No weight found for "${trimmedQuery}". Try a more specific search.`);
        return null;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Weight search failed';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
      console.error('[WeightSearch] Search failed:', err);
      return null;
    }
  }, []);

  /**
   * Clear results and reset state
   */
  const clear = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return {
    status,
    result,
    error,
    search,
    clear,
  };
}
