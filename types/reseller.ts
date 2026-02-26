/**
 * Reseller Types and Interfaces
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Types for reseller catalog and price comparison (Trailblazer feature)
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Reseller partnership status
 */
export type ResellerStatus = 'standard' | 'vip' | 'partner' | 'suspended';

/**
 * Reseller business type
 */
export type ResellerType = 'local' | 'online' | 'chain';

// =============================================================================
// Reseller Types
// =============================================================================

/**
 * Reseller entity (from database)
 */
export interface Reseller {
  id: string;
  name: string;
  websiteUrl: string;
  logoUrl: string | null;
  resellerType: ResellerType;
  status: ResellerStatus;
  countriesServed: string[];
  searchUrlTemplate: string | null;
  affiliateTag: string | null;
  location: {
    latitude: number;
    longitude: number;
  } | null;
  addressLine1: string | null;
  addressLine2: string | null;
  addressCity: string | null;
  addressPostalCode: string | null;
  addressCountry: string | null;
  isActive: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Input for creating a new reseller
 */
export interface CreateResellerInput {
  name: string;
  websiteUrl: string;
  logoUrl?: string | null;
  resellerType: ResellerType;
  status?: ResellerStatus;
  countriesServed: string[];
  searchUrlTemplate?: string | null;
  affiliateTag?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  addressCity?: string | null;
  addressPostalCode?: string | null;
  addressCountry?: string | null;
  isActive?: boolean;
  priority?: number;
}

/**
 * Input for updating a reseller
 */
export interface UpdateResellerInput extends Partial<CreateResellerInput> {
  id: string;
}

// =============================================================================
// Reseller Price Types
// =============================================================================

/**
 * Cached price result from a reseller
 */
export interface ResellerPriceResult {
  id: string;
  resellerId: string;
  gearItemId: string;
  priceAmount: number;
  priceCurrency: string;
  productUrl: string | null;
  productName: string | null;
  inStock: boolean;
  fetchedAt: string;
  expiresAt: string;
}

/**
 * Reseller price with reseller details (for display)
 */
export interface ResellerPriceWithDetails extends ResellerPriceResult {
  reseller: Reseller;
  /** Distance in km from user (for local resellers) */
  distanceKm: number | null;
  /** Formatted distance string (e.g., "12 km") */
  distanceFormatted: string | null;
}

// =============================================================================
// Search Types
// =============================================================================

/**
 * Parameters for reseller price search
 */
export interface ResellerSearchParams {
  /** Gear item ID to search for */
  gearItemId: string;
  /** Search query (brand + product name) */
  query: string;
  /** User's country code */
  countryCode: string;
  /** User's location (for local reseller sorting) */
  userLocation?: {
    latitude: number;
    longitude: number;
  };
  /** Max results per type */
  limit?: number;
}

/**
 * Reseller search response
 */
export interface ResellerSearchResponse {
  /** Best local reseller prices (up to 2) */
  localPrices: ResellerPriceWithDetails[];
  /** Best online reseller price (up to 1) */
  onlinePrices: ResellerPriceWithDetails[];
  /** All prices combined, sorted by price */
  allPrices: ResellerPriceWithDetails[];
  /** Whether any results were from cache */
  fromCache: boolean;
}

// =============================================================================
// Admin Types
// =============================================================================

/**
 * Reseller list response for admin
 */
export interface ResellerListResponse {
  resellers: Reseller[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Filters for reseller list
 */
export interface ResellerListFilters {
  search?: string;
  type?: ResellerType;
  status?: ResellerStatus;
  country?: string;
  isActive?: boolean;
}

/**
 * Sort options for reseller list
 */
export type ResellerSortField = 'name' | 'priority' | 'status' | 'createdAt' | 'updatedAt';
export type ResellerSortOrder = 'asc' | 'desc';

// =============================================================================
// UI Labels
// =============================================================================

/**
 * Labels for reseller status
 */
export const RESELLER_STATUS_LABELS = {
  standard: 'Standard',
  vip: 'VIP',
  partner: 'Partner',
  suspended: 'Suspended',
} as const satisfies Record<ResellerStatus, string>;

/**
 * Colors for reseller status badges
 */
export const RESELLER_STATUS_COLORS = {
  standard: 'gray',
  vip: 'amber',
  partner: 'green',
  suspended: 'red',
} as const satisfies Record<ResellerStatus, string>;

/**
 * Labels for reseller type
 */
export const RESELLER_TYPE_LABELS = {
  local: 'Local Shop',
  online: 'Online Store',
  chain: 'Retail Chain',
} as const satisfies Record<ResellerType, string>;
