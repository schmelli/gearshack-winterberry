/**
 * Custom hook to fetch price results for wishlist items
 * Feature: 050-price-tracking (extension for Issue #142)
 *
 * Fetches top 3 cheapest prices from external sources (Google Shopping, eBay, retailers)
 * for display on wishlist gear cards.
 */

'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { PriceResult } from '@/types/price-tracking';

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

      setPriceResults((resultsData as PriceResult[]) || []);
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
