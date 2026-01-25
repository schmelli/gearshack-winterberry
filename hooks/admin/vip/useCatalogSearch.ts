/**
 * useCatalogSearch Hook (Admin - Feature 052)
 *
 * Hook for searching the GearGraph catalog for VIP loadout items.
 * Simplified version of useSmartProductSearch - only catalog, no internet search.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { CatalogProductResult } from '@/types/smart-search';

// =============================================================================
// Types
// =============================================================================

type SearchStatus = 'idle' | 'searching' | 'success' | 'error';

interface UseCatalogSearchReturn {
  results: CatalogProductResult[];
  status: SearchStatus;
  error: string | null;
  search: (query: string) => Promise<void>;
  clear: () => void;
}

// =============================================================================
// Hook
// =============================================================================

export function useCatalogSearch(): UseCatalogSearchReturn {
  const [results, setResults] = useState<CatalogProductResult[]>([]);
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Memoize Supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  /**
   * Searches the catalog for products matching the query.
   */
  const search = useCallback(
    async (query: string) => {
      if (!query || query.trim().length < 2) {
        setError('Search query must be at least 2 characters');
        return;
      }

      setStatus('searching');
      setError(null);

      try {
        // Escape ILIKE wildcards (%, _) to prevent SQL injection
        const sanitizedQuery = query.replace(/%/g, '\\%').replace(/_/g, '\\_');

        // Search catalog_products table using fuzzy matching
        const { data, error: searchError } = await supabase
          .from('catalog_products')
          .select(
            `
            id,
            name,
            brand_id,
            weight_grams,
            price_usd,
            product_type_id,
            catalog_brands (
              id,
              name
            )
          `
          )
          .ilike('name', `%${sanitizedQuery}%`)
          .limit(20)
          .order('name', { ascending: true });

        if (searchError) throw searchError;

        // Define type for database result
        type CatalogProductRow = {
          id: string;
          name: string;
          brand_id: string | null;
          weight_grams: number | null;
          price_usd: number | null;
          product_type_id: string | null;
          catalog_brands: { id: string; name: string } | null;
        };

        // Transform to CatalogProductResult format (simplified - no full catalog structure)
        const catalogResults: CatalogProductResult[] = (data || []).map((item: CatalogProductRow) => ({
          source: 'catalog' as const,
          id: item.id,
          name: item.name,
          brand: item.catalog_brands ? { id: item.catalog_brands.id, name: item.catalog_brands.name } : null,
          categoryMain: null, // Would need to join with categories table
          subcategory: null,
          productType: null,
          productTypeId: item.product_type_id || null,
          description: null,
          weightGrams: item.weight_grams || null,
          priceUsd: item.price_usd || null,
          score: 1, // Default score for simple search
        }));

        setResults(catalogResults);
        setStatus('success');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to search catalog';
        setError(message);
        setStatus('error');
        console.error('Catalog search error:', err);
      }
    },
    [supabase]
  );

  /**
   * Clears search results and state.
   */
  const clear = useCallback(() => {
    setResults([]);
    setStatus('idle');
    setError(null);
  }, []);

  return {
    results,
    status,
    error,
    search,
    clear,
  };
}

export default useCatalogSearch;
