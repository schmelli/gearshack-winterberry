/**
 * Merchant Wishlist Integration Queries
 *
 * Feature: 053-merchant-integration
 * Task: T027
 *
 * Functions for adding merchant loadout items to user wishlist with attribution.
 */

import { createBrowserClient } from '@/lib/supabase/client';
import type { LoadoutItemWithDetails } from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface AddFromLoadoutParams {
  /** The loadout item from merchant loadout */
  loadoutItem: LoadoutItemWithDetails;
  /** Merchant ID for attribution */
  merchantId: string;
  /** Loadout ID for attribution */
  loadoutId: string;
}

export interface AddFromLoadoutResult {
  success: boolean;
  gearItemId?: string;
  error?: string;
  isDuplicate?: boolean;
}

// =============================================================================
// Queries
// =============================================================================

/**
 * Add a single item from a merchant loadout to user's wishlist
 * Creates a gear_item with status='wishlist' and merchant attribution
 */
export async function addMerchantItemToWishlist(
  params: AddFromLoadoutParams
): Promise<AddFromLoadoutResult> {
  const supabase = createBrowserClient();
  const { loadoutItem, merchantId, loadoutId } = params;

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return { success: false, error: 'Not authenticated' };
  }

  // Check for duplicate by name + brand
  const { data: existing } = await supabase
    .from('gear_items')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .ilike('name', loadoutItem.catalogItem.name)
    .eq('brand', loadoutItem.catalogItem.brand)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: 'Item already in wishlist',
      isDuplicate: true,
    };
  }

  // Create wishlist item with merchant attribution
  const { data: newItem, error: insertError } = await supabase
    .from('gear_items')
    .insert({
      user_id: user.id,
      status: 'wishlist',
      name: loadoutItem.catalogItem.name,
      brand: loadoutItem.catalogItem.brand,
      price_paid: loadoutItem.catalogItem.price,
      weight_grams: loadoutItem.catalogItem.weightGrams,
      product_url: loadoutItem.catalogItem.productUrl,
      image_url: loadoutItem.catalogItem.imageUrl,
      catalog_product_id: loadoutItem.catalogItemId,
      source_merchant_id: merchantId,
      source_loadout_id: loadoutId,
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Failed to add to wishlist:', insertError);
    return { success: false, error: insertError.message };
  }

  return {
    success: true,
    gearItemId: newItem.id,
  };
}

/**
 * Add all items from a merchant loadout to user's wishlist
 * Skips items that already exist (by name + brand match)
 */
export async function addAllLoadoutItemsToWishlist(
  items: LoadoutItemWithDetails[],
  merchantId: string,
  loadoutId: string
): Promise<{
  added: number;
  skipped: number;
  errors: string[];
}> {
  const results = await Promise.all(
    items.map((item) =>
      addMerchantItemToWishlist({
        loadoutItem: item,
        merchantId,
        loadoutId,
      })
    )
  );

  return {
    added: results.filter((r) => r.success).length,
    skipped: results.filter((r) => r.isDuplicate).length,
    errors: results
      .filter((r) => !r.success && !r.isDuplicate && r.error)
      .map((r) => r.error!),
  };
}

/**
 * Get catalog item IDs that the current user has already wishlisted
 * Used to highlight which items are already in wishlist
 */
export async function getWishlistedCatalogItemIds(): Promise<Set<string>> {
  const supabase = createBrowserClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  const { data } = await supabase
    .from('gear_items')
    .select('catalog_product_id')
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .not('catalog_product_id', 'is', null);

  if (!data) return new Set();

  return new Set(
    data
      .map((item) => item.catalog_product_id)
      .filter((id): id is string => id !== null)
  );
}
