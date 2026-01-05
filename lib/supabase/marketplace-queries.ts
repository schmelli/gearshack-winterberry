/**
 * Supabase Query Functions for Community Marketplace
 *
 * Feature: 056-community-hub-enhancements
 *
 * Marketplace database operations using Supabase client.
 * Uses v_marketplace_listings view for efficient querying.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type {
  MarketplaceListing,
  MarketplaceResponse,
  MarketplaceQueryOptions,
  ListingTypeFilter,
} from '@/types/marketplace';
import { MARKETPLACE_CONSTANTS } from '@/types/marketplace';

type SupabaseClientType = SupabaseClient<Database>;

// ============================================================================
// Type Mapping
// ============================================================================

/**
 * Map listing type filter to database column
 */
const typeToColumn: Record<Exclude<ListingTypeFilter, 'all'>, string> = {
  for_sale: 'is_for_sale',
  for_trade: 'can_be_traded',
  for_borrow: 'can_be_borrowed',
};

/**
 * Map sort field to database column
 */
const sortFieldToColumn: Record<string, string> = {
  date: 'listed_at',
  price: 'price_paid',
  name: 'name',
};

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to MarketplaceListing type
 * Handles snake_case to camelCase conversion
 */
function transformListing(row: Record<string, unknown>): MarketplaceListing {
  return {
    id: row.id as string,
    name: row.name as string,
    brand: row.brand as string | null,
    primaryImageUrl: row.primary_image_url as string | null,
    condition: row.condition as string,
    pricePaid: row.price_paid as number | null,
    currency: row.currency as string | null,
    isForSale: row.is_for_sale as boolean,
    canBeTraded: row.can_be_traded as boolean,
    canBeBorrowed: row.can_be_borrowed as boolean,
    listedAt: row.listed_at as string,
    sellerId: row.seller_id as string,
    sellerName: row.seller_name as string,
    sellerAvatar: row.seller_avatar as string | null,
  };
}

// ============================================================================
// Marketplace Queries
// ============================================================================

/**
 * Fetch marketplace listings with filtering, sorting, and pagination
 * Uses cursor-based pagination for efficient infinite scroll
 */
export async function fetchMarketplaceListings(
  supabase: SupabaseClientType,
  options: MarketplaceQueryOptions = {}
): Promise<MarketplaceResponse> {
  const {
    type = 'all',
    sortBy = 'date',
    sortOrder = 'desc',
    search,
    cursor,
    limit = MARKETPLACE_CONSTANTS.ITEMS_PER_PAGE,
    excludeUserId,
  } = options;

  // Build query using the marketplace view
  let query = supabase
    .from('v_marketplace_listings')
    .select('*')
    .order(sortFieldToColumn[sortBy] || 'listed_at', {
      ascending: sortOrder === 'asc',
    })
    .limit(limit + 1); // +1 to detect hasMore

  // Apply type filter if not 'all'
  if (type !== 'all') {
    const column = typeToColumn[type];
    if (column) {
      query = query.eq(column, true);
    }
  }

  // Exclude current user's items
  if (excludeUserId) {
    query = query.neq('seller_id', excludeUserId);
  }

  // Apply search filter
  if (search && search.trim()) {
    const searchTerm = search.trim();
    query = query.or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%`);
  }

  // Apply cursor for pagination (timestamp-based)
  if (cursor) {
    // For descending order, get items older than cursor
    // For ascending order, get items newer than cursor
    if (sortOrder === 'desc') {
      query = query.lt('listed_at', cursor);
    } else {
      query = query.gt('listed_at', cursor);
    }
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch marketplace listings: ${error.message}`);
  }

  const rawListings = data ?? [];
  const hasMore = rawListings.length > limit;

  // Remove the extra item used for hasMore detection
  if (hasMore) {
    rawListings.pop();
  }

  const listings = rawListings.map((row) =>
    transformListing(row as unknown as Record<string, unknown>)
  );

  // Compute next cursor from last item
  const nextCursor =
    listings.length > 0 ? listings[listings.length - 1].listedAt : null;

  return {
    listings,
    hasMore,
    nextCursor,
  };
}

/**
 * Get a single marketplace listing by ID
 */
export async function getMarketplaceListing(
  supabase: SupabaseClientType,
  id: string
): Promise<MarketplaceListing | null> {
  const { data, error } = await supabase
    .from('v_marketplace_listings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned - listing not found or filtered out
      return null;
    }
    throw new Error(`Failed to fetch listing: ${error.message}`);
  }

  return transformListing(data as unknown as Record<string, unknown>);
}
