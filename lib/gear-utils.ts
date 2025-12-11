/**
 * Gear Item Utility Functions
 *
 * Feature: 001-gear-item-editor
 * Provides conversion functions between form data and entity types
 */

import type {
  GearItem,
  GearItemFormData,
  WeightUnit,
} from '@/types/gear';

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
    categoryId: item.categoryId ?? '',
    subcategoryId: item.subcategoryId ?? '',
    productTypeId: item.productTypeId ?? '',
    weightValue: weightInDisplayUnit?.toString() ?? '',
    weightDisplayUnit: item.weightDisplayUnit,
    lengthCm: item.lengthCm?.toString() ?? '',
    widthCm: item.widthCm?.toString() ?? '',
    heightCm: item.heightCm?.toString() ?? '',
    pricePaid: item.pricePaid?.toString() ?? '',
    currency: item.currency ?? 'USD',
    purchaseDate: item.purchaseDate?.toISOString().split('T')[0] ?? '',
    retailer: item.retailer ?? '',
    retailerUrl: item.retailerUrl ?? '',
    primaryImageUrl: item.primaryImageUrl ?? '',
    galleryImageUrls: item.galleryImageUrls,
    condition: item.condition,
    status: item.status,
    notes: item.notes ?? '',
    isFavourite: item.isFavourite ?? false,
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
  const weightValue = formData.weightValue
    ? parseFloat(formData.weightValue)
    : null;
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
    categoryId: formData.categoryId || null,
    subcategoryId: formData.subcategoryId || null,
    productTypeId: formData.productTypeId || null,
    weightGrams,
    weightDisplayUnit: formData.weightDisplayUnit,
    lengthCm: formData.lengthCm ? parseFloat(formData.lengthCm) : null,
    widthCm: formData.widthCm ? parseFloat(formData.widthCm) : null,
    heightCm: formData.heightCm ? parseFloat(formData.heightCm) : null,
    pricePaid: formData.pricePaid ? parseFloat(formData.pricePaid) : null,
    currency: formData.currency || null,
    purchaseDate: formData.purchaseDate ? new Date(formData.purchaseDate) : null,
    retailer: formData.retailer || null,
    retailerUrl: formData.retailerUrl || null,
    primaryImageUrl: formData.primaryImageUrl || null,
    galleryImageUrls: formData.galleryImageUrls.filter(Boolean),
    condition: formData.condition,
    status: formData.status,
    notes: formData.notes || null,
    isFavourite: formData.isFavourite ?? false,
    dependencyIds: formData.dependencyIds ?? [],
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
 * Returns the best available image URL for a gear item
 *
 * Priority order:
 * 1. nobgImages (first available PNG from Cloud Functions)
 * 2. primaryImageUrl (original uploaded image)
 * 3. null (no image available)
 *
 * @param item - GearItem to get image URL for
 * @returns Best available image URL or null
 */
export function getOptimizedImageUrl(item: GearItem): string | null {
  // Check for processed background-removed images first
  if (item.nobgImages) {
    const sizes = Object.values(item.nobgImages);
    if (sizes.length > 0 && sizes[0]?.png) {
      return sizes[0].png;
    }
  }

  // Fall back to primary image
  return item.primaryImageUrl;
}
