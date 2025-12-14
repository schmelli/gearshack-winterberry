'use server';

/**
 * Sharing Actions
 *
 * Feature: 048-shared-loadout-enhancement
 * Task: T024
 *
 * Server actions for shared loadout operations including
 * auto-import after signup.
 */

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import type { SharedLoadoutPayload } from '@/types/sharing';

/**
 * Input for adding a single item to wishlist
 */
interface AddToWishlistInput {
  item: {
    name: string;
    brand: string | null;
    primaryImageUrl: string | null;
    categoryId: string | null;
    weightGrams: number | null;
    description: string | null;
  };
  sourceShareToken: string;
}

/**
 * Result of adding an item to wishlist
 */
interface AddToWishlistResult {
  success: boolean;
  itemId?: string;
  error?: string;
}

/**
 * Result of importing a shared loadout to wishlist
 */
interface ImportLoadoutResult {
  success: boolean;
  itemsImported?: number;
  loadoutId?: string;
  error?: string;
}

/**
 * Add Item to Wishlist (T040)
 *
 * Adds a single item from a shared loadout to the current user's inventory
 * with wishlist status. Stores a reference to the source share token for
 * context and future features.
 *
 * Contract: See specs/048-shared-loadout-enhancement/contracts/api.md
 *
 * @param input - Item data and source share token
 * @returns Result object with success status and itemId
 */
export async function addItemToWishlist(
  input: AddToWishlistInput
): Promise<AddToWishlistResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { data, error } = await supabase
      .from('gear_items')
      .insert({
        user_id: user.id,
        name: input.item.name,
        brand: input.item.brand,
        primary_image_url: input.item.primaryImageUrl,
        category_id: input.item.categoryId,
        weight_grams: input.item.weightGrams,
        description: input.item.description,
        status: 'wishlist',
        condition: 'new',
        source_share_token: input.sourceShareToken,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[addItemToWishlist] Database error:', error);
      return { success: false, error: 'Failed to add item to wishlist' };
    }

    // Revalidate inventory page to show new wishlist item
    revalidatePath('/inventory');

    return { success: true, itemId: data.id };
  } catch (err) {
    console.error('[addItemToWishlist] Unexpected error:', err);
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { success: false, error: `Failed to add item: ${message}` };
  }
}

/**
 * Import Full Loadout to Wishlist
 *
 * Auto-imports all items from a shared loadout after signup.
 * Creates a copy of the loadout with "(Imported)" suffix and adds
 * all items with wishlist status.
 *
 * Contract: See specs/048-shared-loadout-enhancement/contracts/api.md
 *
 * @param shareToken - The share token of the loadout to import
 * @returns Result object with success status and metadata
 */
export async function importLoadoutToWishlist(
  shareToken: string
): Promise<ImportLoadoutResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // 1. Fetch the shared loadout
    const { data: share, error: fetchError } = await supabase
      .from('loadout_shares')
      .select('payload, loadout_id')
      .eq('share_token', shareToken)
      .single();

    if (fetchError || !share) {
      return { success: false, error: 'Shared loadout not found' };
    }

    const payload = share.payload as unknown as SharedLoadoutPayload;

    // 2. Create loadout copy for user
    const { data: newLoadout, error: loadoutError } = await supabase
      .from('loadouts')
      .insert({
        user_id: user.id,
        name: `${payload.loadout.name} (Imported)`,
        description: payload.loadout.description,
        activity_types: payload.loadout.activityTypes,
        seasons: payload.loadout.seasons,
      })
      .select('id')
      .single();

    if (loadoutError || !newLoadout) {
      console.error('[importLoadoutToWishlist] Failed to create loadout:', loadoutError);
      return { success: false, error: 'Failed to create loadout' };
    }

    // 3. Insert all items as wishlist
    const itemInserts = payload.items.map(item => ({
      user_id: user.id,
      name: item.name,
      brand: item.brand,
      primary_image_url: item.primaryImageUrl,
      category_id: item.categoryId,
      weight_grams: item.weightGrams,
      description: item.description || null,
      status: 'wishlist' as const,
      condition: 'new' as const,
      source_share_token: shareToken,
    }));

    const { data: insertedItems, error: itemsError } = await supabase
      .from('gear_items')
      .insert(itemInserts)
      .select('id');

    if (itemsError || !insertedItems) {
      console.error('[importLoadoutToWishlist] Failed to import items:', itemsError);
      return { success: false, error: 'Failed to import items' };
    }

    // 4. Link items to the new loadout
    const loadoutItemInserts = insertedItems.map(item => ({
      loadout_id: newLoadout.id,
      gear_item_id: item.id,
      is_worn: false,
      is_consumable: false,
    }));

    const { error: linkError } = await supabase
      .from('loadout_items')
      .insert(loadoutItemInserts);

    if (linkError) {
      console.error('[importLoadoutToWishlist] Failed to link items to loadout:', linkError);
      // Don't fail the import, items are still in inventory
    }

    // Revalidate relevant pages
    revalidatePath('/loadouts');
    revalidatePath('/inventory');

    return {
      success: true,
      itemsImported: insertedItems.length,
      loadoutId: newLoadout.id,
    };
  } catch (error) {
    console.error('[importLoadoutToWishlist] Unexpected error:', error);
    return { success: false, error: 'Internal error' };
  }
}
