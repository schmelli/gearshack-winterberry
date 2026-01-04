/**
 * useWeightSearch Hook
 *
 * Feature: XXX-weight-lookup
 * Constitution: All business logic MUST reside in hooks
 *
 * Manages state and logic for product weight search functionality.
 * Searches the web for product specifications and returns the most common weight.
 *
 * Tier Differentiation:
 * - Free tier: 10 searches per day (displays remaining count)
 * - Trailblazer: Unlimited searches
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  searchProductWeightWithRateLimit,
  type WeightSearchResult,
  type RateLimitInfo,
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
  /** Rate limit information (null if not yet fetched) */
  rateLimit: RateLimitInfo | null;
  /** Whether user has hit rate limit */
  isRateLimited: boolean;
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
  const t = useTranslations('Search.weight');
  const [status, setStatus] = useState<WeightSearchStatus>('idle');
  const [result, setResult] = useState<WeightSearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  /**
   * Execute weight search for a product
   */
  const search = useCallback(async (query: string): Promise<WeightSearchResult | null> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      toast.error(t('enterProductName'));
      return null;
    }

    setStatus('searching');
    setError(null);
    setResult(null);

    try {
      const response = await searchProductWeightWithRateLimit(trimmedQuery);

      // Update rate limit info
      setRateLimit(response.rateLimit);

      // Check if rate limited
      if (response.rateLimitError) {
        setStatus('error');
        setError(response.rateLimitError);
        toast.error(response.rateLimitError);
        return null;
      }

      if (response.result) {
        setResult(response.result);
        setStatus('success');

        // Build remaining searches message for free tier
        const remainingMsg = !response.rateLimit.isUnlimited
          ? t('searchesRemaining', { count: response.rateLimit.remaining })
          : '';

        // Show confidence-based feedback
        if (response.result.confidence === 'high') {
          toast.success(t('foundHighConfidence', { weight: response.result.weightGrams, sources: response.result.sourceCount, remaining: remainingMsg }));
        } else if (response.result.confidence === 'medium') {
          toast.success(t('foundMediumConfidence', { weight: response.result.weightGrams, remaining: remainingMsg }));
        } else {
          toast.info(t('foundLowConfidence', { weight: response.result.weightGrams, remaining: remainingMsg }));
        }

        return response.result;
      } else {
        setStatus('idle');

        // Build remaining searches message for free tier
        const remainingMsg = !response.rateLimit.isUnlimited
          ? t('searchesRemaining', { count: response.rateLimit.remaining })
          : '';

        toast.info(t('noWeightFound', { query: trimmedQuery, remaining: remainingMsg }));
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
  }, [t]);

  /**
   * Clear results and reset state
   */
  const clear = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  // Compute if user is rate limited
  const isRateLimited = rateLimit !== null && !rateLimit.isUnlimited && rateLimit.remaining <= 0;

  return {
    status,
    result,
    error,
    search,
    clear,
    rateLimit,
    isRateLimited,
  };
}
