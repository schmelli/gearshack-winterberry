/**
 * Supabase Data Transformers
 *
 * Feature: 040-supabase-migration
 * Task: T031
 *
 * Helper functions for transforming data between camelCase (TypeScript)
 * and snake_case (PostgreSQL) formats.
 */

import type { GearItem, GearCondition, GearStatus, WeightUnit, NobgImages } from '@/types/gear';
import type { Tables, TablesInsert, TablesUpdate, Json } from '@/types/database';
import { cleanProductUrl } from '@/lib/utils';

// =============================================================================
// Type Aliases
// =============================================================================

type GearItemRow = Tables<'gear_items'>;
type GearItemInsertRow = TablesInsert<'gear_items'>;
type GearItemUpdateRow = TablesUpdate<'gear_items'>;

// =============================================================================
// Status Mapping (active -> own for backwards compatibility)
// =============================================================================

/** Map legacy 'active' status to 'own' */
function mapStatusToDb(status: GearStatus): GearStatus {
  // 'active' was renamed to 'own' in the migration
  return status === 'active' as unknown as GearStatus ? 'own' : status;
}

/** Map 'own' back to 'own' (no reverse mapping needed for new data) */
function mapStatusFromDb(status: string): GearStatus {
  return status as GearStatus;
}

// =============================================================================
// GearItem Transformers
// =============================================================================

/**
 * Transform a database row to a GearItem
 */
export function gearItemFromDb(row: GearItemRow): GearItem {
  return {
    id: row.id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    // Section 1: General Info
    name: row.name,
    brand: row.brand,
    description: row.description,
    brandUrl: row.brand_url,
    modelNumber: row.model_number,
    productUrl: row.product_url,

    // Section 2: Classification (Cascading Category Refactor: only productTypeId)
    productTypeId: row.product_type_id,

    // Section 3: Weight & Specifications
    weightGrams: row.weight_grams ? Number(row.weight_grams) : null,
    weightDisplayUnit: row.weight_display_unit as WeightUnit,
    lengthCm: row.length_cm ? Number(row.length_cm) : null,
    widthCm: row.width_cm ? Number(row.width_cm) : null,
    heightCm: row.height_cm ? Number(row.height_cm) : null,
    size: row.size,
    color: row.color,
    volumeLiters: row.volume_liters ? Number(row.volume_liters) : null,
    materials: row.materials,
    tentConstruction: row.tent_construction,

    // Section 4: Purchase Details
    pricePaid: row.price_paid ? Number(row.price_paid) : null,
    currency: row.currency,
    manufacturerPrice: row.manufacturer_price ? Number(row.manufacturer_price) : null,
    manufacturerCurrency: row.manufacturer_currency ?? null,
    purchaseDate: row.purchase_date ? new Date(row.purchase_date) : null,
    retailer: row.retailer,
    retailerUrl: row.retailer_url,

    // Section 5: Media
    primaryImageUrl: row.primary_image_url,
    galleryImageUrls: row.gallery_image_urls || [],
    nobgImages: (row.nobg_images as unknown as NobgImages) || {},

    // Section 6: Status & Condition
    condition: row.condition as GearCondition,
    status: mapStatusFromDb(row.status),
    notes: row.notes,
    quantity: (row as { quantity?: number }).quantity ?? 1,
    isFavourite: row.is_favourite ?? false,
    isForSale: row.is_for_sale ?? false,
    canBeBorrowed: row.can_be_borrowed ?? false,
    canBeTraded: row.can_be_traded ?? false,

    // Section 7: Merchant Source Attribution (Feature 053)
    sourceMerchantId: (row as unknown as { source_merchant_id?: string | null }).source_merchant_id ?? null,
    sourceOfferId: (row as unknown as { source_offer_id?: string | null }).source_offer_id ?? null,
    sourceLoadoutId: (row as unknown as { source_loadout_id?: string | null }).source_loadout_id ?? null,

    // Section 8: Dependencies
    dependencyIds: row.dependency_ids || [],
  };
}

/**
 * Transform a GearItem to a database insert row
 */
export function gearItemToDbInsert(item: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'>, userId: string): GearItemInsertRow {
  return {
    user_id: userId,
    name: item.name,
    brand: item.brand,
    description: item.description,
    brand_url: item.brandUrl,
    model_number: item.modelNumber,
    product_url: cleanProductUrl(item.productUrl) ?? item.productUrl,

    product_type_id: item.productTypeId,

    weight_grams: item.weightGrams,
    weight_display_unit: item.weightDisplayUnit,
    length_cm: item.lengthCm,
    width_cm: item.widthCm,
    height_cm: item.heightCm,
    size: item.size,
    color: item.color,
    volume_liters: item.volumeLiters,
    materials: item.materials,
    tent_construction: item.tentConstruction,

    price_paid: item.pricePaid,
    currency: item.currency,
    manufacturer_price: item.manufacturerPrice,
    manufacturer_currency: item.manufacturerCurrency,
    purchase_date: item.purchaseDate?.toISOString().split('T')[0],
    retailer: item.retailer,
    retailer_url: item.retailerUrl,

    primary_image_url: item.primaryImageUrl,
    gallery_image_urls: item.galleryImageUrls,
    nobg_images: (item.nobgImages || {}) as unknown as Json,

    condition: item.condition,
    status: mapStatusToDb(item.status),
    notes: item.notes,
    // TODO: Add 'quantity' column to gear_items table, then uncomment:
    // quantity: item.quantity ?? 1,
    is_favourite: item.isFavourite ?? false,
    is_for_sale: item.isForSale ?? false,
    can_be_borrowed: item.canBeBorrowed ?? false,
    can_be_traded: item.canBeTraded ?? false,

    dependency_ids: item.dependencyIds,
  };
}

