/**
 * Community Matching Query Functions
 *
 * Feature: 049-wishlist-view
 * Contract: specs/049-wishlist-view/contracts/community-matching.md
 *
 * Supabase RPC functions for finding community availability of wishlist items.
 * Uses PostgreSQL fuzzy matching (pg_trgm) to match similar items.
 */

import { createClient } from '@/lib/supabase/client';
import type { CommunityAvailabilityMatch } from '@/types/wishlist';
import { communityAvailabilityMatchSchema } from '@/lib/validations/wishlist-schema';

// =============================================================================
// RPC Response Type
// =============================================================================

/**
 * Type returned by find_community_availability RPC function
 * Matches the PostgreSQL function signature from migration
 */
interface CommunityAvailabilityRPCResult {
  matched_item_id: string;
  owner_id: string;
  owner_display_name: string;
  owner_avatar_url: string | null;
  item_name: string;
  item_brand: string | null;
  is_for_sale: boolean;
  can_be_borrowed: boolean;
  can_be_traded: boolean;
  similarity_score: number;
  primary_image_url: string | null;
}

// =============================================================================
// Transformer: RPC Result -> CommunityAvailabilityMatch
// =============================================================================

/**
 * Transforms RPC result to CommunityAvailabilityMatch type
 * Converts snake_case to camelCase and validates with Zod
 */
function transformCommunityMatch(result: CommunityAvailabilityRPCResult): CommunityAvailabilityMatch {
  const transformed = {
    matchedItemId: result.matched_item_id,
    ownerId: result.owner_id,
    ownerDisplayName: result.owner_display_name,
    ownerAvatarUrl: result.owner_avatar_url,
    itemName: result.item_name,
    itemBrand: result.item_brand,
    forSale: result.is_for_sale,
    lendable: result.can_be_borrowed,
    tradeable: result.can_be_traded,
    similarityScore: result.similarity_score,
    primaryImageUrl: result.primary_image_url,
  };

  // Validate with Zod schema
  return communityAvailabilityMatchSchema.parse(transformed);
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Fetch community availability matches for one or more wishlist items
 *
 * Calls find_community_availability RPC function for each wishlist item.
 * Returns matches grouped by wishlist item ID.
 *
 * @param wishlistItemIds - Array of wishlist item UUIDs
 * @returns Promise<Map<string, CommunityAvailabilityMatch[]>> - Matches grouped by item ID
 * @throws Error if not authenticated or RPC call fails
 *
 * @example
 * const availability = await fetchCommunityAvailability(['item-1', 'item-2']);
 * const matchesForItem1 = availability.get('item-1') ?? [];
 */
export async function fetchCommunityAvailability(
  wishlistItemIds: string[]
): Promise<Map<string, CommunityAvailabilityMatch[]>> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to fetch community availability');
  }

  const results = new Map<string, CommunityAvailabilityMatch[]>();

  // Fetch availability for each wishlist item
  // Note: We loop instead of batch RPC because PostgreSQL function is designed for single item
  for (const itemId of wishlistItemIds) {
    try {
      const { data, error } = await supabase.rpc('find_community_availability', {
        p_user_id: user.id,
        p_wishlist_item_id: itemId,
      });

      if (error) {
        console.error(`Failed to fetch availability for ${itemId}:`, error);
        // Graceful degradation: store empty array for this item
        results.set(itemId, []);
        continue;
      }

      // Transform and validate results
      const matches = (data as unknown as CommunityAvailabilityRPCResult[] | null)?.map(transformCommunityMatch) ?? [];
      results.set(itemId, matches);
    } catch (err) {
      // Graceful degradation: store empty array on validation error
      console.error(`Error processing availability for ${itemId}:`, err);
      results.set(itemId, []);
    }
  }

  return results;
}

/**
 * Refresh availability for a single wishlist item (force bypass cache)
 *
 * Use this when user manually refreshes or when real-time update is needed.
 *
 * @param wishlistItemId - Wishlist item UUID
 * @returns Promise<CommunityAvailabilityMatch[]> - Fresh matches from database
 * @throws Error if not authenticated or RPC call fails
 *
 * @example
 * const freshMatches = await refreshCommunityAvailability('item-id');
 */
export async function refreshCommunityAvailability(
  wishlistItemId: string
): Promise<CommunityAvailabilityMatch[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to refresh community availability');
  }

  // Call RPC function
  const { data, error } = await supabase.rpc('find_community_availability', {
    p_user_id: user.id,
    p_wishlist_item_id: wishlistItemId,
  });

  if (error) {
    throw new Error(`Failed to refresh availability: ${error.message}`);
  }

  // Transform and validate results
  return (data as unknown as CommunityAvailabilityRPCResult[] | null)?.map(transformCommunityMatch) ?? [];
}

/**
 * Get availability for single item (used by detail modal)
 *
 * Convenience function that wraps fetchCommunityAvailability for single item.
 *
 * @param wishlistItemId - Wishlist item UUID
 * @returns Promise<CommunityAvailabilityMatch[]> - Matches for this item
 * @throws Error if not authenticated or RPC call fails
 *
 * @example
 * const matches = await fetchAvailabilityForItem('item-id');
 * if (matches.length > 0) {
 *   console.log(`Found ${matches.length} community matches`);
 * }
 */
export async function fetchAvailabilityForItem(
  wishlistItemId: string
): Promise<CommunityAvailabilityMatch[]> {
  const availabilityMap = await fetchCommunityAvailability([wishlistItemId]);
  return availabilityMap.get(wishlistItemId) ?? [];
}
