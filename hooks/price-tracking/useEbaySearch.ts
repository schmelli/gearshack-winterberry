/**
 * useEbaySearch Hook
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Search eBay for wishlist item prices with localization
 *
 * Constitution: All business logic MUST reside in hooks
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useLocale } from 'next-intl';
import type { EbayListing, EbaySearchResponse } from '@/types/ebay';

// =============================================================================
// Types
// =============================================================================

export interface UseEbaySearchOptions {
  /** Brand name for filtering results */
  brand?: string;
  /** Product type keywords for filtering */
  productTypeKeywords?: string[];
  /** MSRP for knockoff detection */
  msrp?: number;
  /** Maximum results to return (default: 3) */
  limit?: number;
  /** Auto-fetch on mount (default: false) */
  autoFetch?: boolean;
}

export interface UseEbaySearchReturn {
  /** Filtered eBay listings */
  listings: EbayListing[];
  /** Whether search is in progress */
  isLoading: boolean;
  /** Error message if search failed */
  error: string | null;
  /** eBay site used for search (e.g., 'ebay.de') */
  ebaySite: string | null;
  /** Whether results came from cache */
  fromCache: boolean;
  /** Execute search with query */
  search: (query: string) => Promise<void>;
  /** Refresh current search */
  refresh: () => Promise<void>;
  /** Clear results and error */
  clear: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useEbaySearch(options: UseEbaySearchOptions = {}): UseEbaySearchReturn {
  const {
    brand,
    productTypeKeywords,
    msrp,
    limit = 3,
    autoFetch = false,
  } = options;

  const locale = useLocale();

  // State
  const [listings, setListings] = useState<EbayListing[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ebaySite, setEbaySite] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastQuery, setLastQuery] = useState<string | null>(null);

  // Search function
  const search = useCallback(
    async (query: string) => {
      if (!query.trim()) {
        setError('Search query is required');
        return;
      }

      setIsLoading(true);
      setError(null);
      setLastQuery(query);

      try {
        // Build query params
        const params = new URLSearchParams({
          q: query,
          locale,
          limit: limit.toString(),
        });

        if (brand) {
          params.set('brand', brand);
        }

        if (productTypeKeywords && productTypeKeywords.length > 0) {
          params.set('productTypeKeywords', productTypeKeywords.join(','));
        }

        if (msrp) {
          params.set('msrp', msrp.toString());
        }

        // Fetch from API
        const response = await fetch(`/api/ebay-search?${params}`);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const data: EbaySearchResponse = await response.json();

        setListings(data.listings);
        setEbaySite(data.ebaySite);
        setFromCache(data.fromCache);
      } catch (err) {
        // Classify error for better user feedback
        let message = 'Search failed';
        if (err instanceof Error) {
          const errMsg = err.message.toLowerCase();
          if (errMsg.includes('429') || errMsg.includes('rate limit')) {
            message = 'Rate limit exceeded. Please try again later.';
          } else if (errMsg.includes('503') || errMsg.includes('service unavailable')) {
            message = 'Service temporarily unavailable. Please try again in a few minutes.';
          } else if (errMsg.includes('403') || errMsg.includes('forbidden')) {
            message = 'Access denied. Please check your subscription status.';
          } else if (errMsg.includes('401') || errMsg.includes('unauthorized')) {
            message = 'Authentication required. Please sign in.';
          } else if (errMsg.includes('network') || errMsg.includes('fetch')) {
            message = 'Network error. Please check your connection.';
          } else {
            message = err.message;
          }
        }
        setError(message);
        setListings([]);
        console.error('[useEbaySearch] Error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [locale, brand, productTypeKeywords, msrp, limit]
  );

  // Refresh current search
  const refresh = useCallback(async () => {
    if (lastQuery) {
      await search(lastQuery);
    }
  }, [lastQuery, search]);

  // Clear results
  const clear = useCallback(() => {
    setListings([]);
    setError(null);
    setEbaySite(null);
    setFromCache(false);
    setLastQuery(null);
  }, []);

  // Auto-fetch effect (if enabled and we have context)
  useEffect(() => {
    // This effect is for future use if we want to auto-fetch based on props
    // Currently just a placeholder for autoFetch functionality
    if (autoFetch && brand) {
      // Could auto-search with brand name
    }
  }, [autoFetch, brand]);

  return {
    listings,
    isLoading,
    error,
    ebaySite,
    fromCache,
    search,
    refresh,
    clear,
  };
}
