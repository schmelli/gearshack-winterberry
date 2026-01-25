/**
 * Community Search Utilities
 * Feature 050: AI Assistant - T077 (adapted)
 *
 * Searches community availability using existing find_community_availability RPC.
 * Leverages Feature 049 peer-to-peer marketplace (gear_items with marketplace flags).
 */

import { createClient } from '@/lib/supabase/server';

// =====================================================
// Types
// =====================================================

export interface CommunityMatch {
  matchedItemId: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  itemName: string;
  itemBrand: string | null;
  forSale: boolean;
  lendable: boolean;
  tradeable: boolean;
  similarityScore: number;
  primaryImageUrl: string | null;
}

export interface CommunitySearchResult {
  matches: CommunityMatch[];
  totalCount: number;
  searchQuery: string;
}

// =====================================================
// Security Utilities
// =====================================================

/**
 * Sanitize search query to prevent SQL injection and PostgREST filter injection
 * Escapes special characters used in PostgreSQL pattern matching AND PostgREST .or() syntax
 *
 * @param query - Raw search query from user
 * @returns Sanitized query safe for ILIKE operations and .or() filter strings
 */
function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }

  // Escape PostgreSQL LIKE special characters: % _ \
  // Also escape comma which is PostgREST .or() delimiter (prevents filter injection)
  // Also escape parentheses which are PostgREST grouping operators
  // Also limit length to prevent DoS
  return query
    .slice(0, 100) // Max 100 chars
    .replace(/\\/g, '\\\\') // Escape backslash first
    .replace(/%/g, '\\%')   // Escape percent
    .replace(/_/g, '\\_')   // Escape underscore
    .replace(/,/g, '')      // Remove commas (PostgREST .or() delimiter)
    .replace(/\(/g, '')     // Remove opening parens (PostgREST grouping)
    .replace(/\)/g, '')     // Remove closing parens (PostgREST grouping)
    .replace(/\./g, ' ')    // Replace dots with space (prevents .eq., .neq. injection)
    .trim();
}

// =====================================================
// Search Functions
// =====================================================

/**
 * T077: Search community offers by gear name/brand
 *
 * Searches user's wishlist items for matches, then finds community availability.
 * Alternative approach: direct fuzzy search on gear_items with marketplace flags.
 *
 * @param userId - User UUID
 * @param searchQuery - Search term (gear name, brand, model)
 * @param filters - Optional filters (price, weight, category)
 * @returns Community matches
 */
