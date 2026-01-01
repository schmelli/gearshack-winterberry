/**
 * Price search orchestration with concurrency control
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 * Enhanced: 2025-12-22 (Issue #79 - improved product matching and validation)
 * Enhanced: 2026-01-01 (Feature 055 - multi-stage search with category context)
 */

import PQueue from 'p-queue';
import type { SupabaseClient } from '@supabase/supabase-js';
import { searchGoogleShopping, searchEbay } from './serpapi-client';
import { enrichWithDistance, sortByDistance } from '@/lib/services/geolocation-service';
import {
  getCatalogPriceReference,
  filterAndRankResults,
  type ProductPriceReference,
} from '@/lib/services/price-validation-service';
import { buildSearchQueries, type ProductCategoryInfo } from './search-query-builder';
import type { PriceResult, PriceSearchResults, FailedSource } from '@/types/price-tracking';

// Limit concurrent API calls to 5
const priceSearchQueue = new PQueue({ concurrency: 5 });

/**
 * Search all sources in parallel with rate limiting and validation
 * Enhanced with catalog price lookup and spam detection (Issue #79)
 * Enhanced with multi-stage category-aware search (Feature 055)
 */
export async function searchAllSources(
  supabase: SupabaseClient,
  itemName: string,
  trackingId: string,
  options?: {
    userLocation?: { latitude: number; longitude: number };
    brandName?: string | null;
    brandUrl?: string | null;
    categoryInfo?: ProductCategoryInfo | null;
  }
): Promise<PriceSearchResults> {
  const { userLocation, brandName, brandUrl, categoryInfo } = options || {};

  // STEP 1: Get catalog price reference for validation
  const priceReference = await getCatalogPriceReference(supabase, itemName, brandName || null);

  // STEP 2: Build intelligent search queries with category context (Feature 055)
  // Multi-stage strategy: try category-enriched queries first, fall back to simple query
  const searchQueries = buildSearchQueries({
    itemName,
    brandName: brandName || null,
    categoryInfo: categoryInfo || null,
  });

  // Get the product type keywords for result filtering
  const productTypeKeywords = searchQueries[0]?.productTypeKeywords || [];

  // STEP 3: Execute multi-stage search
  // Try queries in order until we get sufficient results (minimum 3)
  let allResults: PriceResult[] = [];
  let failedSources: FailedSource[] = [];
  let successfulStage: number = 3;

  for (const queryConfig of searchQueries) {
    console.log(`[Price Search] Stage ${queryConfig.stage}: ${queryConfig.strategy} - "${queryConfig.query}"`);

    // Execute searches from multiple sources
    const sourceJobs = [
      { name: 'Google Shopping', task: () => searchGoogleShopping(queryConfig.query, 'Germany', productTypeKeywords) },
      { name: 'eBay', task: () => searchEbay(queryConfig.query, productTypeKeywords) },
      ...(brandUrl ? [{ name: 'Manufacturer', task: () => searchManufacturerSite(itemName, brandUrl, productTypeKeywords) }] : []),
      ...(userLocation ? [{ name: 'Local Shops', task: () => searchLocalShops(itemName, userLocation) }] : []),
    ];

    // Execute all searches in parallel with concurrency limit
    const results = await Promise.allSettled(
      sourceJobs.map((job) => priceSearchQueue.add(job.task))
    );

    // Collect successful results and failures from this stage
    const stageResults: PriceResult[] = [];
    const stageFailures: FailedSource[] = [];

    results.forEach((result, index) => {
      const sourceName = sourceJobs[index].name;

      if (result.status === 'fulfilled' && result.value) {
        stageResults.push(
          ...result.value.map((r) => ({
            ...r,
            tracking_id: trackingId,
          }))
        );
      } else if (result.status === 'rejected') {
        stageFailures.push({
          source_name: sourceName,
          error: result.reason?.message || 'Unknown error',
        });
      }
    });

    // Accumulate results
    allResults.push(...stageResults);
    failedSources = stageFailures; // Only keep failures from latest stage

    console.log(`[Price Search] Stage ${queryConfig.stage} found ${stageResults.length} results`);

    // If we have at least 3 results, stop searching
    // This prevents unnecessary API calls when we already have good matches
    if (stageResults.length >= 3) {
      successfulStage = queryConfig.stage;
      console.log(`[Price Search] Sufficient results found at stage ${successfulStage}, stopping search`);
      break;
    }
  }

  console.log(`[Price Search] Total ${allResults.length} results from ${successfulStage === 3 ? 'fallback' : 'stage ' + successfulStage}`);

  // STEP 4: Filter and validate results using catalog reference
  const validatedResults = filterAndRankResults(allResults, priceReference, brandName || null);

  console.log(`[Price Search] ${validatedResults.length} results after validation`);

  // Determine overall status
  let status: 'success' | 'partial' | 'error' = 'success';
  if (failedSources.length > 0 && validatedResults.length > 0) {
    status = 'partial';
  } else if (validatedResults.length === 0) {
    status = 'error';
  }

  return {
    tracking_id: trackingId,
    status,
    results: validatedResults,
    failed_sources: failedSources,
    fuzzy_matches: [], // Will be populated by fuzzy matching logic
    searched_at: new Date().toISOString(),
    price_reference: priceReference, // Include for debugging/UI display
  };
}

/**
 * Search manufacturer website for product (using Google Shopping with site: operator)
 * This provides a price reference from the official source
 */
async function searchManufacturerSite(
  itemName: string,
  brandUrl: string,
  productTypeKeywords: string[] = []
): Promise<PriceResult[]> {
  try {
    // Validate and extract domain from brand URL
    let domain: string;
    try {
      domain = new URL(brandUrl).hostname.replace('www.', '');
    } catch (urlError) {
      console.error('Invalid brand URL:', brandUrl, urlError);
      return [];
    }

    // Search Google Shopping restricted to manufacturer site
    const manufacturerQuery = `site:${domain} ${itemName}`;

    // Use the same Google Shopping search but restricted to manufacturer domain
    const results = await searchGoogleShopping(manufacturerQuery, 'Germany', productTypeKeywords);

    // Mark these as manufacturer results
    return results.map(r => ({
      ...r,
      source_type: 'retailer' as const,
      source_name: `${r.source_name} (Manufacturer)`,
      is_manufacturer_price: true,
    }));
  } catch (error) {
    console.error('Manufacturer site search error:', error);
    // Don't fail the whole search if manufacturer lookup fails
    return [];
  }
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
