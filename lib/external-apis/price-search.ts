/**
 * Price search orchestration with concurrency control
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import PQueue from 'p-queue';
import { searchGoogleShopping, searchEbay } from './serpapi-client';
import { enrichWithDistance, sortByDistance } from '@/lib/services/geolocation-service';
import type { PriceResult, PriceSearchResults, FailedSource } from '@/types/price-tracking';

// Limit concurrent API calls to 5
const priceSearchQueue = new PQueue({ concurrency: 5 });

/**
 * Search all sources in parallel with rate limiting
 */
export async function searchAllSources(
  itemName: string,
  trackingId: string,
  userLocation?: { latitude: number; longitude: number }
): Promise<PriceSearchResults> {
  const sources = [
    () => searchGoogleShopping(itemName),
    () => searchEbay(itemName),
    // Add local shop search if user location is provided
    ...(userLocation ? [() => searchLocalShops(itemName, userLocation)] : []),
  ];

  // Execute all searches in parallel with concurrency limit
  const results = await Promise.allSettled(
    sources.map((fn) => priceSearchQueue.add(fn))
  );

  // Collect successful results and failures
  const priceResults: PriceResult[] = [];
  const failedSources: FailedSource[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      // Add tracking_id to each result
      const sourceName = index === 0 ? 'Google Shopping' : index === 1 ? 'eBay' : `Source ${index}`;
      priceResults.push(
        ...result.value.map((r) => ({
          ...r,
          tracking_id: trackingId,
        }))
      );
    } else if (result.status === 'rejected') {
      const sourceName = index === 0 ? 'Google Shopping' : index === 1 ? 'eBay' : `Source ${index}`;
      failedSources.push({
        source_name: sourceName,
        error: result.reason?.message || 'Unknown error',
      });
    }
  });

  // Determine overall status
  let status: 'success' | 'partial' | 'error' = 'success';
  if (failedSources.length > 0 && priceResults.length > 0) {
    status = 'partial';
  } else if (priceResults.length === 0) {
    status = 'error';
  }

  return {
    tracking_id: trackingId,
    status,
    results: priceResults,
    failed_sources: failedSources,
    fuzzy_matches: [], // Will be populated by fuzzy matching logic
    searched_at: new Date().toISOString(),
  };
}

/**
 * Search local shops (mock implementation - replace with actual local shop API)
 */
async function searchLocalShops(
  itemName: string,
  userLocation: { latitude: number; longitude: number }
): Promise<PriceResult[]> {
  // TODO: Replace with actual local shop API integration
  // This is a mock implementation for demonstration
  console.log(`Searching local shops for "${itemName}" near ${userLocation.latitude}, ${userLocation.longitude}`);

  // Return empty array for now - integrate with actual local shop API/database
  return [];
}

/**
 * Sort price results by priority: local first, then by price
 */
export function sortPriceResults(
  results: PriceResult[],
  userLocation?: { latitude: number; longitude: number }
): PriceResult[] {
  // Enrich with distance if user location provided
  let enrichedResults = results;
  if (userLocation) {
    enrichedResults = enrichWithDistance(results, userLocation);
    return sortByDistance(enrichedResults);
  }

  // Default sort: by price
  return results.sort((a, b) => a.total_price - b.total_price);
}
