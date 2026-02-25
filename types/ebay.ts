/**
 * eBay Types and Interfaces
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Types for eBay listing search and display
 */

// =============================================================================
// eBay Site Configuration
// =============================================================================

/**
 * eBay site configuration for localized searches
 */
export interface EbaySiteConfig {
  /** eBay domain (e.g., 'ebay.de', 'ebay.com') */
  site: string;
  /** Default currency for this site */
  currency: string;
  /** Human-readable country name */
  country: string;
  /** eBay Browse API Marketplace ID (e.g., 'EBAY_DE') */
  marketplaceId: string;
  /** @deprecated Use marketplaceId instead. SerpApi ebay_domain parameter */
  serpApiDomain?: string;
}

/**
 * Mapping of locale codes to eBay site configurations
 */
export type EbaySiteMap = Record<string, EbaySiteConfig>;

// =============================================================================
// eBay Listing Types
// =============================================================================

/**
 * Type of eBay listing
 */
export type EbayListingType = 'auction' | 'buy_it_now' | 'best_offer';

/**
 * Condition of item in eBay listing
 */
export type EbayCondition = 'new' | 'open_box' | 'refurbished' | 'used' | 'for_parts';

/**
 * Single eBay listing result
 */
export interface EbayListing {
  /** Unique listing ID (from eBay) */
  id: string;
  /** Listing title */
  title: string;
  /** eBay listing URL */
  url: string;
  /** Thumbnail image URL */
  thumbnailUrl: string | null;
  /** Current price amount */
  price: number;
  /** Price currency code */
  currency: string;
  /** Formatted price string (e.g., "€645,00") */
  priceFormatted: string;
  /** Listing type */
  listingType: EbayListingType;
  /** Item condition */
  condition: EbayCondition;
  /** Shipping cost (null if not available) */
  shippingCost: number | null;
  /** Seller information */
  seller: EbaySeller | null;
  /** Number of bids (for auctions) */
  bidCount?: number;
  /** Time remaining (for auctions) */
  timeLeft?: string;
  /** Whether item ships to user's country */
  shipsToUser: boolean;
  /** Item location */
  location: string | null;
}

/**
 * eBay seller information
 */
export interface EbaySeller {
  /** Seller username */
  username: string;
  /** Feedback percentage (0-100) */
  feedbackPercent: number | null;
  /** Total feedback count */
  feedbackCount: number | null;
  /** Seller rating badge (e.g., "Top Rated") */
  badge?: string;
}

/**
 * Detailed eBay listing (for popup)
 */
export interface EbayListingDetails extends EbayListing {
  /** Full item description (HTML) */
  description: string | null;
  /** Large image URL */
  imageUrl: string | null;
  /** All gallery images */
  galleryImages: string[];
  /** Shipping options */
  shippingOptions: EbayShippingOption[];
  /** Return policy */
  returnPolicy: string | null;
  /** Item specifics (key-value pairs) */
  itemSpecifics: Record<string, string>;
  /** Auction end time (ISO string) */
  endTime?: string;
  /** Starting price (for auctions) */
  startingPrice?: number;
  /** Buy it now price (if available) */
  buyItNowPrice?: number;
}

/**
 * Shipping option for eBay listing
 */
export interface EbayShippingOption {
  /** Shipping method name */
  name: string;
  /** Cost */
  cost: number | null;
  /** Estimated delivery time */
  deliveryEstimate: string | null;
}

// =============================================================================
// eBay Search Types
// =============================================================================

/**
 * Parameters for eBay search
 */
export interface EbaySearchParams {
  /** Search query (brand + product name) */
  query: string;
  /** Brand name for filtering */
  brand?: string;
  /** Product type keywords for filtering */
  productTypeKeywords?: string[];
  /** User's locale for site selection */
  locale: string;
  /** Maximum results to return */
  limit?: number;
  /** MSRP for knockoff filtering */
  msrp?: number;
}

/**
 * eBay search response
 */
export interface EbaySearchResponse {
  /** List of filtered listings */
  listings: EbayListing[];
  /** Total results before filtering */
  totalResults: number;
  /** eBay site used */
  ebaySite: string;
  /** Whether results were cached */
  fromCache: boolean;
  /** Cache expiration time (ISO string) */
  cacheExpiresAt: string | null;
}

// =============================================================================
// eBay Cache Types
// =============================================================================

/**
 * Cached eBay search results (from database)
 */
export interface EbayCacheEntry {
  id: string;
  searchQuery: string;
  ebaySite: string;
  countryCode: string;
  results: EbayListing[];
  resultCount: number;
  createdAt: string;
  expiresAt: string;
}

// =============================================================================
// Filter Types
// =============================================================================

/**
 * Patterns to exclude from eBay results
 */
export interface EbayFilterPatterns {
  /** Accessory keywords to exclude */
  accessories: string[];
  /** Knockoff indicator patterns */
  knockoffs: string[];
  /** Minimum price ratio vs MSRP (below = likely knockoff) */
  minPriceRatio: number;
}

/**
 * Default filter patterns
 */
export const DEFAULT_FILTER_PATTERNS: EbayFilterPatterns = {
  accessories: [
    'footprint',
    'groundsheet',
    'stuff sack',
    'compression sack',
    'repair kit',
    'repair patch',
    'replacement',
    'spare parts',
    'compatible with',
    'fits',
    'for use with',
    'accessory',
    'accessories',
  ],
  knockoffs: [
    'not genuine',
    'not original',
    'replica',
    'copy',
    'fake',
    'knockoff',
    'knock-off',
    'imitation',
    'alternative to',
    'similar to',
    'like',
  ],
  minPriceRatio: 0.3, // Items below 30% of MSRP are likely knockoffs
};
