/**
 * Custom hook to fetch price results for wishlist items
 * Feature: 050-price-tracking (extension for Issue #142)
 *
 * Fetches top 3 cheapest prices from external sources (Google Shopping, eBay, retailers)
 * for display on wishlist gear cards.
 */

'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/client';
import type { PriceResult } from '@/types/price-tracking';

// Zod schema for runtime validation of PriceResult
const PriceResultSchema = z.object({
  id: z.string(),
  tracking_id: z.string(),
  source_type: z.enum(['google_shopping', 'ebay', 'retailer', 'local_shop']),
  source_name: z.string(),
  source_url: z.string(),
  price_amount: z.number(),
  price_currency: z.string(),
  shipping_cost: z.number().nullable(),
  shipping_currency: z.string(),
  total_price: z.number(),
  product_name: z.string(),
  product_image_url: z.string().nullable(),
  product_condition: z.enum(['new', 'used', 'refurbished', 'open_box']).nullable(),
  is_local: z.boolean(),
  shop_latitude: z.number().nullable(),
  shop_longitude: z.number().nullable(),
  distance_km: z.number().nullable(),
  fetched_at: z.string(),
  expires_at: z.string(),
  is_manufacturer_price: z.boolean().optional(),
  validation_confidence: z.number().optional(),
  validation_flags: z.array(z.string()).optional(),
});

interface UseWishlistPriceResultsResult {
  priceResults: PriceResult[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

/**
 * Fetches top 3 cheapest price results for a gear item from the price_results table
 *
 * @param gearItemId - The ID of the gear item to fetch prices for
 * @returns Price results sorted by total_price (cheapest first), loading state, and error
 */
export function useWishlistPriceResults(gearItemId: string): UseWishlistPriceResultsResult {
  const [priceResults, setPriceResults] = useState<PriceResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadPriceResults = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const supabase = createClient();

      // First, get the tracking_id for this gear item (if it exists)
      const { data: trackingData, error: trackingError } = await supabase
        .from('price_tracking')
        .select('id')
        .eq('gear_item_id', gearItemId)
        .eq('enabled', true)
        .maybeSingle();

      if (trackingError) {
        throw new Error(`Failed to fetch tracking data: ${trackingError.message}`);
      }

      // If no tracking exists or price tracking is not enabled, return empty results
      if (!trackingData) {
        setPriceResults([]);
        return;
      }

      // Fetch price results for this tracking_id
      const { data: resultsData, error: resultsError } = await supabase
        .from('price_results')
        .select('*')
        .eq('tracking_id', trackingData.id)
        .gt('expires_at', new Date().toISOString()) // Only get non-expired results
        .order('total_price', { ascending: true }) // Cheapest first
        .limit(3); // Top 3 only

      if (resultsError) {
        throw new Error(`Failed to fetch price results: ${resultsError.message}`);
      }

      // Validate the data with Zod for runtime type safety
      const validationResult = z.array(PriceResultSchema).safeParse(resultsData);

      if (validationResult.success) {
        setPriceResults(validationResult.data);
      } else {
        // Log validation error for debugging
        console.error('Price results validation failed:', validationResult.error);
        // Gracefully degrade - set empty results on validation error
        setPriceResults([]);
      }
    } catch (err) {
      setError(err as Error);
      // Gracefully degrade - set empty results on error
      setPriceResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!gearItemId) {
      setPriceResults([]);
      setIsLoading(false);
      return;
    }

    loadPriceResults();
  }, [gearItemId]);

  return {
    priceResults,
    isLoading,
    error,
    refresh: loadPriceResults,
  };
}
