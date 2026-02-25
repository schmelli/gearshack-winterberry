/**
 * Gear Item Utility Functions
 *
 * Feature: 001-gear-item-editor, 057-wishlist-pricing-enhancements
 * Provides conversion functions between form data and entity types
 */

import type {
  GearItem,
  GearItemFormData,
  WeightUnit,
} from '@/types/gear';
import { optimizeCloudinaryUrl } from './cloudinary-utils';

// =============================================================================
// Weight Conversion Constants
// =============================================================================

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;

// =============================================================================
// Weight Conversion Functions (T008)
// =============================================================================

/**
 * Convert grams to the specified display unit
 */
export function gramsToDisplayUnit(grams: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz':
      return grams / GRAMS_PER_OZ;
    case 'lb':
      return grams / GRAMS_PER_LB;
    default:
      return grams;
  }
}

/**
 * Convert from display unit to grams (canonical storage unit)
 */
export function displayUnitToGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz':
      return value * GRAMS_PER_OZ;
    case 'lb':
      return value * GRAMS_PER_LB;
    default:
      return value;
  }
}

/**
 * Format weight for display with appropriate precision
 */
export function formatWeight(grams: number, unit: WeightUnit): string {
  const converted = gramsToDisplayUnit(grams, unit);
  const precision = unit === 'g' ? 0 : 2;
  return converted.toFixed(precision);
}

/**
 * Format weight for gallery display with smart g/kg switching
 * - Shows grams for < 1000g (e.g., "850 g")
 * - Shows kilograms for >= 1000g (e.g., "1.25 kg")
 * - Returns em dash for null values
 */
