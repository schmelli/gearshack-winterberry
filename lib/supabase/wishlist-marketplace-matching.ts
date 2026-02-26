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
    condition: row.condition ?? null,
    pricePaid: row.price_paid ?? null,
    currency: row.currency ?? null,
    isForSale: row.is_for_sale ?? false,
    canBeTraded: row.can_be_traded ?? false,
    canBeBorrowed: row.can_be_borrowed ?? false,
    listedAt: row.listed_at ?? null,
    sellerId: row.seller_id ?? '',
    sellerName: row.seller_name ?? '',
    sellerAvatar: row.seller_avatar ?? null,
  };
}

// ============================================================================
// Matching Logic
// ============================================================================

/**
 * Default minimum similarity score threshold for matches
 */
const DEFAULT_MIN_SCORE = 0.5;

/**
 * Token-based similarity score with stricter matching
 * Returns a score between 0 and 1 (higher is better match)
 *
 * Algorithm:
 * 1. Exact name match = 0.6 score
 * 2. Token overlap match (>= 60% shared words) = 0.4 score
 * 3. Brand match bonus = +0.4 score (but brand alone is not enough)
 *
 * This prevents false positives like "Xmid Pro 2" matching "Xmid 1"
 * while still allowing fuzzy matches for typos and variations.
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

  const tokenize = (str: string): Set<string> => {
    // Split by spaces and filter out empty strings
    return new Set(
      str.split(/\s+/)
        .filter(token => token.length > 0)
        .map(token => token.replace(/[^a-z0-9]/g, '')) // Remove special chars
        .filter(token => token.length > 0)
    );
  };

  const wishlistNameNorm = normalizeString(wishlistName);
  const wishlistBrandNorm = normalizeString(wishlistBrand);
  const listingNameNorm = normalizeString(listingName);
  const listingBrandNorm = normalizeString(listingBrand);

  // Exact name match = 0.6 score (after removing special chars for comparison)
  if (wishlistNameNorm.replace(/[^a-z0-9\s]/g, '') === listingNameNorm.replace(/[^a-z0-9\s]/g, '')) {
    score += 0.6;
  } else {
    // Token-based matching
    const wishlistTokens = tokenize(wishlistNameNorm);
    const listingTokens = tokenize(listingNameNorm);

    if (wishlistTokens.size > 0 && listingTokens.size > 0) {
      // Calculate intersection
      const intersection = new Set(
        [...wishlistTokens].filter(token => listingTokens.has(token))
      );

      // Calculate overlap percentage (based on smaller set)
      const overlapPercentage = intersection.size / Math.min(wishlistTokens.size, listingTokens.size);

      // Require at least 60% overlap to consider it a match
      if (overlapPercentage >= 0.6) {
        // Score based on overlap quality
        score += 0.4 * overlapPercentage;
      }
    }
  }

  // Brand match bonus = 0.4 (but only meaningful if name also matches)
  if (wishlistBrandNorm && listingBrandNorm) {
    if (wishlistBrandNorm === listingBrandNorm) {
      score += 0.4;
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
 * @param minScore - Minimum similarity score (default: 0.5)
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
  minScore: number = DEFAULT_MIN_SCORE
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
 * @param minScore - Minimum similarity score (default: 0.5)
 * @returns Promise<Map<string, WishlistMarketplaceMatch[]>> - Matches grouped by wishlist item ID
 */
export async function findMarketplaceMatchesBatch(
  supabase: SupabaseClientType,
  wishlistItems: Array<{ id: string; name: string; brand: string | null }>,
  currentUserId: string,
  minScore: number = DEFAULT_MIN_SCORE
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
      .filter((match) => match.similarityScore >= minScore)
      .sort((a, b) => b.similarityScore - a.similarityScore);

    results.set(item.id, matches);
  }

  return results;
}
