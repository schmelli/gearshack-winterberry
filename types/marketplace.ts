/**
 * Marketplace Types and Interfaces
 *
 * Feature: 056-community-hub-enhancements
 * Constitution: Types MUST be defined in @/types directory
 *
 * Marketplace enables peer-to-peer gear exchange by allowing users to browse,
 * filter, and contact sellers of marketplace items.
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export type ListingType = 'for_sale' | 'for_trade' | 'for_borrow';
export type ListingTypeFilter = 'all' | ListingType;
export type MarketplaceSortField = 'date' | 'price' | 'name';
export type MarketplaceSortOrder = 'asc' | 'desc';

// =============================================================================
// UI Labels
// =============================================================================

export const LISTING_TYPE_LABELS: Record<ListingType, string> = {
  for_sale: 'For Sale',
  for_trade: 'For Trade',
  for_borrow: 'Available to Borrow',
};

export const LISTING_TYPE_FILTER_LABELS: Record<ListingTypeFilter, string> = {
  all: 'All Listings',
  for_sale: 'For Sale',
  for_trade: 'For Trade',
  for_borrow: 'For Borrow',
};

export const SORT_FIELD_LABELS: Record<MarketplaceSortField, string> = {
  date: 'Newest',
  price: 'Price',
  name: 'Name',
};

// =============================================================================
// Schemas
// =============================================================================

export const marketplaceListingSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  brand: z.string().nullable(),
  primaryImageUrl: z.string().url().nullable(),
  condition: z.string(),
  pricePaid: z.number().nullable(),
  currency: z.string().nullable(),
  isForSale: z.boolean(),
  canBeTraded: z.boolean(),
  canBeBorrowed: z.boolean(),
  listedAt: z.string().datetime(),
  sellerId: z.string().uuid(),
  sellerName: z.string(),
  sellerAvatar: z.string().url().nullable(),
});

export const marketplaceFiltersSchema = z.object({
  type: z.enum(['all', 'for_sale', 'for_trade', 'for_borrow']).default('all'),
  sortBy: z.enum(['date', 'price', 'name']).default('date'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
});

// =============================================================================
// Types
// =============================================================================

export type MarketplaceListing = z.infer<typeof marketplaceListingSchema>;
export type MarketplaceFilters = z.infer<typeof marketplaceFiltersSchema>;

export interface MarketplaceState {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
  loadingState: 'idle' | 'loading' | 'loading-more' | 'error';
  error: string | null;
  filters: MarketplaceFilters;
}

// =============================================================================
// Response Types
// =============================================================================

export interface MarketplaceResponse {
  listings: MarketplaceListing[];
  hasMore: boolean;
  nextCursor: string | null;
}

// =============================================================================
// Query Options
// =============================================================================

export interface MarketplaceQueryOptions {
  type?: ListingTypeFilter;
  sortBy?: MarketplaceSortField;
  sortOrder?: MarketplaceSortOrder;
  search?: string;
  cursor?: string;
  limit?: number;
  excludeUserId?: string;
}

// =============================================================================
// Constants
// =============================================================================

export const MARKETPLACE_CONSTANTS = {
  ITEMS_PER_PAGE: 12,
  MAX_SEARCH_LENGTH: 100,
} as const;