export function formatWeightForDisplay(grams: number | null): string {
  if (grams === null) return '—';
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${Math.round(grams)} g`;
}

// =============================================================================
// Safe Parsing Helpers
// =============================================================================

/**
 * Safely parse a float, returning null for invalid input (NaN/Infinity)
 */
function safeParseFloat(value: string | undefined | null): number | null {
  if (!value) return null;
  const parsed = parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Safely parse an integer, returning the default for invalid input (NaN/Infinity)
 */
function safeParseInt(value: string | undefined | null, defaultValue: number): number {
  if (!value) return defaultValue;
  const parsed = parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

// =============================================================================
// Form ↔ Entity Conversion Functions (T009)
// =============================================================================

/**
 * Convert a GearItem entity to form data for editing
 */
export function gearItemToFormData(item: GearItem): GearItemFormData {
  const weightInDisplayUnit =
    item.weightGrams !== null
      ? gramsToDisplayUnit(item.weightGrams, item.weightDisplayUnit)
      : null;

  return {
    name: item.name,
    brand: item.brand ?? '',
    description: item.description ?? '',
    brandUrl: item.brandUrl ?? '',
    modelNumber: item.modelNumber ?? '',
    productUrl: item.productUrl ?? '',
    productTypeId: item.productTypeId ?? '',
    weightValue: weightInDisplayUnit?.toString() ?? '',
    weightDisplayUnit: item.weightDisplayUnit,
    lengthCm: item.lengthCm?.toString() ?? '',
    widthCm: item.widthCm?.toString() ?? '',
    heightCm: item.heightCm?.toString() ?? '',
    size: item.size ?? '',
    color: item.color ?? '',
    volumeLiters: item.volumeLiters?.toString() ?? '',
    materials: item.materials ?? '',
    tentConstruction: item.tentConstruction ?? '',
    pricePaid: item.pricePaid?.toString() ?? '',
    currency: item.currency ?? 'USD',
    purchaseDate: item.purchaseDate?.toISOString().split('T')[0] ?? '',
    retailer: item.retailer ?? '',
    retailerUrl: item.retailerUrl ?? '',
    manufacturerPrice: item.manufacturerPrice?.toString() ?? '',
    manufacturerCurrency: item.manufacturerCurrency ?? 'EUR',
    primaryImageUrl: item.primaryImageUrl ?? '',
    galleryImageUrls: item.galleryImageUrls,
    condition: item.condition,
    status: item.status,
    notes: item.notes ?? '',
    quantity: item.quantity?.toString() ?? '1',
    isFavourite: item.isFavourite ?? false,
    isForSale: item.isForSale ?? false,
    canBeBorrowed: item.canBeBorrowed ?? false,
    canBeTraded: item.canBeTraded ?? false,
    dependencyIds: item.dependencyIds ?? [],
  };
}

/**
 * Convert form data to a GearItem entity (for saving)
 * Note: id, createdAt, updatedAt are handled separately
 */
export function formDataToGearItem(
  formData: GearItemFormData
): Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'> {
  const weightValue = safeParseFloat(formData.weightValue);
  const weightGrams =
    weightValue !== null
      ? displayUnitToGrams(weightValue, formData.weightDisplayUnit)
      : null;

  return {
    name: formData.name,
    brand: formData.brand || null,
    description: formData.description || null,
    brandUrl: formData.brandUrl || null,
    modelNumber: formData.modelNumber || null,
    productUrl: formData.productUrl || null,
    productTypeId: formData.productTypeId || null,
    weightGrams,
    weightDisplayUnit: formData.weightDisplayUnit,
    lengthCm: safeParseFloat(formData.lengthCm),
    widthCm: safeParseFloat(formData.widthCm),
    heightCm: safeParseFloat(formData.heightCm),
    size: formData.size || null,
    color: formData.color || null,
    volumeLiters: safeParseFloat(formData.volumeLiters),
    materials: formData.materials || null,
    tentConstruction: formData.tentConstruction || null,
    pricePaid: safeParseFloat(formData.pricePaid),
    currency: formData.currency || null,
    purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
    retailer: formData.retailer || null,
    retailerUrl: formData.retailerUrl || null,
    manufacturerPrice: safeParseFloat(formData.manufacturerPrice),
    manufacturerCurrency: formData.manufacturerCurrency || 'EUR',
    primaryImageUrl: formData.primaryImageUrl || null,
    galleryImageUrls: formData.galleryImageUrls.filter(Boolean),
    condition: formData.condition,
    status: formData.status,
    notes: formData.notes || null,
    quantity: safeParseInt(formData.quantity, 1),
    isFavourite: formData.isFavourite ?? false,
    isForSale: formData.isForSale ?? false,
    canBeBorrowed: formData.canBeBorrowed ?? false,
    canBeTraded: formData.canBeTraded ?? false,
    dependencyIds: formData.dependencyIds ?? [],
    // Merchant integration properties (053)
    sourceMerchantId: null,
    sourceOfferId: null,
    sourceLoadoutId: null,
  };
}

// =============================================================================
// ID Generation (for new items)
// =============================================================================

/**
 * Generate a unique ID for a new gear item
 */
export function generateGearItemId(): string {
  return `gear-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Create a new GearItem with generated ID and timestamps
 */
export function createNewGearItem(
  formData: GearItemFormData
): GearItem {
  const now = new Date();
  return {
    id: generateGearItemId(),
    createdAt: now,
    updatedAt: now,
    ...formDataToGearItem(formData),
  };
}

/**
 * Update an existing GearItem with form data
 */
export function updateGearItem(
  existingItem: GearItem,
  formData: GearItemFormData
): GearItem {
  return {
    ...existingItem,
    ...formDataToGearItem(formData),
    updatedAt: new Date(),
  };
}

// =============================================================================
// Optimized Image Selection (Feature: 019-image-perfection)
// =============================================================================

/**
 * Returns the best available image URL for a gear item with Cloudinary optimizations
 *
 * Priority order:
 * 1. nobgImages (first available PNG from Cloud Functions)
 * 2. primaryImageUrl (original uploaded image)
 * 3. null (no image available)
 *
 * Applies Cloudinary transformations for optimal web delivery:
 * - Automatic format selection (WebP for Chrome, JPEG for Safari)
 * - Quality optimization based on content
 * - Responsive sizing based on viewport
 *
 * @param item - GearItem to get image URL for
 * @param width - Max width for responsive sizing (default: 800px for standard cards)
 * @returns Optimized image URL or null
 */
export function getOptimizedImageUrl(item: GearItem, width: number = 800): string | null {
  let imageUrl: string | null = null;

  // Check for processed background-removed images first
  if (item.nobgImages) {
    const sizes = Object.values(item.nobgImages);
    if (sizes.length > 0 && sizes[0]?.png) {
      imageUrl = sizes[0].png;
    }
  }

  // Fall back to primary image
  if (!imageUrl) {
    imageUrl = item.primaryImageUrl;
  }

  // Apply Cloudinary optimizations if we have a Cloudinary URL
  if (imageUrl && imageUrl.includes('res.cloudinary.com')) {
    return optimizeCloudinaryUrl(imageUrl, {
      width,
      quality: 'auto:good',
      format: 'auto',
    });
  }

  return imageUrl;
}
