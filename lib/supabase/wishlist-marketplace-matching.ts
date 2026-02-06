/**
 * Wishlist-Marketplace Matching Functions
 *
 * Purpose: Find marketplace listings that match wishlist items
 * Uses fuzzy name/brand matching to connect wishlist items with available marketplace offers
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { MarketplaceListing } from '@/types/marketplace';

type SupabaseClientType = SupabaseClient<Database>;
type MarketplaceView = Database['public']['Views']['v_marketplace_listings']['Row'];

// ============================================================================
// Type Definitions
// ============================================================================

export interface WishlistMarketplaceMatch {
  listing: MarketplaceListing;
  similarityScore: number;
}

// ============================================================================
// Transform Functions
// ============================================================================

/**
 * Transform database row to MarketplaceListing type
 */
function transformListing(row: MarketplaceView): MarketplaceListing {
  return {
    id: row.id ?? '',
    name: row.name ?? '',
    brand: row.brand ?? null,
    primaryImageUrl: row.primary_image_url ?? null,
    condition: row.condition ?? '',
    pricePaid: row.price_paid ?? null,
    currency: row.currency ?? null,
    isForSale: row.is_for_sale ?? false,
    canBeTraded: row.can_be_traded ?? false,
    canBeBorrowed: row.can_be_borrowed ?? false,
    listedAt: row.listed_at ?? '',
    sellerId: row.seller_id ?? '',
    sellerName: row.seller_name ?? '',
    sellerAvatar: row.seller_avatar ?? null,
  };
}

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Simple similarity score based on exact and partial matches
 * Returns a score between 0 and 1 (higher is better match)
 */
function calculateSimilarity(
  wishlistName: string,
  wishlistBrand: string | null,
  listingName: string,
  listingBrand: string | null
): number {
  let score = 0;

  const normalizeString = (str: string | null): string => {
    return (str || '').toLowerCase().trim();
  };

  const wishlistNameNorm = normalizeString(wishlistName);
  const wishlistBrandNorm = normalizeString(wishlistBrand);
  const listingNameNorm = normalizeString(listingName);
  const listingBrandNorm = normalizeString(listingBrand);

  // Exact name match = 0.5 score
  if (wishlistNameNorm === listingNameNorm) {
    score += 0.5;
  } else {
    // Partial name match (one contains the other) = 0.3 score
    if (
      wishlistNameNorm.includes(listingNameNorm) ||
      listingNameNorm.includes(wishlistNameNorm)
    ) {
      score += 0.3;
    }
  }

  // Exact brand match = 0.5 score
  if (wishlistBrandNorm && listingBrandNorm) {
    if (wishlistBrandNorm === listingBrandNorm) {
      score += 0.5;
    }
  }

  return score;
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * Find marketplace listings that match a wishlist item
 *
 * Uses fuzzy matching on name and brand to find similar items.
 * Returns matches sorted by similarity score (best matches first).
 *
 * @param supabase - Supabase client
 * @param wishlistItemName - Name of the wishlist item
 * @param wishlistItemBrand - Brand of the wishlist item (optional)
 * @param currentUserId - ID of current user (to exclude their own listings)
 * @param minScore - Minimum similarity score (default: 0.3)
 * @returns Promise<WishlistMarketplaceMatch[]> - Matching marketplace listings
 *
 * @example
 * const matches = await findMarketplaceMatches(
 *   supabase,
 *   'X-Dome 2',
 *   'MSR',
 *   currentUserId
 * );
 */
export async function findMarketplaceMatches(
  supabase: SupabaseClientType,
  wishlistItemName: string,
  wishlistItemBrand: string | null,
  currentUserId: string,
  minScore: number = 0.3
): Promise<WishlistMarketplaceMatch[]> {
  // Query marketplace listings
  // First, get all listings (we'll filter client-side for fuzzy matching)
  const { data, error } = await supabase
    .from('v_marketplace_listings')
    .select('*')
    .neq('seller_id', currentUserId) // Exclude user's own items
    .order('listed_at', { ascending: false })
    .limit(100); // Reasonable limit for performance

  if (error) {
    console.error('Failed to fetch marketplace listings:', error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  // Calculate similarity scores and filter
  const matches: WishlistMarketplaceMatch[] = data
    .map((row) => {
      const listing = transformListing(row);
      const similarityScore = calculateSimilarity(
        wishlistItemName,
        wishlistItemBrand,
        listing.name,
        listing.brand
      );

      return {
        listing,
        similarityScore,
      };
    })
    .filter((match) => match.similarityScore >= minScore)
    .sort((a, b) => b.similarityScore - a.similarityScore); // Best matches first

  return matches;
}

/**
 * Find marketplace matches for multiple wishlist items in batch
 *
 * More efficient than calling findMarketplaceMatches multiple times.
 *
 * @param supabase - Supabase client
 * @param wishlistItems - Array of wishlist items with id, name, brand
 * @param currentUserId - ID of current user
 * @returns Promise<Map<string, WishlistMarketplaceMatch[]>> - Matches grouped by wishlist item ID
 */
export async function findMarketplaceMatchesBatch(
  supabase: SupabaseClientType,
  wishlistItems: Array<{ id: string; name: string; brand: string | null }>,
  currentUserId: string
): Promise<Map<string, WishlistMarketplaceMatch[]>> {
  // Fetch all marketplace listings once
  const { data, error } = await supabase
    .from('v_marketplace_listings')
    .select('*')
    .neq('seller_id', currentUserId)
    .order('listed_at', { ascending: false })
    .limit(200);

  if (error || !data) {
    console.error('Failed to fetch marketplace listings:', error);
    return new Map();
  }

  const listings = data.map(transformListing);
  const results = new Map<string, WishlistMarketplaceMatch[]>();

  // For each wishlist item, find matching listings
  for (const item of wishlistItems) {
    const matches = listings
      .map((listing) => {
        const similarityScore = calculateSimilarity(
          item.name,
          item.brand,
          listing.name,
          listing.brand
        );

        return {
          listing,
          similarityScore,
        };
      })
      .filter((match) => match.similarityScore >= 0.3)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    results.set(item.id, matches);
  }

  return results;
}
