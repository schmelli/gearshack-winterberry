/**
 * Taxonomy Utility Functions
 *
 * Feature: 001-gear-item-editor
 * Provides helper functions for working with the gear taxonomy hierarchy
 */

import type {
  GearCategory,
  GearSubcategory,
  ProductType,
  TaxonomyData,
} from '@/types/taxonomy';
import taxonomyData from './taxonomy-data.json';

// =============================================================================
// Data Access
// =============================================================================

/**
 * Get the complete taxonomy data
 */
export function getTaxonomyData(): TaxonomyData {
  return taxonomyData as TaxonomyData;
}

/**
 * Get all top-level categories
 */
export function getCategories(): GearCategory[] {
  return getTaxonomyData().categories;
}

// =============================================================================
// Filtering Functions (for cascading selects)
// =============================================================================

/**
 * Get subcategories for a given category
 * Returns empty array if categoryId is null/empty
 */
export function getSubcategoriesForCategory(
  categoryId: string | null
): GearSubcategory[] {
  if (!categoryId) return [];
  const category = getCategories().find((c) => c.id === categoryId);
  return category?.subcategories ?? [];
}

/**
 * Get product types for a given subcategory
 * Returns empty array if either categoryId or subcategoryId is null/empty
 */
export function getProductTypesForSubcategory(
  categoryId: string | null,
  subcategoryId: string | null
): ProductType[] {
  if (!categoryId || !subcategoryId) return [];
  const subcategories = getSubcategoriesForCategory(categoryId);
  const subcategory = subcategories.find((s) => s.id === subcategoryId);
  return subcategory?.productTypes ?? [];
}

// =============================================================================
// Label Lookup Functions
// =============================================================================

/**
 * Get the display label for a category
 */
export function getCategoryLabel(categoryId: string | null): string | null {
  if (!categoryId) return null;
  return getCategories().find((c) => c.id === categoryId)?.label ?? null;
}

/**
 * Get the display label for a subcategory
 */
export function getSubcategoryLabel(
  categoryId: string | null,
  subcategoryId: string | null
): string | null {
  if (!categoryId || !subcategoryId) return null;
  return (
    getSubcategoriesForCategory(categoryId).find((s) => s.id === subcategoryId)
      ?.label ?? null
  );
}

/**
 * Get the display label for a product type
 */
export function getProductTypeLabel(
  categoryId: string | null,
  subcategoryId: string | null,
  productTypeId: string | null
): string | null {
  if (!categoryId || !subcategoryId || !productTypeId) return null;
  return (
    getProductTypesForSubcategory(categoryId, subcategoryId).find(
      (p) => p.id === productTypeId
    )?.label ?? null
  );
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Check if a subcategory is valid for a given category
 */
export function isValidSubcategory(
  categoryId: string | null,
  subcategoryId: string | null
): boolean {
  if (!categoryId || !subcategoryId) return false;
  return getSubcategoriesForCategory(categoryId).some(
    (s) => s.id === subcategoryId
  );
}

/**
 * Check if a product type is valid for a given subcategory
 */
export function isValidProductType(
  categoryId: string | null,
  subcategoryId: string | null,
  productTypeId: string | null
): boolean {
  if (!categoryId || !subcategoryId || !productTypeId) return false;
  return getProductTypesForSubcategory(categoryId, subcategoryId).some(
    (p) => p.id === productTypeId
  );
}

// =============================================================================
// Full Classification Label
// =============================================================================

/**
 * Get a combined classification label (e.g., "Shelter > Tents > Freestanding")
 */
export function getFullClassificationLabel(
  categoryId: string | null,
  subcategoryId: string | null,
  productTypeId: string | null
): string | null {
  const parts: string[] = [];

  const categoryLabel = getCategoryLabel(categoryId);
  if (categoryLabel) parts.push(categoryLabel);

  const subcategoryLabel = getSubcategoryLabel(categoryId, subcategoryId);
  if (subcategoryLabel) parts.push(subcategoryLabel);

  const productTypeLabel = getProductTypeLabel(
    categoryId,
    subcategoryId,
    productTypeId
  );
  if (productTypeLabel) parts.push(productTypeLabel);

  return parts.length > 0 ? parts.join(' > ') : null;
}