export async function searchCommunityOffers(
  userId: string,
  searchQuery: string,
  filters?: {
    maxPrice?: number;
    maxWeight?: number;
    categoryId?: string;
    forSale?: boolean;
    lendable?: boolean;
    tradeable?: boolean;
  }
): Promise<CommunitySearchResult> {
  const supabase = await createClient();

  // Sanitize search query to prevent SQL injection
  const sanitizedQuery = sanitizeSearchQuery(searchQuery);

  // Build query for gear_items with marketplace flags
  let query = supabase
    .from('gear_items')
    .select('id, name, brand, price_paid, weight_grams, category_id, primary_image_url, user_id, is_for_sale, can_be_borrowed, can_be_traded')
    .eq('status', 'own')
    .neq('user_id', userId); // Exclude own items

  // Filter by marketplace flags
  if (filters?.forSale !== undefined || filters?.lendable !== undefined || filters?.tradeable !== undefined) {
    // At least one marketplace flag must be true
    const conditions = [];
    if (filters.forSale) conditions.push('is_for_sale.eq.true');
    if (filters.lendable) conditions.push('can_be_borrowed.eq.true');
    if (filters.tradeable) conditions.push('can_be_traded.eq.true');

    if (conditions.length > 0) {
      query = query.or(conditions.join(','));
    }
  } else {
    // Default: at least one flag must be true
    query = query.or('is_for_sale.eq.true,can_be_borrowed.eq.true,can_be_traded.eq.true');
  }

  // Apply filters
  if (filters?.maxPrice) {
    query = query.lte('price_paid', filters.maxPrice);
  }
  if (filters?.maxWeight) {
    query = query.lte('weight_grams', filters.maxWeight);
  }
  if (filters?.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  // Text search using ilike (case-insensitive) with sanitized input
  if (sanitizedQuery) {
    query = query.or(`name.ilike.%${sanitizedQuery}%,brand.ilike.%${sanitizedQuery}%`);
  }

  query = query.limit(20);

  const { data: items, error } = await query;

  if (error) {
    console.error('Community search error:', error);
    return {
      matches: [],
      totalCount: 0,
      searchQuery,
    };
  }

  if (!items || items.length === 0) {
    return {
      matches: [],
      totalCount: 0,
      searchQuery,
    };
  }

  // Fetch owner profiles
  const ownerIds = [...new Set(items.map((item) => item.user_id))];
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ownerIds);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

  // Transform to CommunityMatch format
  const matches: CommunityMatch[] = items.map((item) => {
    const owner = profileMap.get(item.user_id);
    return {
      matchedItemId: item.id,
      ownerId: item.user_id,
      ownerDisplayName: owner?.display_name || 'Unknown User',
      ownerAvatarUrl: owner?.avatar_url || null,
      itemName: item.name,
      itemBrand: item.brand,
      forSale: item.is_for_sale || false,
      lendable: item.can_be_borrowed || false,
      tradeable: item.can_be_traded || false,
      similarityScore: 1.0, // Direct search, not fuzzy match
      primaryImageUrl: item.primary_image_url,
    };
  });

  return {
    matches,
    totalCount: matches.length,
    searchQuery: sanitizedQuery, // Return sanitized query
  };
}

/**
 * Search community offers with fuzzy matching for wishlist items
 *
 * Uses existing find_community_availability RPC for trigram similarity matching.
 *
 * @param userId - User UUID
 * @param wishlistItemId - Wishlist item to match
 * @returns Community matches with similarity scores
 */
export async function searchCommunityForWishlistItem(
  userId: string,
  wishlistItemId: string
): Promise<CommunityMatch[]> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc('find_community_availability', {
    p_user_id: userId,
    p_wishlist_item_id: wishlistItemId,
  });

  if (error) {
    console.error('Find community availability error:', error);
    return [];
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return [];
  }

  // Define the expected shape of the RPC response
  interface CommunityAvailabilityRow {
    matched_item_id: string;
    owner_id: string;
    owner_display_name: string;
    owner_avatar_url: string | null;
    item_name: string;
    item_brand: string | null;
    is_for_sale: boolean;
    can_be_borrowed: boolean;
    can_be_traded: boolean;
    similarity_score: string | number;
    primary_image_url: string | null;
  }

  // Transform database response to CommunityMatch
  return (data as unknown as CommunityAvailabilityRow[]).map((match) => ({
    matchedItemId: match.matched_item_id,
    ownerId: match.owner_id,
    ownerDisplayName: match.owner_display_name,
    ownerAvatarUrl: match.owner_avatar_url,
    itemName: match.item_name,
    itemBrand: match.item_brand,
    forSale: match.is_for_sale,
    lendable: match.can_be_borrowed,
    tradeable: match.can_be_traded,
    similarityScore: parseFloat(String(match.similarity_score)),
    primaryImageUrl: match.primary_image_url,
  }));
}

/**
 * Quick search for AI assistant - finds top community matches
 *
 * @param userId - User UUID
 * @param criteria - Search criteria (e.g., "ultralight tent under 1kg")
 * @returns Top 5 community matches
 */
export async function quickCommunitySearch(
  userId: string,
  criteria: {
    name?: string;
    maxWeight?: number;
    maxPrice?: number;
    category?: string;
  }
): Promise<CommunityMatch[]> {
  const searchQuery = criteria.name || '';
  const result = await searchCommunityOffers(userId, searchQuery, {
    maxWeight: criteria.maxWeight,
    maxPrice: criteria.maxPrice,
  });

  return result.matches.slice(0, 5);
}
