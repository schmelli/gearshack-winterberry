/**
 * eBay Browse API Types
 *
 * Feature: 054-ebay-integration
 * Purpose: Type definitions for eBay Browse API responses
 *
 * @see https://developer.ebay.com/api-docs/buy/browse/resources/item_summary/methods/search
 */

// =============================================================================
// Browse API Response Types
// =============================================================================

/**
 * Root response from Browse API search endpoint
 */
export interface BrowseApiSearchResponse {
  href: string;
  total: number;
  next?: string;
  prev?: string;
  limit: number;
  offset: number;
  itemSummaries?: BrowseApiItemSummary[];
  refinement?: BrowseApiRefinement;
  warnings?: BrowseApiWarning[];
}

/**
 * Single item summary from search results
 */
export interface BrowseApiItemSummary {
  itemId: string;
  title: string;
  itemWebUrl: string;
  itemAffiliateWebUrl?: string;
  image?: BrowseApiImage;
  thumbnailImages?: BrowseApiImage[];
  price?: BrowseApiPrice;
  currentBidPrice?: BrowseApiPrice;
  buyingOptions: string[]; // 'FIXED_PRICE', 'AUCTION', 'BEST_OFFER'
  condition?: string;
  conditionId?: string;
  seller?: BrowseApiSeller;
  shippingOptions?: BrowseApiShippingOption[];
  itemLocation?: BrowseApiItemLocation;
  categories?: BrowseApiCategory[];
  bidCount?: number;
  itemEndDate?: string; // ISO 8601
  itemCreationDate?: string;
  topRatedBuyingExperience?: boolean;
  priorityListing?: boolean;
  adultOnly?: boolean;
  legacyItemId?: string;
  availableCoupons?: boolean;
  itemGroupType?: string;
  itemGroupHref?: string;
  leafCategoryIds?: string[];
  marketingPrice?: BrowseApiMarketingPrice;
  shortDescription?: string;
  pickupOptions?: BrowseApiPickupOption[];
  watchCount?: number;
  qualifiedPrograms?: string[];
  distanceFromPickupLocation?: BrowseApiDistance;
}

/**
 * Image information
 */
export interface BrowseApiImage {
  imageUrl: string;
  width?: number;
  height?: number;
}

/**
 * Price information
 */
export interface BrowseApiPrice {
  value: string; // Decimal string, e.g. "123.45"
  currency: string; // ISO 4217 code, e.g. "EUR"
  convertedFromValue?: string;
  convertedFromCurrency?: string;
}

/**
 * Seller information
 */
export interface BrowseApiSeller {
  username: string;
  feedbackPercentage?: string; // e.g. "99.5"
  feedbackScore?: number;
  sellerAccountType?: string;
}

/**
 * Shipping option
 */
export interface BrowseApiShippingOption {
  shippingCostType: string; // 'FIXED', 'CALCULATED', 'NOT_SPECIFIED'
  shippingCost?: BrowseApiPrice;
  minEstimatedDeliveryDate?: string;
  maxEstimatedDeliveryDate?: string;
  guaranteedDelivery?: boolean;
  type?: string; // 'ECONOMY', 'STANDARD', 'EXPEDITED', etc.
}

/**
 * Item location
 */
export interface BrowseApiItemLocation {
  city?: string;
  stateOrProvince?: string;
  postalCode?: string;
  country?: string; // ISO 3166-1 alpha-2
}

/**
 * Category information
 */
export interface BrowseApiCategory {
  categoryId: string;
  categoryName?: string;
}

/**
 * Marketing price (original price / discount info)
 */
export interface BrowseApiMarketingPrice {
  originalPrice?: BrowseApiPrice;
  discountPercentage?: string;
  discountAmount?: BrowseApiPrice;
  priceTreatment?: string; // 'MINIMUM_ADVERTISED_PRICE', 'LIST_PRICE', etc.
}

/**
 * Pickup option (for local pickup)
 */
export interface BrowseApiPickupOption {
  pickupLocationType?: string;
}

/**
 * Distance from pickup location
 */
export interface BrowseApiDistance {
  value: string;
  unit: string; // 'km', 'mi'
}

/**
 * Search refinement
 */
export interface BrowseApiRefinement {
  aspectDistributions?: BrowseApiAspectDistribution[];
  buyingOptionDistributions?: BrowseApiBuyingOptionDistribution[];
  categoryDistributions?: BrowseApiCategoryDistribution[];
  conditionDistributions?: BrowseApiConditionDistribution[];
}

