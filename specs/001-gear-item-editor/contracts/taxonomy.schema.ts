/**
 * Taxonomy Zod Validation Schemas
 *
 * Feature: 001-gear-item-editor
 * Location: lib/validations/taxonomy-schema.ts (copy this file there during implementation)
 *
 * These schemas validate the taxonomy data structure loaded from JSON.
 * Used to ensure type safety when loading the converted ontology data.
 */

import { z } from 'zod';

// =============================================================================
// Product Type Schema
// =============================================================================

export const productTypeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
});

export type ProductType = z.infer<typeof productTypeSchema>;

// =============================================================================
// Gear Subcategory Schema
// =============================================================================

export const gearSubcategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  productTypes: z.array(productTypeSchema),
});

export type GearSubcategory = z.infer<typeof gearSubcategorySchema>;

// =============================================================================
// Gear Category Schema
// =============================================================================

export const gearCategorySchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  subcategories: z.array(gearSubcategorySchema),
});

export type GearCategory = z.infer<typeof gearCategorySchema>;

// =============================================================================
// Outdoor Brand Schema
// =============================================================================

export const outdoorBrandSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  url: z.string().url().nullable(),
});

export type OutdoorBrand = z.infer<typeof outdoorBrandSchema>;

// =============================================================================
// Complete Taxonomy Data Schema
// =============================================================================

export const taxonomyDataSchema = z.object({
  categories: z.array(gearCategorySchema),
  brands: z.array(outdoorBrandSchema),
});

export type TaxonomyData = z.infer<typeof taxonomyDataSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate taxonomy data loaded from JSON
 * Use this when loading taxonomy-data.json to ensure type safety
 */
export function validateTaxonomyData(data: unknown): {
  success: boolean;
  data?: TaxonomyData;
  errors?: z.ZodError;
} {
  const result = taxonomyDataSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Type guard for TaxonomyData
 */
export function isTaxonomyData(data: unknown): data is TaxonomyData {
  return taxonomyDataSchema.safeParse(data).success;
}
