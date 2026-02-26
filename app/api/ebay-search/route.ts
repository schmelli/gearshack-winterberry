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
import { getEbaySiteForLocale, EBAY_SITES } from '@/lib/constants/ebay-sites';
import { ebaySearchRateLimiter } from '@/lib/rate-limiter';
import type { EbaySearchResponse, EbayListing } from '@/types/ebay';

// =============================================================================
// Cache Configuration
// =============================================================================

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// =============================================================================
// Query Normalization
// =============================================================================

/**
 * Normalize search query for better eBay matching.
 *
 * Handles common product name variations that cause zero results:
 * - "X-Mid" vs "Xmid" (hyphenated model prefixes)
 * - "UL-2" vs "UL2" (model number hyphens)
 * - "Durston Gear" → "Durston" (brand noise words)
 */
function normalizeEbayQuery(query: string): string {
  let normalized = query;

  // Remove common brand suffixes that add noise to eBay search
  // "Durston Gear" → "Durston", "Nemo Equipment" → "Nemo"
  normalized = normalized.replace(/\b(Gear|Equipment|Outdoors?|Co\.?|Inc\.?|LLC)\b/gi, '');

  // Merge short prefix + hyphen: "X-Mid" → "XMid", "UL-2" → "UL2"
  // Only merges when prefix is 1-2 characters (typical model name patterns)
  // Does NOT affect longer words like "Sea-to-Summit"
  normalized = normalized.replace(/\b([A-Za-z]{1,2})-(\w)/g, '$1$2');

  // Clean up multiple spaces
  normalized = normalized.replace(/\s+/g, ' ').trim();

  return normalized;
}

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

    // Normalize query for flexible eBay matching:
    // "Durston Gear X-Mid Pro 2" → "Durston XMid Pro 2"
    const ebayQuery = normalizeEbayQuery(query);
    const normalizedQuery = ebayQuery.toLowerCase().trim();
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

    } else {

      const rawListings = await searchEbayLocalized(ebayQuery, siteConfig, 20);

      // Apply smart filtering (use original query for similarity matching)
      listings = filterEbayListings(rawListings, {
        brand,
        productTypeKeywords,
        msrp,
        itemName: query,
        limit: limit * 2, // Get more for filtering, then take limit
      });

      // Fallback: if locale site returned 0 results, try ebay.com.
      // US brands (Durston, Zpacks, etc.) have more inventory on ebay.com.
      if (listings.length === 0 && siteConfig.site !== 'ebay.com') {
        const fallbackSiteConfig = EBAY_SITES['en']; // ebay.com
        const fallbackRaw = await searchEbayLocalized(ebayQuery, fallbackSiteConfig, 20);
        const fallbackFiltered = filterEbayListings(fallbackRaw, {
          brand,
          productTypeKeywords,
          msrp,
          itemName: query,
          limit: limit * 2,
        });
        if (fallbackFiltered.length > 0) {
          listings = fallbackFiltered;
          const fallbackExpiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
          const fallbackResults = JSON.parse(JSON.stringify(fallbackFiltered));

          // Cache under BOTH the fallback site (ebay.com) AND the locale site (ebay.de).
          // Without caching under the locale site, every German-user request would miss
          // cache (lookup uses locale site 'ebay.de') and make two live eBay API calls.
          await Promise.all([
            supabase.from('ebay_price_cache').upsert(
              {
                search_query: normalizedQuery,
                ebay_site: fallbackSiteConfig.site,
                country_code: 'US',
                results: fallbackResults,
                result_count: fallbackFiltered.length,
                expires_at: fallbackExpiresAt,
              },
              { onConflict: 'search_query,ebay_site' }
            ),
            supabase.from('ebay_price_cache').upsert(
              {
                search_query: normalizedQuery,
                ebay_site: siteConfig.site, // locale site — so next lookup hits cache
                country_code: 'US',
                results: fallbackResults,
                result_count: fallbackFiltered.length,
                expires_at: fallbackExpiresAt,
              },
              { onConflict: 'search_query,ebay_site' }
            ),
          ]);

          // Return the fallback site so the UI shows the correct eBay link
          return NextResponse.json({
            listings: fallbackFiltered.slice(0, limit),
            totalResults: fallbackFiltered.length,
            ebaySite: fallbackSiteConfig.site,
            fromCache: false,
            cacheExpiresAt: fallbackExpiresAt,
          } satisfies EbaySearchResponse);
        }
      }

      // Store in cache (upsert)
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS).toISOString();
      const { error: cacheError } = await supabase
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

      if (cacheError) {
        console.warn('[eBay API] Failed to cache results:', cacheError);
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
