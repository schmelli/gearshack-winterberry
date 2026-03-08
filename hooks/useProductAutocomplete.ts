/**
 * Hook for product autocomplete with optional brand filtering
 * Feature: 044-intelligence-integration
 *
 * Provides debounced product search with 300ms delay.
 * When a brand is selected, filters products by that brand.
 * When a product is selected, returns the associated brand for auto-fill.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ProductSuggestion {
  id: string;
  name: string;
  brand: { id: string; name: string; websiteUrl: string | null } | null;
  categoryMain: string | null;
  subcategory: string | null;
  productType: string | null;
  productTypeId: string | null;
  weightGrams: number | null;
  priceUsd: number | null;
  description: string | null;
  productUrl: string | null;
  imageUrl: string | null;
  score: number;
}

interface ProductSearchResponse {
  results: Array<{
    id: string;
    name: string;
    brand: { id: string; name: string; websiteUrl: string | null } | null;
    categoryMain: string | null;
    subcategory: string | null;
    productType: string | null;
    productTypeId: string | null;
    weightGrams: number | null;
    priceUsd: number | null;
    description: string | null;
    productUrl: string | null;
    imageUrl: string | null;
    score: number;
  }>;
  query: string;
  count: number;
}

export interface UseProductAutocompleteOptions {
  debounceMs?: number;
  minChars?: number;
  brandId?: string; // Filter by brand ID when provided (catalog UUID or inventory format)
  brandName?: string; // Filter by brand name (preferred, more reliable)
}

export interface UseProductAutocompleteReturn {
  suggestions: ProductSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clear: () => void;
}

const DEFAULT_DEBOUNCE_MS = 300;
const DEFAULT_MIN_CHARS = 2;

/**
 * Hook for product name autocomplete with optional brand filtering
 * @param options - Configuration options (debounceMs, minChars, brandId)
 * @returns Autocomplete state and controls
 */
export function useProductAutocomplete(
  options: UseProductAutocompleteOptions = {}
): UseProductAutocompleteReturn {
  const {
    debounceMs = DEFAULT_DEBOUNCE_MS,
    minChars = DEFAULT_MIN_CHARS,
    brandId,
    brandName,
  } = options;

  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Performs the actual search request
   */
  const performSearch = useCallback(
    async (query: string) => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        setIsLoading(true);
        setError(null);

        // Build URL with optional brand filter
        // Use the new catalog_products API
        const params = new URLSearchParams({
          q: query,
          limit: '8',
        });

        // Pass brand_name for reliable ILIKE filtering
        if (brandName) {
          params.set('brand_name', brandName);
        }
        // Also pass brand_id for catalog UUID exact matching
        if (brandId) {
          params.set('brand_id', brandId);
        }

        const response = await fetch(`/api/catalog/products/search?${params}`, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Search failed');
        }

        const data: ProductSearchResponse = await response.json();

        setSuggestions(
          data.results.map((result) => ({
            id: result.id,
            name: result.name,
            brand: result.brand,
            categoryMain: result.categoryMain,
            subcategory: result.subcategory,
            productType: result.productType,
            productTypeId: result.productTypeId,
            weightGrams: result.weightGrams,
            priceUsd: result.priceUsd,
            description: result.description,
            productUrl: result.productUrl,
            imageUrl: result.imageUrl,
            score: result.score,
          }))
        );
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
          // Request was cancelled, ignore
          return;
        }
        console.error('Product autocomplete error:', err);
        setError('Failed to fetch suggestions');
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    [brandId, brandName]
  );

  /**
   * Initiates a debounced search
   * Handles fast typing by cancelling previous requests
   */
  const search = useCallback(
    (query: string) => {
      // Clear any existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      // Clear suggestions if query is too short
      if (query.length < minChars) {
        setSuggestions([]);
        setError(null);
        return;
      }

      // Set debounced search
      debounceTimerRef.current = setTimeout(() => {
        performSearch(query);
      }, debounceMs);
    },
    [debounceMs, minChars, performSearch]
  );

  /**
   * Clears all suggestions and resets state
   */
  const clear = useCallback(() => {
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setSuggestions([]);
    setError(null);
    setIsLoading(false);
  }, []);

  // Clear suggestions when brand filter changes
  useEffect(() => {
    setSuggestions([]);
  }, [brandId, brandName]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    search,
    clear,
  };
}