export interface BrowseApiAspectDistribution {
  localizedAspectName: string;
  aspectValueDistributions?: {
    localizedAspectValue: string;
    matchCount: number;
    refinementHref: string;
  }[];
}

export interface BrowseApiBuyingOptionDistribution {
  buyingOption: string;
  matchCount: number;
  refinementHref: string;
}

export interface BrowseApiCategoryDistribution {
  categoryId: string;
  categoryName: string;
  matchCount: number;
  refinementHref: string;
}

export interface BrowseApiConditionDistribution {
  condition: string;
  conditionId: string;
  matchCount: number;
  refinementHref: string;
}

/**
 * API Warning
 */
export interface BrowseApiWarning {
  errorId: number;
  domain: string;
  category: string;
  message: string;
  longMessage?: string;
  parameters?: { name: string; value: string }[];
}

// =============================================================================
// Marketplace IDs
// =============================================================================

/**
 * eBay Marketplace IDs for X-EBAY-C-MARKETPLACE-ID header
 * @see https://developer.ebay.com/api-docs/static/rest-request-components.html#marketpl
 */
export type EbayMarketplaceId =
  | 'EBAY_AT'  // Austria
  | 'EBAY_AU'  // Australia
  | 'EBAY_BE'  // Belgium
  | 'EBAY_CA'  // Canada
  | 'EBAY_CH'  // Switzerland
  | 'EBAY_DE'  // Germany
  | 'EBAY_ES'  // Spain
  | 'EBAY_FR'  // France
  | 'EBAY_GB'  // United Kingdom
  | 'EBAY_HK'  // Hong Kong
  | 'EBAY_IE'  // Ireland
  | 'EBAY_IN'  // India
  | 'EBAY_IT'  // Italy
  | 'EBAY_MY'  // Malaysia
  | 'EBAY_NL'  // Netherlands
  | 'EBAY_PH'  // Philippines
  | 'EBAY_PL'  // Poland
  | 'EBAY_SG'  // Singapore
  | 'EBAY_TH'  // Thailand
  | 'EBAY_TW'  // Taiwan
  | 'EBAY_US'  // United States
  | 'EBAY_VN'; // Vietnam

// =============================================================================
// Search Parameters
// =============================================================================

/**
 * Parameters for Browse API search
 */
export interface BrowseApiSearchParams {
  /** Search query string */
  q: string;
  /** eBay category IDs to filter */
  category_ids?: string;
  /** Filter expression (e.g., "conditionIds:{1000|1500}") */
  filter?: string;
  /** Maximum items to return (max 200) */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Sort order */
  sort?: BrowseApiSortOrder;
  /** Field groups to include in response */
  fieldgroups?: string;
  /** Aspect filter */
  aspect_filter?: string;
  /** Charity IDs */
  charity_ids?: string;
  /** Compatibility filter */
  compatibility_filter?: string;
  /** EPID filter */
  epid?: string;
  /** GTIN filter */
  gtin?: string;
}

/**
 * Sort order options
 */
export type BrowseApiSortOrder =
  | 'price'
  | '-price'
  | 'distance'
  | 'newlyListed'
  | '-newlyListed'
  | 'endingSoonest';

// =============================================================================
// Condition ID Mapping
// =============================================================================

/**
 * eBay condition IDs
 */
export const EBAY_CONDITION_IDS = {
  NEW: '1000',
  NEW_OTHER: '1500',
  NEW_WITH_DEFECTS: '1750',
  CERTIFIED_REFURBISHED: '2000',
  EXCELLENT_REFURBISHED: '2010',
  VERY_GOOD_REFURBISHED: '2020',
  GOOD_REFURBISHED: '2030',
  SELLER_REFURBISHED: '2500',
  LIKE_NEW: '2750',
  USED_EXCELLENT: '3000',
  USED_VERY_GOOD: '4000',
  USED_GOOD: '5000',
  USED_ACCEPTABLE: '6000',
  FOR_PARTS: '7000',
} as const;

/**
 * Condition ID to display name mapping
 */
export const EBAY_CONDITION_NAMES: Record<string, string> = {
  '1000': 'New',
  '1500': 'New (Other)',
  '1750': 'New with defects',
  '2000': 'Certified Refurbished',
  '2010': 'Excellent - Refurbished',
  '2020': 'Very Good - Refurbished',
  '2030': 'Good - Refurbished',
  '2500': 'Seller Refurbished',
  '2750': 'Like New',
  '3000': 'Used - Excellent',
  '4000': 'Used - Very Good',
  '5000': 'Used - Good',
  '6000': 'Used - Acceptable',
  '7000': 'For parts or not working',
};
