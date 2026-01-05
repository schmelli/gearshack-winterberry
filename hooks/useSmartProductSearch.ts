/**
 * useSmartProductSearch Hook
 *
 * Feature: XXX-smart-product-search
 * Constitution: All business logic MUST reside in hooks
 *
 * Manages state and logic for smart product search.
 * Searches catalog first, internet as fallback when catalog score < 0.7.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

import {
  smartProductSearch,
  extractProductDataFromUrl,
} from '@/app/actions/smart-product-search';
import type { RateLimitInfo } from '@/app/actions/weight-search';
import type {
  CatalogProductResult,
  InternetProductResult,
  ExtractedProductData,
  SmartSearchStatus,
} from '@/types/smart-search';

// =============================================================================
// Types
// =============================================================================

export interface UseSmartProductSearchReturn {
  /** Current search status */
  status: SmartSearchStatus;
  /** Results from GearGraph catalog */
  catalogResults: CatalogProductResult[];
  /** Results from internet search */
  internetResults: InternetProductResult[];
  /** Whether internet results should be shown */
  showInternetResults: boolean;
  /** Extracted data from selected internet result */
  extractedData: ExtractedProductData | null;
  /** Error message */
  error: string | null;
  /** Rate limit information */
  rateLimit: RateLimitInfo | null;
  /** Whether user has hit rate limit for internet searches */
  isRateLimited: boolean;
  /** Currently selected internet result (pending extraction) */
  selectedInternetResult: InternetProductResult | null;

  /** Execute smart product search */
  search: (query: string) => Promise<void>;
  /** Select a catalog result (returns it directly for form population) */
  selectCatalogResult: (result: CatalogProductResult) => CatalogProductResult;
  /** Select an internet result and trigger extraction */
  selectInternetResult: (result: InternetProductResult) => Promise<void>;
  /** Confirm extracted data (returns it for form population) */
  confirmExtractedData: () => ExtractedProductData | null;
  /** Clear all state */
  clear: () => void;
  /** Clear just the extracted data (e.g., after user cancels preview) */
  clearExtractedData: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Smart Product Search Hook
 *
 * Manages the flow of:
 * 1. Searching catalog + optionally internet
 * 2. Selecting results
 * 3. Extracting data from internet results
 * 4. Confirming and returning data for form population
 *
 * Usage:
 * ```tsx
 * const search = useSmartProductSearch();
 *
 * // Search for products
 * await search.search('MSR Hubba Hubba');
 *
 * // Select from catalog (direct use)
 * const catalogData = search.selectCatalogResult(result);
 * form.setValue('name', catalogData.name);
 *
 * // Select from internet (triggers extraction)
 * await search.selectInternetResult(result);
 * // ... show preview dialog with search.extractedData ...
 * const confirmedData = search.confirmExtractedData();
 * form.setValue('name', confirmedData.name);
 * ```
 */
