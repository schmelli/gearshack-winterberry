/**
 * Wishlist Query Functions
 *
 * Feature: 049-wishlist-view
 * Contract: specs/049-wishlist-view/contracts/wishlist-queries.md
 *
 * All Supabase query functions for wishlist CRUD operations.
 * Follows existing patterns from lib/supabase/ directory.
 */

import { createClient } from '@/lib/supabase/client';
import type { WishlistItem, AddWishlistItemParams, UpdateWishlistItemParams } from '@/types/wishlist';
import type { Database } from '@/types/database';
import type { NobgImages } from '@/types/gear';

type GearItemRow = Database['public']['Tables']['gear_items']['Row'];
type GearItemInsert = Database['public']['Tables']['gear_items']['Insert'];

// =============================================================================
// Error Classes
// =============================================================================

export class WishlistError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'WishlistError';
  }
}

export class DuplicateError extends WishlistError {
  constructor(existingItem: WishlistItem) {
    super(
      `Item "${existingItem.brand} ${existingItem.modelNumber}" already in wishlist`,
      'DUPLICATE_ITEM'
    );
  }
}

export class NotFoundError extends WishlistError {
  constructor(itemId: string) {
    super(`Wishlist item ${itemId} not found`, 'NOT_FOUND');
  }
}

export class ValidationError extends WishlistError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR');
  }
}

// =============================================================================
// Transformer: Database Row -> WishlistItem
// =============================================================================

/**
 * Transforms database row to WishlistItem type
 * Converts snake_case to camelCase and enforces status='wishlist'
 */
function transformWishlistItem(row: GearItemRow): WishlistItem {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    // Section 1: General Info
    name: row.name,
    brand: row.brand ?? null,
    description: row.description ?? null,
    brandUrl: row.brand_url ?? null,
    modelNumber: row.model_number ?? null,
    productUrl: row.product_url ?? null,

    // Section 2: Classification
    productTypeId: row.product_type_id ?? null,

    // Section 3: Weight & Specifications
    weightGrams: row.weight_grams ?? null,
    weightDisplayUnit: (row.weight_display_unit as 'g' | 'oz' | 'lb') ?? null,
    lengthCm: row.length_cm ?? null,
    widthCm: row.width_cm ?? null,
    heightCm: row.height_cm ?? null,
    size: row.size ?? null,
    color: row.color ?? null,
    volumeLiters: row.volume_liters ?? null,
    materials: row.materials ?? null,
    tentConstruction: row.tent_construction ?? null,

    // Section 4: Purchase Details
    pricePaid: row.price_paid ?? null,
    currency: row.currency ?? null,
    manufacturerPrice: row.manufacturer_price ?? null,
    manufacturerCurrency: row.manufacturer_currency ?? null,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : null,
    retailer: row.retailer ?? null,
    retailerUrl: row.retailer_url ?? null,

    // Section 5: Media
    primaryImageUrl: row.primary_image_url ?? null,
    galleryImageUrls: row.gallery_image_urls ?? [],
    nobgImages: (row.nobg_images as Record<string, unknown> | null) as NobgImages | undefined, // Type assertion for JSONB object

    // Section 6: Status & Condition
    condition: (row.condition as 'new' | 'used' | 'worn') ?? null,
    status: 'wishlist', // Enforce wishlist status at type level
    notes: row.notes ?? null,
    quantity: (row as { quantity?: number }).quantity ?? 1,
    isFavourite: row.is_favourite ?? false,
    isForSale: row.is_for_sale ?? false,
    canBeBorrowed: row.can_be_borrowed ?? false,
    canBeTraded: row.can_be_traded ?? false,

    // Section 7: Dependencies
    dependencyIds: row.dependency_ids ?? [],

    // Section 8: Merchant integration (053)
    sourceMerchantId: (row as { source_merchant_id?: string | null }).source_merchant_id ?? null,
    sourceOfferId: (row as { source_offer_id?: string | null }).source_offer_id ?? null,
    sourceLoadoutId: (row as { source_loadout_id?: string | null }).source_loadout_id ?? null,
  };
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Fetch all wishlist items for the authenticated user
 *
 * @returns Promise<WishlistItem[]> - Array of wishlist items
 * @throws Error if not authenticated or query fails
 */
