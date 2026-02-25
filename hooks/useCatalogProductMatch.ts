/**
 * useCatalogProductMatch Hook
 * Feature: community-verified-weights
 *
 * Resolves the catalog product ID for a gear item by looking up
 * the gear_enrichment_suggestions table (which links gear items
 * to catalog products with match confidence).
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

interface CatalogProductMatch {
  catalogProductId: string;
  matchConfidence: number;
  manufacturerWeightGrams: number | null;
  productName: string | null;
}

interface UseCatalogProductMatchReturn {
  match: CatalogProductMatch | null;
  isLoading: boolean;
}

/**
 * Looks up the best catalog product match for a gear item.
 *
 * @param gearItemId - The gear item ID. Pass null to skip.
 * @returns The matched catalog product info, or null if no match found.
 */
export function useCatalogProductMatch(
  gearItemId: string | null
): UseCatalogProductMatchReturn {
  const [match, setMatch] = useState<CatalogProductMatch | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!gearItemId) {
      setMatch(null);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    const fetchMatch = async () => {
      setIsLoading(true);

      try {
        // Look up the best enrichment suggestion for this gear item
        const { data, error } = await supabase
          .from('gear_enrichment_suggestions')
          .select(`
            catalog_product_id,
            match_confidence,
            catalog_products!gear_enrichment_suggestions_catalog_product_id_fkey (
              name,
              weight_grams
            )
          `)
          .eq('gear_item_id', gearItemId)
          .order('match_confidence', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!cancelled && !error && data) {
          const product = data.catalog_products as {
            name: string | null;
            weight_grams: number | null;
          } | null;

          setMatch({
            catalogProductId: data.catalog_product_id,
            matchConfidence: data.match_confidence,
            manufacturerWeightGrams: product?.weight_grams
              ? Number(product.weight_grams)
              : null,
            productName: product?.name ?? null,
          });
        } else if (!cancelled) {
          setMatch(null);
        }
      } catch {
        if (!cancelled) {
          setMatch(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchMatch();

    return () => {
      cancelled = true;
    };
  }, [gearItemId]);

  return { match, isLoading };
}
