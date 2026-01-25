/**
 * eBay Search API Route
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Updated: 054-ebay-integration (migrated from SerpAPI to eBay Browse API)
 * Purpose: Search eBay with localization and smart filtering
 *
 * GET /api/ebay-search
 * Query params:
 *   - q: Search query (required)
 *   - brand: Brand name for filtering
 *   - productTypeKeywords: Comma-separated product type keywords
 *   - locale: User locale for site selection (default: 'de')
 *   - msrp: MSRP for knockoff detection
 *   - limit: Max results (default: 3)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { searchEbayLocalized } from '@/lib/ebay/browse-api';
import { filterEbayListings } from '@/lib/external-apis/ebay-filter';
import { getEbaySiteForLocale } from '@/lib/constants/ebay-sites';
import { ebaySearchRateLimiter } from '@/lib/rate-limiter';
import type { EbaySearchResponse, EbayListing } from '@/types/ebay';

// =============================================================================
// Cache Configuration
// =============================================================================

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting (per user)
    const rateLimitResult = ebaySearchRateLimiter.check(user.id);
    if (!rateLimitResult.allowed) {
      const resetIn = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000 / 60);
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Please try again in ${resetIn} minutes.`,
          resetAt: rateLimitResult.resetAt
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': '20',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': rateLimitResult.resetAt.toString(),
          }
        }
      );
    }

    const searchParams = request.nextUrl.searchParams;

    // Parse query parameters
    const query = searchParams.get('q');
    const brand = searchParams.get('brand') || undefined;
    const productTypeKeywordsRaw = searchParams.get('productTypeKeywords');
    const locale = searchParams.get('locale') || 'de';
    const msrpRaw = searchParams.get('msrp');
    const limitRaw = searchParams.get('limit');

    // Validate required params
    if (!query) {
      return NextResponse.json(
        { error: 'Search query (q) is required' },
        { status: 400 }
      );
    }

    // Parse optional params with NaN validation
    const productTypeKeywords = productTypeKeywordsRaw
      ? productTypeKeywordsRaw.split(',').map((k) => k.trim())
      : undefined;
    const msrpParsed = msrpRaw ? parseFloat(msrpRaw) : undefined;
    const msrp = msrpParsed !== undefined && Number.isFinite(msrpParsed) ? msrpParsed : undefined;
    const limitParsed = limitRaw ? parseInt(limitRaw, 10) : 3;
    const limit = Number.isFinite(limitParsed) && limitParsed > 0 ? limitParsed : 3;

    // Get eBay site config for locale
    const siteConfig = getEbaySiteForLocale(locale);

    // Normalize query for cache key
    const normalizedQuery = query.toLowerCase().trim();
    const _cacheKey = `${normalizedQuery}:${siteConfig.site}`; // Reserved for manual cache lookups

    // Check cache first
    const { data: cacheEntry } = await supabase
      .from('ebay_price_cache')
      .select('*')
      .eq('search_query', normalizedQuery)
      .eq('ebay_site', siteConfig.site)
      .gt('expires_at', new Date().toISOString())
      .single();

    let listings: EbayListing[];
    let fromCache = false;

    if (cacheEntry) {
      // Cache hit - use cached results
      listings = cacheEntry.results as unknown as EbayListing[];
      fromCache = true;

      if (process.env.NODE_ENV === 'development') {
        console.log(`[eBay API] Cache hit for "${normalizedQuery}" on ${siteConfig.site}`);
      }
    } else {
      // Cache miss - fetch from SerpApi
      if (process.env.NODE_ENV === 'development') {
        console.log(`[eBay API] Cache miss - fetching from SerpApi for "${normalizedQuery}"`);
      }

      const rawListings = await searchEbayLocalized(query, siteConfig, 20);

      // Apply smart filtering
      listings = filterEbayListings(rawListings, {
        brand,
        productTypeKeywords,
        msrp,
        itemName: query,
        limit: limit * 2, // Get more for filtering, then take limit
      });

      // Store in cache (upsert)
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      await supabase
        .from('ebay_price_cache')
        .upsert(
          {
            search_query: normalizedQuery,
            ebay_site: siteConfig.site,
            country_code: locale.split('-')[0].toUpperCase(),
            results: JSON.parse(JSON.stringify(listings)),
            result_count: listings.length,
            expires_at: expiresAt,
          },
          {
            onConflict: 'search_query,ebay_site',
          }
        );

      if (process.env.NODE_ENV === 'development') {
        console.log(`[eBay API] Cached ${listings.length} results for "${normalizedQuery}"`);
      }
    }

    // Apply final limit (cache may have more results than needed)
    const finalListings = listings.slice(0, limit);

    // Build response
    const response: EbaySearchResponse = {
      listings: finalListings,
      totalResults: listings.length,
      ebaySite: siteConfig.site,
      fromCache,
      cacheExpiresAt: fromCache && cacheEntry
        ? cacheEntry.expires_at
        : new Date(Date.now() + CACHE_TTL_MS).toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[eBay API] Error:', error);

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('EBAY_CLIENT_ID') ||
          error.message.includes('EBAY_CLIENT_SECRET') ||
          error.message.includes('eBay credentials not configured')) {
        return NextResponse.json(
          { error: 'eBay search service not configured' },
          { status: 503 }
        );
      }
      if (error.message.includes('authentication failed')) {
        return NextResponse.json(
          { error: 'eBay authentication failed' },
          { status: 503 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to search eBay' },
      { status: 500 }
    );
  }
}
