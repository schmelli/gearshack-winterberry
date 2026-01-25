/**
 * eBay Browse API Client
 *
 * Feature: 054-ebay-integration
 * Purpose: Search eBay listings using the official Browse API
 *
 * @see https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */

import { getEbayAccessToken } from './oauth';
import { mapBrowseApiResponse } from './mapper';
import type {
  BrowseApiSearchResponse,
  BrowseApiSearchParams,
  EbayMarketplaceId,
} from './types';
import type { EbayListing, EbaySiteConfig } from '@/types/ebay';

// =============================================================================
// Configuration
// =============================================================================

const EBAY_API_CONFIG = {
  /** Production API base URL */
  productionUrl: 'https://api.ebay.com/buy/browse/v1',
  /** Sandbox API base URL */
  sandboxUrl: 'https://api.sandbox.ebay.com/buy/browse/v1',
  /** Default limit for search results */
  defaultLimit: 20,
  /** Maximum allowed limit */
  maxLimit: 200,
  /** Request timeout in ms */
  timeoutMs: 10000,
} as const;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get API base URL based on environment
 */
function getApiBaseUrl(): string {
  const isProduction = process.env.EBAY_ENVIRONMENT !== 'sandbox';
  return isProduction
    ? EBAY_API_CONFIG.productionUrl
    : EBAY_API_CONFIG.sandboxUrl;
}

/**
 * Build search URL with query parameters
 */
function buildSearchUrl(params: BrowseApiSearchParams): string {
  const baseUrl = `${getApiBaseUrl()}/item_summary/search`;
  const searchParams = new URLSearchParams();

  // Required parameter
  searchParams.set('q', params.q);

  // Optional parameters
  if (params.category_ids) {
    searchParams.set('category_ids', params.category_ids);
  }
  if (params.filter) {
    searchParams.set('filter', params.filter);
  }
  if (params.limit !== undefined) {
    searchParams.set('limit', Math.min(params.limit, EBAY_API_CONFIG.maxLimit).toString());
  }
  if (params.offset !== undefined) {
    searchParams.set('offset', params.offset.toString());
  }
  if (params.sort) {
    searchParams.set('sort', params.sort);
  }
  if (params.fieldgroups) {
    searchParams.set('fieldgroups', params.fieldgroups);
  }
  if (params.aspect_filter) {
    searchParams.set('aspect_filter', params.aspect_filter);
  }
  if (params.gtin) {
    searchParams.set('gtin', params.gtin);
  }
  if (params.epid) {
    searchParams.set('epid', params.epid);
  }

  return `${baseUrl}?${searchParams.toString()}`;
}

/**
 * Create abort controller with timeout
 * Returns both controller and timeout ID for cleanup
 */
function createTimeoutController(timeoutMs: number): {
  controller: AbortController;
  timeoutId: ReturnType<typeof setTimeout>;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeoutId };
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Search eBay listings using Browse API
 *
 * @param query - Search query string
 * @param marketplaceId - eBay marketplace (e.g., 'EBAY_DE')
 * @param options - Additional search options
 * @returns Raw Browse API response
 */
export async function searchEbayBrowseApi(
  query: string,
  marketplaceId: EbayMarketplaceId,
  options: Partial<Omit<BrowseApiSearchParams, 'q'>> = {}
): Promise<BrowseApiSearchResponse> {
  const accessToken = await getEbayAccessToken();
  const url = buildSearchUrl({ q: query, ...options });

  if (process.env.NODE_ENV === 'development') {
    console.log(`[eBay Browse API] Searching: ${query} on ${marketplaceId}`);
  }

  const { controller, timeoutId } = createTimeoutController(EBAY_API_CONFIG.timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-EBAY-C-MARKETPLACE-ID': marketplaceId,
        'X-EBAY-C-ENDUSERCTX': 'affiliateCampaignId=<ePNCampaignId>,affiliateReferenceId=<referenceId>',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[eBay Browse API] Search failed:', response.status, errorText);

    // Handle specific error codes
    if (response.status === 401) {
      throw new Error('eBay authentication failed. Check your credentials.');
    }
    if (response.status === 429) {
      throw new Error('eBay rate limit exceeded. Please try again later.');
    }

    throw new Error(`eBay API error: ${response.status} - ${errorText}`);
  }

  const data: BrowseApiSearchResponse = await response.json();

  if (process.env.NODE_ENV === 'development') {
    console.log(`[eBay Browse API] Found ${data.total} results, returned ${data.itemSummaries?.length ?? 0}`);
  }

  return data;
}

