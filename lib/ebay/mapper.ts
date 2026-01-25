/**
 * eBay Browse API Response Mapper
 *
 * Feature: 054-ebay-integration
 * Purpose: Map Browse API responses to application types (EbayListing)
 *
 * This mapper converts the eBay Browse API response format to our
 * internal EbayListing format, ensuring compatibility with existing
 * components and hooks.
 */

import type {
  BrowseApiSearchResponse,
  BrowseApiItemSummary,
} from './types';
import type {
  EbayListing,
  EbaySeller,
  EbayListingType,
  EbayCondition,
  EbaySiteConfig,
} from '@/types/ebay';

// =============================================================================
// Condition Mapping
// =============================================================================

/**
 * Map eBay condition string to our EbayCondition type
 */
function mapCondition(condition?: string, conditionId?: string): EbayCondition {
  // Map by condition ID first (more reliable)
  if (conditionId) {
    const id = parseInt(conditionId, 10);
    if (id === 1000) return 'new';
    if (id >= 1500 && id < 2000) return 'new'; // New (Other), New with defects
    if (id >= 2000 && id < 3000) return 'refurbished';
    if (id >= 2750 && id < 7000) return 'used';
    if (id === 7000) return 'for_parts';
  }

  // Fallback: map by condition string
  if (!condition) return 'used';
  const lower = condition.toLowerCase();

  if (lower.includes('new')) return 'new';
  if (lower.includes('open box')) return 'open_box';
  if (lower.includes('refurbished') || lower.includes('renewed')) return 'refurbished';
  if (lower.includes('parts') || lower.includes('not working')) return 'for_parts';

  return 'used';
}

// =============================================================================
// Listing Type Mapping
// =============================================================================

/**
 * Map eBay buying options to our EbayListingType
 */
function mapListingType(buyingOptions: string[]): EbayListingType {
  if (!buyingOptions || buyingOptions.length === 0) {
    return 'buy_it_now';
  }

  // Check for auction first
  if (buyingOptions.includes('AUCTION')) {
    // If both AUCTION and FIXED_PRICE, prefer buy_it_now
    if (buyingOptions.includes('FIXED_PRICE')) {
      return 'buy_it_now';
    }
    return 'auction';
  }

  if (buyingOptions.includes('BEST_OFFER')) {
    return 'best_offer';
  }

  return 'buy_it_now';
}

// =============================================================================
// Price Formatting
// =============================================================================

/**
 * Format price with locale-specific formatting
 */
function formatPrice(value: string | number, currency: string): string {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numericValue)) {
    return `${currency} 0.00`;
  }

  try {
    // Determine locale based on currency
    const localeMap: Record<string, string> = {
      EUR: 'de-DE',
      USD: 'en-US',
      GBP: 'en-GB',
      CHF: 'de-CH',
      AUD: 'en-AU',
      CAD: 'en-CA',
      PLN: 'pl-PL',
    };

    const locale = localeMap[currency] || 'en-US';

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(numericValue);
  } catch {
    // Fallback formatting
    return `${currency} ${numericValue.toFixed(2)}`;
  }
}

// =============================================================================
// Seller Mapping
// =============================================================================

/**
 * Map eBay seller info to our EbaySeller type
 */
function mapSeller(seller?: BrowseApiItemSummary['seller']): EbaySeller | null {
  if (!seller) return null;

  return {
    username: seller.username,
    feedbackPercent: seller.feedbackPercentage
      ? parseFloat(seller.feedbackPercentage)
      : null,
    feedbackCount: seller.feedbackScore ?? null,
    // Note: Top Rated status comes from topRatedBuyingExperience flag on item
  };
}

// =============================================================================
// Location Mapping
// =============================================================================

/**
 * Build location string from item location
 */
function mapLocation(itemLocation?: BrowseApiItemSummary['itemLocation']): string | null {
  if (!itemLocation) return null;

  const parts: string[] = [];
  if (itemLocation.city) parts.push(itemLocation.city);
  if (itemLocation.stateOrProvince) parts.push(itemLocation.stateOrProvince);
  if (itemLocation.country) parts.push(itemLocation.country);

  return parts.length > 0 ? parts.join(', ') : null;
}

// =============================================================================
// Shipping Cost Extraction
// =============================================================================

/**
 * Extract shipping cost from shipping options
 */
function extractShippingCost(
  shippingOptions?: BrowseApiItemSummary['shippingOptions']
): number | null {
  if (!shippingOptions || shippingOptions.length === 0) {
    return null;
  }

  // Find the cheapest shipping option
  let cheapestCost: number | null = null;

  for (const option of shippingOptions) {
    if (option.shippingCostType === 'FIXED' && option.shippingCost) {
      const cost = parseFloat(option.shippingCost.value);
      if (!isNaN(cost)) {
        if (cheapestCost === null || cost < cheapestCost) {
          cheapestCost = cost;
        }
      }
    }
    // FREE shipping
    if (option.shippingCostType === 'FIXED' && !option.shippingCost) {
      return 0;
    }
  }

  return cheapestCost;
}

// =============================================================================
// Main Mapper Function
// =============================================================================

/**
 * Map a single Browse API item summary to EbayListing
 */
function mapItemSummary(
  item: BrowseApiItemSummary,
  currency: string
): EbayListing {
  // Get price (handle both regular price and bid price)
  const priceData = item.price || item.currentBidPrice;
  const priceValue = priceData ? parseFloat(priceData.value) : 0;
  const priceCurrency = priceData?.currency || currency;

  return {
    id: item.itemId,
    title: item.title,
    url: item.itemWebUrl,
    thumbnailUrl: item.image?.imageUrl || item.thumbnailImages?.[0]?.imageUrl || null,
    price: priceValue,
    currency: priceCurrency,
    priceFormatted: formatPrice(priceValue, priceCurrency),
    listingType: mapListingType(item.buyingOptions),
    condition: mapCondition(item.condition, item.conditionId),
    shippingCost: extractShippingCost(item.shippingOptions),
    seller: mapSeller(item.seller),
    bidCount: item.bidCount,
    timeLeft: item.itemEndDate ? formatTimeLeft(item.itemEndDate) : undefined,
    shipsToUser: true, // Assume true, would need location-based filtering for accuracy
    location: mapLocation(item.itemLocation),
  };
}

/**
 * Format time left until auction ends
 */
function formatTimeLeft(endDate: string): string | undefined {
  try {
    const end = new Date(endDate);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return 'Ended';

    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours % 24}h`;
    }

    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    }

    return `${diffMinutes}m`;
  } catch {
    return undefined;
  }
}

/**
 * Map Browse API search response to array of EbayListing
 *
 * @param response - Raw Browse API response
 * @param siteConfig - eBay site configuration (for currency)
 * @returns Array of EbayListing objects
 */
export function mapBrowseApiResponse(
  response: BrowseApiSearchResponse,
  siteConfig: EbaySiteConfig
): EbayListing[] {
  if (!response.itemSummaries || response.itemSummaries.length === 0) {
    return [];
  }

  return response.itemSummaries.map((item) =>
    mapItemSummary(item, siteConfig.currency)
  );
}

/**
 * Map a single item summary (exported for testing)
 */
export { mapItemSummary };
