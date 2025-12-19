/**
 * Get Community Offers Tool
 * Feature 050: AI Assistant - Phase 3
 *
 * Enhanced community search for gear available from other users.
 * Leverages existing find_community_availability RPC function.
 */

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Tool Definition Schema
// =============================================================================

export const getCommunityOffersParametersSchema = z.object({
  query: z.string().min(1).max(200).describe('Search query for gear items'),
  offerType: z
    .enum(['sale', 'borrow', 'trade', 'all'])
    .default('all')
    .describe('Type of offer to search for'),
  filters: z
    .object({
      maxPrice: z.number().min(0).optional().describe('Maximum price in USD'),
      maxWeight: z.number().min(0).optional().describe('Maximum weight in grams'),
    })
    .optional()
    .describe('Optional filters to narrow search results'),
  limit: z
    .number()
    .min(1)
    .max(10)
    .default(5)
    .describe('Maximum number of results to return'),
});

export type GetCommunityOffersParameters = z.infer<
  typeof getCommunityOffersParametersSchema
>;

// =============================================================================
// Tool Definition
// =============================================================================

export const getCommunityOffersTool = {
  description:
    'Find gear from community members that is available for sale, borrowing, or trade',
  parameters: getCommunityOffersParametersSchema,
};

// =============================================================================
// Result Types
// =============================================================================

export interface CommunityOffer {
  itemId: string;
  ownerId: string;
  ownerDisplayName: string;
  ownerAvatarUrl: string | null;
  itemName: string;
  itemBrand: string | null;
  imageUrl: string | null;
  weightGrams: number | null;
  price: number | null;
  currency: string | null;
  forSale: boolean;
  lendable: boolean;
  tradeable: boolean;
  similarityScore: number;
}

export interface GetCommunityOffersResponse {
  success: boolean;
  offers: CommunityOffer[];
  totalCount: number;
  query: string;
  offerType: string;
  appliedFilters: Record<string, unknown>;
  error?: string;
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute community offers search
 *
 * @param params - Search parameters including query, offerType, filters, limit
 * @returns GetCommunityOffersResponse with matching community offers
 */
export async function executeGetCommunityOffers(
  params: GetCommunityOffersParameters
): Promise<GetCommunityOffersResponse> {
  const { query, offerType, filters, limit } = params;

  try {
    const supabase = await createClient();

    // Get current user (needed for RPC function)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        offers: [],
        totalCount: 0,
        query,
        offerType,
        appliedFilters: filters || {},
        error: 'User must be authenticated to search community offers',
      };
    }

    // Build query for community items
    // Note: gear_items uses is_for_sale, can_be_borrowed, can_be_traded columns
    let dbQuery = supabase
      .from('gear_items')
      .select(
        `
        id,
        name,
        brand,
        weight_grams,
        price_paid,
        currency,
        primary_image_url,
        is_for_sale,
        can_be_borrowed,
        can_be_traded,
        user_id,
        profiles!gear_items_user_id_fkey (
          id,
          display_name,
          avatar_url
        )
      `
      )
      .neq('user_id', user.id) // Exclude current user's items
      .or(`name.ilike.%${query}%,brand.ilike.%${query}%`);

    // Apply offer type filter
    switch (offerType) {
      case 'sale':
        dbQuery = dbQuery.eq('is_for_sale', true);
        break;
      case 'borrow':
        dbQuery = dbQuery.eq('can_be_borrowed', true);
        break;
      case 'trade':
        dbQuery = dbQuery.eq('can_be_traded', true);
        break;
      case 'all':
      default:
        // At least one availability flag must be true
        dbQuery = dbQuery.or('is_for_sale.eq.true,can_be_borrowed.eq.true,can_be_traded.eq.true');
        break;
    }

    // Apply additional filters
    if (filters?.maxPrice !== undefined) {
      dbQuery = dbQuery.lte('price_paid', filters.maxPrice);
    }
    if (filters?.maxWeight !== undefined) {
      dbQuery = dbQuery.lte('weight_grams', filters.maxWeight);
    }

    // Apply limit and order
    dbQuery = dbQuery.order('updated_at', { ascending: false }).limit(limit);

    const { data: items, error: queryError } = await dbQuery;

    if (queryError) {
      console.error('[getCommunityOffers] Database error:', queryError);
      return {
        success: false,
        offers: [],
        totalCount: 0,
        query,
        offerType,
        appliedFilters: filters || {},
        error: `Database query failed: ${queryError.message}`,
      };
    }

    // Transform results
    const offers: CommunityOffer[] = (items || []).map((item) => {
      const profile = (item as Record<string, unknown>).profiles as {
        id: string;
        display_name: string | null;
        avatar_url: string | null;
      } | null;

      return {
        itemId: item.id,
        ownerId: item.user_id,
        ownerDisplayName: profile?.display_name || 'Unknown User',
        ownerAvatarUrl: profile?.avatar_url || null,
        itemName: item.name,
        itemBrand: item.brand,
        imageUrl: item.primary_image_url,
        weightGrams: item.weight_grams,
        price: item.price_paid,
        currency: item.currency,
        forSale: item.is_for_sale || false,
        lendable: item.can_be_borrowed || false,
        tradeable: item.can_be_traded || false,
        similarityScore: 1.0, // Direct match (could be enhanced with fuzzy scoring)
      };
    });

    return {
      success: true,
      offers,
      totalCount: offers.length,
      query,
      offerType,
      appliedFilters: filters || {},
    };
  } catch (error) {
    console.error('[getCommunityOffers] Unexpected error:', error);
    return {
      success: false,
      offers: [],
      totalCount: 0,
      query,
      offerType,
      appliedFilters: filters || {},
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