/**
 * Transform partial GearItem data to a database update row
 */
export function gearItemToDbUpdate(item: Partial<GearItem>): GearItemUpdateRow {
  const update: GearItemUpdateRow = {};

  if (item.name !== undefined) update.name = item.name;
  if (item.brand !== undefined) update.brand = item.brand;
  if (item.description !== undefined) update.description = item.description;
  if (item.brandUrl !== undefined) update.brand_url = item.brandUrl;
  if (item.modelNumber !== undefined) update.model_number = item.modelNumber;
  if (item.productUrl !== undefined) update.product_url = cleanProductUrl(item.productUrl) ?? item.productUrl;

  if (item.productTypeId !== undefined) update.product_type_id = item.productTypeId;

  if (item.weightGrams !== undefined) update.weight_grams = item.weightGrams;
  if (item.weightDisplayUnit !== undefined) update.weight_display_unit = item.weightDisplayUnit;
  if (item.lengthCm !== undefined) update.length_cm = item.lengthCm;
  if (item.widthCm !== undefined) update.width_cm = item.widthCm;
  if (item.heightCm !== undefined) update.height_cm = item.heightCm;
  if (item.size !== undefined) update.size = item.size;
  if (item.color !== undefined) update.color = item.color;
  if (item.volumeLiters !== undefined) update.volume_liters = item.volumeLiters;
  if (item.materials !== undefined) update.materials = item.materials;
  if (item.tentConstruction !== undefined) update.tent_construction = item.tentConstruction;

  if (item.pricePaid !== undefined) update.price_paid = item.pricePaid;
  if (item.currency !== undefined) update.currency = item.currency;
  if (item.manufacturerPrice !== undefined) update.manufacturer_price = item.manufacturerPrice;
  if (item.manufacturerCurrency !== undefined) update.manufacturer_currency = item.manufacturerCurrency;
  if (item.purchaseDate !== undefined) {
    update.purchase_date = item.purchaseDate?.toISOString().split('T')[0] ?? null;
  }
  if (item.retailer !== undefined) update.retailer = item.retailer;
  if (item.retailerUrl !== undefined) update.retailer_url = item.retailerUrl;

  if (item.primaryImageUrl !== undefined) update.primary_image_url = item.primaryImageUrl;
  if (item.galleryImageUrls !== undefined) update.gallery_image_urls = item.galleryImageUrls;
  if (item.nobgImages !== undefined) update.nobg_images = item.nobgImages as unknown as Json;

  if (item.condition !== undefined) update.condition = item.condition;
  if (item.status !== undefined) update.status = mapStatusToDb(item.status);
  if (item.notes !== undefined) update.notes = item.notes;
  // TODO: Add 'quantity' column to gear_items table, then uncomment:
  // if (item.quantity !== undefined) update.quantity = item.quantity;
  if (item.isFavourite !== undefined) update.is_favourite = item.isFavourite;
  if (item.isForSale !== undefined) update.is_for_sale = item.isForSale;
  if (item.canBeBorrowed !== undefined) update.can_be_borrowed = item.canBeBorrowed;
  if (item.canBeTraded !== undefined) update.can_be_traded = item.canBeTraded;

  if (item.dependencyIds !== undefined) update.dependency_ids = item.dependencyIds;

  return update;
}

// =============================================================================
// Category Transformer
// =============================================================================

export interface Category {
  id: string;
  parentId: string | null;
  level: number;
  label: string;
  createdAt: Date;
}

type CategoryRow = Tables<'categories'>;

export function categoryFromDb(row: CategoryRow): Category {
  return {
    id: row.id,
    parentId: row.parent_id,
    level: row.level,
    label: row.label,
    createdAt: new Date(row.created_at),
  };
}

// =============================================================================
// PostGIS Transformer (Feature 057)
// =============================================================================

/**
 * Transform PostGIS GEOGRAPHY/GEOMETRY data to { latitude, longitude } format
 *
 * Supabase returns PostGIS data in various formats depending on the query:
 * - GeoJSON: { type: 'Point', coordinates: [lng, lat] }
 * - WKT string: "POINT(lng lat)"
 * - Object with x/y: { x: lng, y: lat }
 *
 * This function normalizes all formats to { latitude, longitude } | null
 */
export function parsePostGISLocation(
  location: unknown
): { latitude: number; longitude: number } | null {
  if (!location) return null;

  // Handle GeoJSON format: { type: 'Point', coordinates: [lng, lat] }
  if (
    typeof location === 'object' &&
    'type' in location &&
    location.type === 'Point' &&
    'coordinates' in location &&
    Array.isArray(location.coordinates) &&
    location.coordinates.length === 2
  ) {
    const [lng, lat] = location.coordinates;
    if (typeof lng === 'number' && typeof lat === 'number') {
      return { latitude: lat, longitude: lng };
    }
  }

  // Handle x/y object format: { x: lng, y: lat }
  if (
    typeof location === 'object' &&
    'x' in location &&
    'y' in location &&
    typeof location.x === 'number' &&
    typeof location.y === 'number'
  ) {
    return { latitude: location.y, longitude: location.x };
  }

  // Handle WKT string format: "POINT(lng lat)"
  if (typeof location === 'string') {
    const match = location.match(/POINT\s*\(\s*([+-]?\d+\.?\d*)\s+([+-]?\d+\.?\d*)\s*\)/i);
    if (match) {
      const lng = parseFloat(match[1]);
      const lat = parseFloat(match[2]);
      // Use Number.isFinite() to reject NaN and Infinity
      if (Number.isFinite(lng) && Number.isFinite(lat)) {
        return { latitude: lat, longitude: lng };
      }
    }
  }

  return null;
}
