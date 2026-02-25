/**
 * Custom hook to fetch MSRP (Manufacturer's Suggested Retail Price) from catalog
 * Feature: 050-price-tracking (extension for wishlist cards)
 *
 * Fetches the expected/reference price from the product catalog for display
 * on wishlist gear cards as "Manufacturer's Price" or "MSRP".
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ProductPriceReference } from '@/lib/services/price-validation-service';

/**
 * Explicit type for catalog product query result.
 * Using explicit typing to avoid Supabase type inference issues with joins.
 */
interface CatalogProductResult {
  id: string;
  name: string;
  price_usd: number | null;
  product_type: string | null;
  brand: { name: string } | null;
}

interface UseMsrpPriceResult {
  msrp: ProductPriceReference | null;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Fetches MSRP from the catalog based on gear item brand and name
 *
 * @param itemName - The name of the gear item
 * @param brandName - The brand name (optional but improves accuracy)
 * @param enabled - Whether to fetch (defaults to true)
 * @returns MSRP reference data, loading state, and error
 */
export function useMsrpPrice(
  itemName: string | null,
  brandName: string | null,
  enabled: boolean = true
): UseMsrpPriceResult {
  const [msrp, setMsrp] = useState<ProductPriceReference | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled || !itemName) {
      setMsrp(null);
      setIsLoading(false);
      return;
    }

    const fetchMsrp = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const supabase = createClient();

        // Build search query
        const searchQuery = brandName
          ? `${brandName} ${itemName}`
          : itemName;

        // Search catalog for matching product
        // Note: catalog_products doesn't have category_main column
        // category info would need to be derived from product_type_id -> categories
        // Using explicit type cast to avoid Supabase type inference issues with joins
        const { data, error: searchError } = await supabase
          .from('catalog_products')
          .select(`
            id,
            name,
            price_usd,
            product_type,
            brand:catalog_brands(name)
          `)
          .textSearch('name', searchQuery, { type: 'websearch' })
          .limit(5)
          .returns<CatalogProductResult[]>();

        if (searchError) {
          // Fallback: try ilike search if full-text search fails
          const { data: fallbackData, error: fallbackError } = await supabase
            .from('catalog_products')
            .select(`
              id,
              name,
              price_usd,
              product_type,
              brand:catalog_brands(name)
            `)
            .ilike('name', `%${itemName}%`)
            .limit(5)
            .returns<CatalogProductResult[]>();

          if (fallbackError) {
            throw new Error(`Failed to search catalog: ${fallbackError.message}`);
          }

          if (!fallbackData || fallbackData.length === 0) {
            setMsrp(null);
            return;
          }

          // Find best match (prioritize brand match if available)
          let bestMatch = fallbackData[0];
          if (brandName) {
            const brandMatch = fallbackData.find((p) => {
              const pBrand = p.brand?.name?.toLowerCase() || '';
              return pBrand.includes(brandName.toLowerCase());
            });
            if (brandMatch) {
              bestMatch = brandMatch;
            }
          }

          if (bestMatch.price_usd) {
            setMsrp({
              catalogProductId: bestMatch.id,
              catalogProductName: bestMatch.name,
              brandName: bestMatch.brand?.name || null,
              expectedPriceUsd: bestMatch.price_usd,
              categoryMain: null, // catalog_products doesn't have this column
              productType: bestMatch.product_type,
            });
          }
          return;
        }

        if (!data || data.length === 0) {
          setMsrp(null);
          return;
        }

        // Find best match (prioritize brand match if available)
        let bestMatch = data[0];
        if (brandName) {
          const brandMatch = data.find((p) => {
            const pBrand = p.brand?.name?.toLowerCase() || '';
            return pBrand.includes(brandName.toLowerCase());
          });
          if (brandMatch) {
            bestMatch = brandMatch;
          }
        }

        if (bestMatch.price_usd) {
          setMsrp({
            catalogProductId: bestMatch.id,
            catalogProductName: bestMatch.name,
            brandName: bestMatch.brand?.name || null,
            expectedPriceUsd: bestMatch.price_usd,
            categoryMain: null, // catalog_products doesn't have this column
            productType: bestMatch.product_type,
          });
        } else {
          setMsrp(null);
        }
      } catch (err) {
        setError(err as Error);
        setMsrp(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMsrp();
  }, [itemName, brandName, enabled]);

  return {
    msrp,
    isLoading,
    error,
  };
}