/**
 * Search eBay with localization support (drop-in replacement for SerpAPI)
 *
 * This function provides the same interface as the old searchEbayLocalized
 * function from serpapi-client.ts, making migration seamless.
 *
 * @param query - Search query (brand + product name)
 * @param siteConfig - eBay site configuration (from ebay-sites.ts)
 * @param limit - Maximum results (default: 10)
 * @returns Array of EbayListing objects
 */
export async function searchEbayLocalized(
  query: string,
  siteConfig: EbaySiteConfig,
  limit: number = 10
): Promise<EbayListing[]> {
  // Get marketplace ID from site config
  const marketplaceId = getMarketplaceId(siteConfig);

  try {
    const response = await searchEbayBrowseApi(query, marketplaceId, {
      limit: Math.min(limit, 50), // Cap at 50 for performance
      sort: 'price', // Sort by price (lowest first)
    });

    // Map Browse API response to EbayListing format
    return mapBrowseApiResponse(response, siteConfig);
  } catch (error) {
    console.error('[eBay Browse API] searchEbayLocalized error:', error);
    throw error;
  }
}

/**
 * Get marketplace ID from site config
 */
function getMarketplaceId(siteConfig: EbaySiteConfig): EbayMarketplaceId {
  // Use marketplaceId if available (new field)
  if (siteConfig.marketplaceId) {
    return siteConfig.marketplaceId as EbayMarketplaceId;
  }

  // Fallback: derive from serpApiDomain (legacy field)
  if (siteConfig.serpApiDomain) {
    return siteConfig.serpApiDomain as EbayMarketplaceId;
  }

  // Default to US
  return 'EBAY_US';
}

/**
 * Search eBay with condition filter
 *
 * @param query - Search query
 * @param marketplaceId - eBay marketplace
 * @param conditions - Array of condition IDs to filter
 * @param limit - Maximum results
 */
export async function searchEbayByCondition(
  query: string,
  marketplaceId: EbayMarketplaceId,
  conditions: string[],
  limit: number = 20
): Promise<BrowseApiSearchResponse> {
  const conditionFilter = `conditionIds:{${conditions.join('|')}}`;

  return searchEbayBrowseApi(query, marketplaceId, {
    filter: conditionFilter,
    limit,
  });
}

/**
 * Search eBay with price range filter
 *
 * @param query - Search query
 * @param marketplaceId - eBay marketplace
 * @param minPrice - Minimum price
 * @param maxPrice - Maximum price
 * @param currency - Currency code (e.g., 'EUR')
 * @param limit - Maximum results
 */
export async function searchEbayByPriceRange(
  query: string,
  marketplaceId: EbayMarketplaceId,
  minPrice: number,
  maxPrice: number,
  currency: string = 'EUR',
  limit: number = 20
): Promise<BrowseApiSearchResponse> {
  const priceFilter = `price:[${minPrice}..${maxPrice}],priceCurrency:${currency}`;

  return searchEbayBrowseApi(query, marketplaceId, {
    filter: priceFilter,
    limit,
    sort: 'price',
  });
}

/**
 * Search eBay for Buy It Now listings only
 */
export async function searchEbayBuyItNow(
  query: string,
  marketplaceId: EbayMarketplaceId,
  limit: number = 20
): Promise<BrowseApiSearchResponse> {
  return searchEbayBrowseApi(query, marketplaceId, {
    filter: 'buyingOptions:{FIXED_PRICE}',
    limit,
    sort: 'price',
  });
}

/**
 * Search eBay for auctions only
 */
export async function searchEbayAuctions(
  query: string,
  marketplaceId: EbayMarketplaceId,
  limit: number = 20
): Promise<BrowseApiSearchResponse> {
  return searchEbayBrowseApi(query, marketplaceId, {
    filter: 'buyingOptions:{AUCTION}',
    limit,
    sort: 'endingSoonest',
  });
}
