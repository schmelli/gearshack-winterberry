/**
 * Reseller Search API Route
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Find best reseller prices for a gear item (Trailblazer only)
 *
 * GET /api/resellers/search
 * Query params:
 *   - gearItemId: Gear item ID to search for
 *   - query: Search query (brand + product name)
 *   - countryCode: User's country code (e.g., 'DE')
 *   - latitude: User's latitude (for local shop sorting)
 *   - longitude: User's longitude (for local shop sorting)
 *   - limit: Max results per type (default: 2 local + 1 online)
 *
 * Returns: Best 3 prices (2 local by distance + 1 online by price)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePostGISLocation } from '@/lib/supabase/transformers';
import { searchSerperResellers } from '@/lib/serper/shopping';
import type {
  ResellerSearchResponse,
  ResellerPriceWithDetails,
  Reseller,
  ResellerPriceResult,
} from '@/types/reseller';

// =============================================================================
// Constants
// =============================================================================

const _CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours (reserved for future use)

/**
 * Hostnames that are never valid as product URLs — these are search engine
 * redirect or aggregator URLs, not actual retailer product pages.
 * GearGraph price-discovery sometimes writes Serper item.link (Google Shopping
 * redirect) into product_url; strip those here so the component falls back to
 * reseller.websiteUrl instead.
 */
const INVALID_PRODUCT_URL_HOSTS = new Set([
  'google.com',
  'www.google.com',
  'google.de',
  'www.google.de',
  'bing.com',
  'www.bing.com',
  'yahoo.com',
  'www.yahoo.com',
  'shopping.google.com',
]);

function sanitizeProductUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (INVALID_PRODUCT_URL_HOSTS.has(hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Calculate distance between two coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Format distance for display
 */
function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

// =============================================================================
// Route Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check Trailblazer status
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (profile?.subscription_tier !== 'trailblazer') {
      return NextResponse.json(
        { error: 'Trailblazer subscription required' },
        { status: 403 }
      );
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const gearItemId = searchParams.get('gearItemId');
    const query = searchParams.get('query');
    const countryCode = searchParams.get('countryCode') || 'DE';

    // Search engines and invalid domains that must never appear as resellers
    const INVALID_RESELLER_DOMAINS = new Set(['google.com', 'google.de', 'bing.com', 'yahoo.com']);
    const latitudeRaw = searchParams.get('latitude');
    const longitudeRaw = searchParams.get('longitude');

    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }

    // Parse and validate coordinates
    let userLocation: { latitude: number; longitude: number } | null = null;
    if (latitudeRaw && longitudeRaw) {
      const latitude = parseFloat(latitudeRaw);
      const longitude = parseFloat(longitudeRaw);
      // Only use coordinates if both are valid finite numbers within valid ranges
      if (
        Number.isFinite(latitude) &&
        Number.isFinite(longitude) &&
        latitude >= -90 &&
        latitude <= 90 &&
        longitude >= -180 &&
        longitude <= 180
      ) {
        userLocation = { latitude, longitude };
      }
    }

    // Fetch active resellers for user's country
    const { data: resellersData, error: resellersError } = await supabase
      .from('resellers')
      .select('*')
      .eq('is_active', true)
      .neq('status', 'suspended')
      .contains('countries_served', [countryCode]);

    if (resellersError) {
      console.error('[Reseller Search] Error fetching resellers:', resellersError);
      throw new Error('Failed to fetch resellers');
    }

    // Map database fields to TypeScript interface
    const resellers: Reseller[] = (resellersData ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      websiteUrl: r.website_url,
      logoUrl: r.logo_url,
      resellerType: r.reseller_type as Reseller['resellerType'],
      status: r.status as Reseller['status'],
      countriesServed: r.countries_served,
      searchUrlTemplate: r.search_url_template,
      affiliateTag: r.affiliate_tag,
      location: parsePostGISLocation(r.location),
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      addressCity: r.address_city,
      addressPostalCode: r.address_postal_code,
      addressCountry: r.address_country,
      isActive: r.is_active,
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    if (resellers.length === 0) {
      return NextResponse.json<ResellerSearchResponse>({
        localPrices: [],
        onlinePrices: [],
        allPrices: [],
        fromCache: false,
      });
    }

    // Resolve gear item's product URL domain for manufacturer filtering
    let manufacturerDomain: string | null = null;
    if (gearItemId) {
      const { data: gearItem } = await supabase
        .from('gear_items')
        .select('product_url')
        .eq('id', gearItemId)
        .single();
      if (gearItem?.product_url) {
        try {
          manufacturerDomain = new URL(gearItem.product_url).hostname.replace(/^www\./, '');
        } catch {
          // Malformed URL — skip manufacturer filtering
        }
      }
    }

    // Check for cached price results
    let cachedResults: ResellerPriceResult[] = [];
    if (gearItemId) {
      const { data: cachedData } = await supabase
        .from('reseller_price_results')
        .select('*')
        .eq('gear_item_id', gearItemId)
        .gt('expires_at', new Date().toISOString());

      cachedResults = (cachedData ?? []).map((c) => ({
        id: c.id,
        resellerId: c.reseller_id,
        gearItemId: c.gear_item_id,
        priceAmount: c.price_amount,
        priceCurrency: c.price_currency,
        productUrl: sanitizeProductUrl(c.product_url),
        productName: c.product_name,
        inStock: c.in_stock ?? true,
        fetchedAt: c.fetched_at,
        expiresAt: c.expires_at,
      }));
    }

    // Build price results with reseller details
    // Optimize: Convert cachedResults to Map for O(1) lookup instead of O(n) find
    const cachedMap = new Map(cachedResults.map(c => [c.resellerId, c]));
    const priceResults: ResellerPriceWithDetails[] = [];

    for (const reseller of resellers) {
      // Check if we have cached price for this reseller
      const cached = cachedMap.get(reseller.id);

      if (cached) {
        // Use cached result
        // Calculate distance if user location and reseller location are available
        let distance: number | null = null;
        if (userLocation && reseller.location) {
          distance = calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            reseller.location.latitude,
            reseller.location.longitude
          );
        }

        priceResults.push({
          ...cached,
          reseller,
          distanceKm: distance,
          distanceFormatted: distance !== null ? formatDistance(distance) : null,
        });
      }
      // Note: In a real implementation, we would scrape/fetch prices from resellers
      // For now, we only show cached results
    }

    // Filter out manufacturer URLs and invalid search-engine domains.
    // Price discovery sometimes saves the brand's own site (e.g. durstongear.com)
    // or Google Shopping redirect URLs as "resellers" — exclude these from display.
    const filteredPriceResults = priceResults.filter((p) => {
      try {
        const resellerDomain = new URL(p.reseller.websiteUrl).hostname.replace(/^www\./, '');
        if (INVALID_RESELLER_DOMAINS.has(resellerDomain)) return false;
        if (manufacturerDomain && resellerDomain === manufacturerDomain) return false;
        return true;
      } catch {
        return true; // Keep entries with unparseable URLs
      }
    });

    // ==========================================================================
    // Serper Shopping live fallback — activated when DB has no cached results.
    // Mirrors what AI assistants do: real-time Google Shopping search.
    // Provides live prices + real product URLs (via secondary organic search).
    // ==========================================================================
    if (filteredPriceResults.length === 0 && process.env.SERPER_API_KEY) {
      const brand = query.split(' ')[0]; // Heuristic: first word is often the brand
      const serperHits = await searchSerperResellers(query, brand, countryCode, 3);

      if (serperHits.length > 0) {
        const liveResults: ResellerPriceWithDetails[] = serperHits
          .filter((hit) => {
            if (!hit.websiteUrl) return false;
            try {
              const domain = new URL(hit.websiteUrl).hostname.replace(/^www\./, '');
              if (INVALID_RESELLER_DOMAINS.has(domain)) return false;
              if (manufacturerDomain && domain === manufacturerDomain) return false;
              return true;
            } catch {
              return false;
            }
          })
          .map((hit, idx) => ({
            // Synthetic IDs for live results (not persisted in DB)
            id: `live-${idx}`,
            resellerId: `live-${idx}`,
            gearItemId: gearItemId ?? '',
            priceAmount: hit.priceAmount,
            priceCurrency: hit.priceCurrency,
            productUrl: hit.productUrl,
            productName: hit.title,
            inStock: true,
            fetchedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
            reseller: {
              id: `live-${idx}`,
              name: hit.source.replace(/^!\s*/, '').trim(),
              websiteUrl: hit.websiteUrl!,
              logoUrl: null,
              resellerType: 'online' as const,
              status: 'standard' as const,
              countriesServed: [countryCode],
              searchUrlTemplate: null,
              affiliateTag: null,
              location: null,
              addressLine1: null,
              addressLine2: null,
              addressCity: null,
              addressPostalCode: null,
              addressCountry: null,
              isActive: true,
              priority: 50,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
            distanceKm: null,
            distanceFormatted: null,
          }));

        const livePrices = liveResults
          .sort((a, b) => a.priceAmount - b.priceAmount)
          .slice(0, 3);

        return NextResponse.json<ResellerSearchResponse>({
          localPrices: [],
          onlinePrices: livePrices,
          allPrices: livePrices,
          fromCache: false,
        });
      }
    }

    // Separate local and online resellers
    const localPrices = filteredPriceResults
      .filter((p) => p.reseller.resellerType === 'local' || p.reseller.resellerType === 'chain')
      .sort((a, b) => {
        // Sort by distance if available, otherwise by price
        if (a.distanceKm !== null && b.distanceKm !== null) {
          return a.distanceKm - b.distanceKm;
        }
        return a.priceAmount - b.priceAmount;
      })
      .slice(0, 2);

    const onlinePrices = filteredPriceResults
      .filter((p) => p.reseller.resellerType === 'online')
      .sort((a, b) => a.priceAmount - b.priceAmount)
      .slice(0, 1);

    // Combine all prices sorted by total price
    const allPrices = [...localPrices, ...onlinePrices].sort(
      (a, b) => a.priceAmount - b.priceAmount
    );

    const response: ResellerSearchResponse = {
      localPrices,
      onlinePrices,
      allPrices,
      fromCache: cachedResults.length > 0,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Reseller Search] Error:', error);
    return NextResponse.json(
      { error: 'Failed to search resellers' },
      { status: 500 }
    );
  }
}
