/* eslint-disable @typescript-eslint/no-explicit-any -- price_tracking tables not in generated types */
/**
 * API route: Search prices for a wishlist item
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchAllSources, sortPriceResults } from '@/lib/external-apis/price-search';
import { findFuzzyMatches } from '@/lib/external-apis/fuzzy-matcher';
import { getProductCategoryInfo } from '@/lib/external-apis/search-query-builder';
import type { SearchPricesRequest, PriceSearchResults, FuzzyMatch } from '@/types/price-tracking';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: SearchPricesRequest = await request.json();

    if (!body.gear_item_id) {
      return NextResponse.json(
        { error: 'gear_item_id is required' },
        { status: 400 }
      );
    }

    // Get gear item details including brand and category info (Issue #79, Feature 055)
    const { data: gearItem, error: gearError } = await (supabase as any)
      .from('gear_items')
      .select('name, brand, brand_url, product_type_id')
      .eq('id', body.gear_item_id)
      .single();

    if (gearError || !gearItem) {
      return NextResponse.json(
        { error: 'Gear item not found' },
        { status: 404 }
      );
    }

    const itemName = body.item_name || gearItem.name;
    const brandName = gearItem.brand;
    const brandUrl = gearItem.brand_url;
    const productTypeId = gearItem.product_type_id;

    // Get or create tracking record
    let { data: tracking } = await (supabase as any)
      .from('price_tracking')
      .select('id')
      .eq('user_id', user.id)
      .eq('gear_item_id', body.gear_item_id)
      .maybeSingle();

    if (!tracking) {
      const { data: newTracking, error: trackingError } = await (supabase as any)
        .from('price_tracking')
        .insert({
          user_id: user.id,
          gear_item_id: body.gear_item_id,
          alerts_enabled: false,
        })
        .select('id')
        .single();

      if (trackingError) {
        return NextResponse.json(
          { error: 'Failed to create tracking record' },
          { status: 500 }
        );
      }

      tracking = newTracking;
    }

    // Check cache for recent results (6-hour TTL) - T077
    const { data: cachedResults } = await (supabase as any)
      .from('price_results')
      .select('*')
      .eq('tracking_id', tracking.id)
      .gt('expires_at', new Date().toISOString())
      .order('total_price', { ascending: true });

    // Return cached results if available and fresh
    if (cachedResults && cachedResults.length > 0) {
      const sortedResults = sortPriceResults(cachedResults as any, body.user_location);

      const response: PriceSearchResults = {
        tracking_id: tracking.id,
        status: 'success',
        results: sortedResults,
        failed_sources: [],
        fuzzy_matches: [],
        searched_at: cachedResults[0]?.fetched_at || new Date().toISOString(),
      };

      return NextResponse.json(response, {
        status: 200,
      });
    }

    // Get category information for intelligent query building (Feature 055)
    const categoryInfo = await getProductCategoryInfo(supabase, productTypeId);

    // Search all sources with brand and category info for validation (Issue #79, Feature 055)
    const searchResults = await searchAllSources(
      supabase,
      itemName,
      tracking.id,
      {
        userLocation: body.user_location,
        brandName,
        brandUrl,
        categoryInfo,
      }
    );

    // Sort results (local first with distance, then by price)
    const sortedResults = sortPriceResults(searchResults.results, body.user_location);

    // Check for fuzzy matches if needed
    let fuzzyMatches: FuzzyMatch[] = [];
    if (sortedResults.length === 0 || searchResults.status === 'error') {
      try {
        const matchResult = await findFuzzyMatches(itemName);
        fuzzyMatches = matchResult.matches;
      } catch (error) {
        console.error('Fuzzy matching failed:', error);
      }
    }

    const response: PriceSearchResults = {
      ...searchResults,
      results: sortedResults,
      fuzzy_matches: fuzzyMatches,
    };

    return NextResponse.json(response, {
      status: searchResults.status === 'error' ? 408 : 200,
    });
  } catch (error) {
    console.error('Search route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