export function useSmartProductSearch(): UseSmartProductSearchReturn {
  const t = useTranslations('SmartProductSearch');
  const [status, setStatus] = useState<SmartSearchStatus>('idle');
  const [catalogResults, setCatalogResults] = useState<CatalogProductResult[]>([]);
  const [internetResults, setInternetResults] = useState<InternetProductResult[]>([]);
  const [showInternetResults, setShowInternetResults] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedProductData | null>(null);
  const [selectedInternetResult, setSelectedInternetResult] = useState<InternetProductResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitInfo | null>(null);

  /**
   * Execute smart product search
   */
  const search = useCallback(async (query: string): Promise<void> => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 2) {
      toast.error(t('minCharacters'));
      return;
    }

    setStatus('searching');
    setError(null);
    setCatalogResults([]);
    setInternetResults([]);
    setShowInternetResults(false);
    setExtractedData(null);
    setSelectedInternetResult(null);

    try {
      const response = await smartProductSearch(trimmedQuery);

      // Update state with results
      setCatalogResults(response.catalogResults);
      setInternetResults(response.internetResults);
      setShowInternetResults(response.showInternetResults);
      setRateLimit(response.rateLimit);

      // Handle rate limit error
      if (response.rateLimitError) {
        toast.warning(response.rateLimitError);
      }

      // Show appropriate feedback
      const totalResults = response.catalogResults.length + response.internetResults.length;
      if (totalResults === 0) {
        toast.info(t('noResults', { query: trimmedQuery }));
      } else {
        const catalogMsg = response.catalogResults.length > 0
          ? t('catalogResults', { count: response.catalogResults.length })
          : '';
        const internetMsg = response.internetResults.length > 0
          ? t('webResults', { count: response.internetResults.length })
          : '';
        const details = [catalogMsg, internetMsg].filter(Boolean).join(', ');

        // Show remaining searches for free tier
        if (!response.rateLimit.isUnlimited && response.showInternetResults) {
          toast.success(t('foundResultsWithLimit', { total: totalResults, details, remaining: response.rateLimit.remaining }));
        } else {
          toast.success(t('foundResults', { total: totalResults, details }));
        }
      }

      setStatus('success');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
      console.error('[SmartSearch] Search failed:', err);
    }
  }, [t]);

  /**
   * Select a catalog result
   * Returns it directly for form population (no extraction needed)
   */
  const selectCatalogResult = useCallback((result: CatalogProductResult): CatalogProductResult => {
    // Clear any previous extraction state
    setExtractedData(null);
    setSelectedInternetResult(null);
    return result;
  }, []);

  /**
   * Select an internet result and trigger extraction
   */
  const selectInternetResult = useCallback(async (result: InternetProductResult): Promise<void> => {
    setSelectedInternetResult(result);
    setStatus('extracting');
    setError(null);
    setExtractedData(null);

    try {
      const response = await extractProductDataFromUrl(result.link);

      if (response.error) {
        toast.error(response.error);
        setError(response.error);
        setStatus('error');
        return;
      }

      if (response.data) {
        setExtractedData(response.data);

        // Show confidence feedback
        if (response.data.confidence === 'high') {
          toast.success(t('extractSuccess'));
        } else if (response.data.confidence === 'medium') {
          toast.info(t('extractMedium'));
        } else {
          toast.warning(t('extractLow'));
        }

        setStatus('success');
      } else {
        toast.error(t('extractFailed'));
        setError('Extraction returned no data');
        setStatus('error');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Extraction failed';
      setError(errorMessage);
      setStatus('error');
      toast.error(errorMessage);
      console.error('[SmartSearch] Extraction failed:', err);
    }
  }, [t]);

  /**
   * Confirm extracted data and return it
   */
  const confirmExtractedData = useCallback((): ExtractedProductData | null => {
    const data = extractedData;
    // Don't clear here - let the parent handle cleanup after form population
    return data;
  }, [extractedData]);

  /**
   * Clear all state
   */
  const clear = useCallback(() => {
    setStatus('idle');
    setCatalogResults([]);
    setInternetResults([]);
    setShowInternetResults(false);
    setExtractedData(null);
    setSelectedInternetResult(null);
    setError(null);
  }, []);

  /**
   * Clear just extracted data (user cancelled preview)
   */
  const clearExtractedData = useCallback(() => {
    setExtractedData(null);
    setSelectedInternetResult(null);
    setStatus('success'); // Go back to showing results
  }, []);

  // Compute if user is rate limited
  const isRateLimited = rateLimit !== null && !rateLimit.isUnlimited && rateLimit.remaining <= 0;

  return {
    status,
    catalogResults,
    internetResults,
    showInternetResults,
    extractedData,
    error,
    rateLimit,
    isRateLimited,
    selectedInternetResult,
    search,
    selectCatalogResult,
    selectInternetResult,
    confirmExtractedData,
    clear,
    clearExtractedData,
  };
}