export async function fetchWishlistItems(): Promise<WishlistItem[]> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to fetch wishlist items');
  }

  // Query gear_items with status='wishlist'
  const { data, error } = await supabase
    .from('gear_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch wishlist items: ${error.message}`);
  }

  return (data ?? []).map(transformWishlistItem);
}

/**
 * Add a new item to the wishlist
 *
 * @param item - Item data (without id, status, timestamps)
 * @returns Promise<WishlistItem> - Newly created wishlist item
 * @throws DuplicateError if brand+model already exists
 * @throws ValidationError if data is invalid
 * @throws Error if not authenticated or insert fails
 */
export async function addWishlistItem(item: AddWishlistItemParams): Promise<WishlistItem> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new ValidationError('User must be authenticated to add wishlist items');
  }

  // Check for duplicate (brand + model)
  const duplicate = await checkWishlistDuplicate(item.brand, item.modelNumber);
  if (duplicate) {
    throw new DuplicateError(duplicate);
  }

  // Prepare insert data
  const now = new Date().toISOString();
  const insertData: GearItemInsert = {
    user_id: user.id,
    status: 'wishlist',
    created_at: now,
    updated_at: now,

    // Map camelCase to snake_case
    name: item.name,
    brand: item.brand,
    description: item.description,
    brand_url: item.brandUrl,
    model_number: item.modelNumber,
    product_url: item.productUrl,

    product_type_id: item.productTypeId,

    weight_grams: item.weightGrams,
    weight_display_unit: item.weightDisplayUnit,
    length_cm: item.lengthCm,
    width_cm: item.widthCm,
    height_cm: item.heightCm,

    price_paid: item.pricePaid,
    currency: item.currency,
    purchase_date: item.purchaseDate?.toISOString() ?? null,
    retailer: item.retailer,
    retailer_url: item.retailerUrl,

    primary_image_url: item.primaryImageUrl,
    gallery_image_urls: item.galleryImageUrls,

    condition: item.condition,
    notes: item.notes,
    is_favourite: item.isFavourite,
    is_for_sale: item.isForSale,
    can_be_borrowed: item.canBeBorrowed,
    can_be_traded: item.canBeTraded,

    dependency_ids: item.dependencyIds,
  };

  // Insert into database
  const { data, error } = await supabase
    .from('gear_items')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add wishlist item: ${error.message}`);
  }

  return transformWishlistItem(data);
}

/**
 * Update an existing wishlist item
 *
 * @param itemId - UUID of wishlist item
 * @param updates - Partial updates (cannot change id, status, timestamps)
 * @returns Promise<WishlistItem> - Updated wishlist item
 * @throws NotFoundError if item not found
 * @throws Error if not authenticated or update fails
 */
export async function updateWishlistItem(
  itemId: string,
  updates: UpdateWishlistItemParams
): Promise<WishlistItem> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to update wishlist items');
  }

  // Prepare update data (map camelCase to snake_case)
  const updateData: Partial<GearItemInsert> = {
    updated_at: new Date().toISOString(),
    ...(updates.name !== undefined && { name: updates.name }),
    ...(updates.brand !== undefined && { brand: updates.brand }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.brandUrl !== undefined && { brand_url: updates.brandUrl }),
    ...(updates.modelNumber !== undefined && { model_number: updates.modelNumber }),
    ...(updates.productUrl !== undefined && { product_url: updates.productUrl }),
    ...(updates.productTypeId !== undefined && { product_type_id: updates.productTypeId }),
    ...(updates.weightGrams !== undefined && { weight_grams: updates.weightGrams }),
    ...(updates.weightDisplayUnit !== undefined && { weight_display_unit: updates.weightDisplayUnit }),
    ...(updates.lengthCm !== undefined && { length_cm: updates.lengthCm }),
    ...(updates.widthCm !== undefined && { width_cm: updates.widthCm }),
    ...(updates.heightCm !== undefined && { height_cm: updates.heightCm }),
    ...(updates.pricePaid !== undefined && { price_paid: updates.pricePaid }),
    ...(updates.currency !== undefined && { currency: updates.currency }),
    ...(updates.purchaseDate !== undefined && {
      purchase_date: updates.purchaseDate?.toISOString() ?? null,
    }),
    ...(updates.retailer !== undefined && { retailer: updates.retailer }),
    ...(updates.retailerUrl !== undefined && { retailer_url: updates.retailerUrl }),
    ...(updates.primaryImageUrl !== undefined && { primary_image_url: updates.primaryImageUrl }),
    ...(updates.galleryImageUrls !== undefined && { gallery_image_urls: updates.galleryImageUrls }),
    ...(updates.condition !== undefined && { condition: updates.condition }),
    ...(updates.notes !== undefined && { notes: updates.notes }),
    ...(updates.isFavourite !== undefined && { is_favourite: updates.isFavourite }),
    ...(updates.isForSale !== undefined && { is_for_sale: updates.isForSale }),
    ...(updates.canBeBorrowed !== undefined && { can_be_borrowed: updates.canBeBorrowed }),
    ...(updates.canBeTraded !== undefined && { can_be_traded: updates.canBeTraded }),
    ...(updates.dependencyIds !== undefined && { dependency_ids: updates.dependencyIds }),
  };

  // Update in database
  const { data, error } = await supabase
    .from('gear_items')
    .update(updateData)
    .eq('id', itemId)
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError(itemId);
    }
    throw new Error(`Failed to update wishlist item: ${error.message}`);
  }

  return transformWishlistItem(data);
}

/**
 * Delete a wishlist item
 *
 * @param itemId - UUID of wishlist item
 * @returns Promise<void>
 * @throws NotFoundError if item not found
 * @throws Error if not authenticated or delete fails
 */
export async function deleteWishlistItem(itemId: string): Promise<void> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to delete wishlist items');
  }

  // Delete from database
  const { error } = await supabase
    .from('gear_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)
    .eq('status', 'wishlist');

  if (error) {
    throw new Error(`Failed to delete wishlist item: ${error.message}`);
  }
}

/**
 * Move wishlist item to inventory (change status from 'wishlist' to 'own')
 *
 * @param itemId - UUID of wishlist item
 * @returns Promise<GearItem> - Item with status='own' (now in inventory)
 * @throws NotFoundError if item not found
 * @throws Error if not authenticated or update fails
 */
export async function moveWishlistItemToInventory(itemId: string): Promise<GearItemRow> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to move wishlist items');
  }

  // Update status to 'own'
  const { data, error } = await supabase
    .from('gear_items')
    .update({
      status: 'own',
      updated_at: new Date().toISOString(),
    })
    .eq('id', itemId)
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new NotFoundError(itemId);
    }
    throw new Error(`Failed to move wishlist item to inventory: ${error.message}`);
  }

  // Return as generic GearItem (status is now 'own', not 'wishlist')
  return data;
}

/**
 * Check if wishlist item with same brand+model already exists
 * Case-insensitive matching
 *
 * @param brand - Brand name (nullable)
 * @param modelNumber - Model number (nullable)
 * @returns Promise<WishlistItem | null> - Existing item if found, null otherwise
 * @throws Error if not authenticated or query fails
 */
export async function checkWishlistDuplicate(
  brand: string | null,
  modelNumber: string | null
): Promise<WishlistItem | null> {
  const supabase = createClient();

  // Get authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('User must be authenticated to check wishlist duplicates');
  }

  // Normalize inputs for case-insensitive comparison
  const normalizedBrand = brand?.toLowerCase().trim() || '';
  const normalizedModel = modelNumber?.toLowerCase().trim() || '';

  // If both are empty, no duplicate check needed
  if (!normalizedBrand && !normalizedModel) {
    return null;
  }

  // Escape ILIKE special characters to prevent injection
  // Order matters: escape backslash first, then wildcards
  const escapedBrand = normalizedBrand
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
  const escapedModel = normalizedModel
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');

  // Query with case-insensitive matching using ilike
  const { data, error } = await supabase
    .from('gear_items')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'wishlist')
    .ilike('brand', escapedBrand)
    .ilike('model_number', escapedModel)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check wishlist duplicate: ${error.message}`);
  }

  return data ? transformWishlistItem(data) : null;
}
