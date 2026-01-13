/**
 * SerpApi client for price search functionality
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 * Enhanced: 2026-01-01 (Feature 055 - category-based result filtering)
 * Enhanced: 2026-01-13 (Feature 057 - localized eBay search for wishlist)
 */

import { RETRY_CONFIG, CACHE_CONFIG } from '@/lib/constants/price-tracking';
import { matchesProductType } from './search-query-builder';
import type { PriceResult } from '@/types/price-tracking';
import type { EbayListing, EbaySiteConfig, EbayCondition, EbayListingType } from '@/types/ebay';

/**
 * Retry helper with exponential backoff (Review fix #14)
 */
async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries: number = RETRY_CONFIG.MAX_RETRIES
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // Only retry on 5xx errors or network errors
      if (response.ok || response.status < 500) {
        return response;
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error as Error;
    }

    // Don't wait after the last attempt
    if (attempt < maxRetries - 1) {
      const backoffMs = Math.min(
        RETRY_CONFIG.INITIAL_BACKOFF_MS * Math.pow(2, attempt),
        RETRY_CONFIG.MAX_BACKOFF_MS
      );
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError || new Error('Failed after retries');
}

interface SerpApiGoogleShoppingResult {
  title: string;
  link: string;
  price: string;
  extracted_price: number;
  thumbnail: string;
  seller: string;
  delivery?: string;
}

interface SerpApiEbayResult {
  title: string;
  link: string;
  price: {
    raw: string;
    extracted: number;
  };
  thumbnail: string;
  condition?: string;
}

/**
 * Valid product condition values (Review fix #18)
 */
const VALID_CONDITIONS = ['new', 'used', 'refurbished', 'open_box'] as const;
type ProductCondition = typeof VALID_CONDITIONS[number];

/**
 * Type guard to safely validate product condition (Review fix #18)
 */
function isValidCondition(condition: string | undefined): condition is ProductCondition {
  if (!condition) return false;
  return VALID_CONDITIONS.includes(condition as ProductCondition);
}

/**
 * Normalize product condition with fallback (Review fix #18)
 */
function normalizeCondition(condition: string | undefined): ProductCondition {
  if (isValidCondition(condition)) {
    return condition;
  }
  // Default to 'new' if invalid or missing
  return 'new';
}

/**
 * Search Google Shopping via SerpApi with optional category filtering
 * Enhanced to filter results by product type keywords (Feature 055)
 */
export async function searchGoogleShopping(
  query: string,
  location: string = 'Germany',
  productTypeKeywords: string[] = []
): Promise<PriceResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    engine: 'google_shopping',
    q: query,
    api_key: process.env.SERPAPI_KEY,
    location,
    num: '10',
  });

  try {
    const response = await fetchWithRetry(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SerpApiGoogleShoppingResult[] = data.shopping_results || [];

    // Filter results by product type before mapping (Feature 055)
    const filteredResults = productTypeKeywords.length > 0
      ? results.filter(r => matchesProductType(r.title, productTypeKeywords))
      : results;

    if (process.env.NODE_ENV === 'development' && productTypeKeywords.length > 0) {
      console.log(`[Google Shopping] Filtered ${results.length} -> ${filteredResults.length} results by product type`);
    }

    return filteredResults.map((result) => ({
      id: crypto.randomUUID(),
      tracking_id: '', // Will be set by caller
      source_type: 'google_shopping' as const,
      source_name: result.seller || 'Google Shopping',
      source_url: result.link,
      price_amount: result.extracted_price,
      price_currency: 'EUR',
      shipping_cost: result.delivery ? parseShippingCost(result.delivery) : null,
      shipping_currency: 'EUR',
      total_price: result.extracted_price + (result.delivery ? parseShippingCost(result.delivery) : 0),
      product_name: result.title,
      product_image_url: result.thumbnail || null,
      product_condition: normalizeCondition('new'),
      is_local: false,
      shop_latitude: null,
      shop_longitude: null,
      distance_km: null,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_CONFIG.TTL_MS).toISOString(),
    }));
  } catch (error) {
    console.error('Google Shopping search error:', error);
    throw new Error(`Failed to search Google Shopping: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Search eBay via SerpApi with optional category filtering
 * Enhanced to filter results by product type keywords (Feature 055)
 */
export async function searchEbay(
  query: string,
  productTypeKeywords: string[] = []
): Promise<PriceResult[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    engine: 'ebay',
    q: query,
    api_key: process.env.SERPAPI_KEY,
    _nkw: query,
  });

  try {
    const response = await fetchWithRetry(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SerpApiEbayResult[] = data.organic_results || [];

    // Filter results by product type before mapping (Feature 055)
    const filteredResults = productTypeKeywords.length > 0
      ? results.filter(r => matchesProductType(r.title, productTypeKeywords))
      : results;

    if (process.env.NODE_ENV === 'development' && productTypeKeywords.length > 0) {
      console.log(`[eBay] Filtered ${results.length} -> ${filteredResults.length} results by product type`);
    }

    return filteredResults.map((result) => ({
      id: crypto.randomUUID(),
      tracking_id: '', // Will be set by caller
      source_type: 'ebay' as const,
      source_name: 'eBay',
      source_url: result.link,
      price_amount: result.price.extracted,
      price_currency: 'EUR',
      shipping_cost: null,
      shipping_currency: 'EUR',
      total_price: result.price.extracted,
      product_name: result.title,
      product_image_url: result.thumbnail || null,
      product_condition: normalizeCondition(result.condition?.toLowerCase()),
      is_local: false,
      shop_latitude: null,
      shop_longitude: null,
      distance_km: null,
      fetched_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_CONFIG.TTL_MS).toISOString(),
    }));
  } catch (error) {
    console.error('eBay search error:', error);
    throw new Error(`Failed to search eBay: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse shipping cost from delivery string
 */
function parseShippingCost(delivery: string): number {
  const match = delivery.match(/€(\d+(?:[.,]\d+)?)/);
  if (match) {
    return parseFloat(match[1].replace(',', '.'));
  }
  return 0;
}

// =============================================================================
// Localized eBay Search for Wishlist (Feature 057)
// =============================================================================

/**
 * SerpApi eBay organic result structure
 */
interface SerpApiEbayOrganic {
  position: number;
  title: string;
  link: string;
  price?: {
    raw?: string;
    extracted?: number;
  };
  thumbnail?: string;
  condition?: string;
  bid_count?: number;
  bids?: {
    count?: number;
    time_left?: string;
  };
  shipping?: string;
  buy_it_now?: boolean;
  buy_it_now_price?: {
    raw?: string;
    extracted?: number;
  };
  best_offer?: boolean;
  seller?: {
    name?: string;
    feedback_percentage?: number;
    feedback_count?: number;
    top_rated?: boolean;
  };
  item_location?: string;
}

/**
 * Map SerpApi condition to our EbayCondition type
 */
function mapCondition(condition: string | undefined): EbayCondition {
  if (!condition) return 'used';
  const lower = condition.toLowerCase();
  if (lower.includes('new')) return 'new';
  if (lower.includes('open box') || lower.includes('open-box')) return 'open_box';
  if (lower.includes('refurbished') || lower.includes('renewed')) return 'refurbished';
  if (lower.includes('parts') || lower.includes('not working')) return 'for_parts';
  return 'used';
}

/**
 * Determine listing type from SerpApi result
 */
function mapListingType(result: SerpApiEbayOrganic): EbayListingType {
  if (result.best_offer) return 'best_offer';
  if (result.buy_it_now || result.buy_it_now_price) return 'buy_it_now';
  if (result.bid_count !== undefined || result.bids) return 'auction';
  return 'buy_it_now'; // Default
}

/**
 * Parse shipping cost from eBay shipping string
 */
function parseEbayShippingCost(shipping: string | undefined): number | null {
  if (!shipping) return null;
  if (shipping.toLowerCase().includes('free')) return 0;
  const match = shipping.match(/[\d.,]+/);
  if (match) {
    return parseFloat(match[0].replace(',', '.'));
  }
  return null;
}

/**
 * Format price with currency symbol
 */
function formatPrice(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency,
  });
  return formatter.format(amount);
}

/**
 * Search eBay with locale-specific domain for wishlist pricing (Feature 057)
 * Returns EbayListing[] for display in wishlist item detail modal
 *
 * @param query - Search query (brand + product name)
 * @param siteConfig - eBay site configuration for locale
 * @param limit - Maximum number of results (default: 10)
 * @returns Array of EbayListing objects
 */
export async function searchEbayLocalized(
  query: string,
  siteConfig: EbaySiteConfig,
  limit: number = 10
): Promise<EbayListing[]> {
  if (!process.env.SERPAPI_KEY) {
    throw new Error('SERPAPI_KEY environment variable is not set');
  }

  const params = new URLSearchParams({
    engine: 'ebay',
    _nkw: query,
    api_key: process.env.SERPAPI_KEY,
    ...(siteConfig.serpApiDomain && { ebay_domain: siteConfig.serpApiDomain }),
  });

  try {
    const response = await fetchWithRetry(`https://serpapi.com/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`SerpApi error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const results: SerpApiEbayOrganic[] = data.organic_results || [];

    if (process.env.NODE_ENV === 'development') {
      console.log(`[eBay Localized] Found ${results.length} results for "${query}" on ${siteConfig.site}`);
    }

    return results.slice(0, limit).map((result): EbayListing => {
      const price = result.price?.extracted ?? result.buy_it_now_price?.extracted ?? 0;
      const priceRaw = result.price?.raw ?? result.buy_it_now_price?.raw ?? '';

      return {
        id: `ebay-${result.position}-${Date.now()}`,
        title: result.title,
        url: result.link,
        thumbnailUrl: result.thumbnail || null,
        price,
        currency: siteConfig.currency,
        priceFormatted: priceRaw || formatPrice(price, siteConfig.currency),
        listingType: mapListingType(result),
        condition: mapCondition(result.condition),
        shippingCost: parseEbayShippingCost(result.shipping),
        seller: result.seller ? {
          username: result.seller.name || 'Unknown Seller',
          feedbackPercent: result.seller.feedback_percentage ?? null,
          feedbackCount: result.seller.feedback_count ?? null,
          badge: result.seller.top_rated ? 'Top Rated' : undefined,
        } : null,
        bidCount: result.bid_count ?? result.bids?.count,
        timeLeft: result.bids?.time_left,
        shipsToUser: true, // Assume true for now, could be enhanced
        location: result.item_location || null,
      };
    });
  } catch (error) {
    console.error('eBay localized search error:', error);
    throw new Error(`Failed to search eBay (${siteConfig.site}): ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
