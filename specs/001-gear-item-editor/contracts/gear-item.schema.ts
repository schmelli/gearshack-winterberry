/**
 * Gear Item Zod Validation Schemas
 *
 * Feature: 001-gear-item-editor
 * Location: lib/validations/gear-schema.ts (copy this file there during implementation)
 *
 * These schemas provide runtime validation for the GearItem form data.
 * They are designed to work with react-hook-form's zodResolver.
 */

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const weightUnitSchema = z.enum(['g', 'oz', 'lb']);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const gearConditionSchema = z.enum(['new', 'used', 'worn']);
export type GearCondition = z.infer<typeof gearConditionSchema>;

export const gearStatusSchema = z.enum(['active', 'wishlist', 'sold']);
export type GearStatus = z.infer<typeof gearStatusSchema>;

// =============================================================================
// Reusable Schema Fragments
// =============================================================================

/**
 * Optional URL field - empty string or valid URL
 */
const optionalUrlSchema = z
  .string()
  .url('Invalid URL format')
  .or(z.literal(''))
  .transform((val) => val || null);

/**
 * Optional positive number from string input
 */
const optionalPositiveNumberSchema = z
  .string()
  .refine(
    (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: 'Must be a positive number' }
  )
  .transform((val) => (val === '' ? null : parseFloat(val)));

/**
 * Optional strictly positive number (> 0) from string input
 */
const optionalStrictPositiveNumberSchema = z
  .string()
  .refine(
    (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: 'Must be a positive number greater than zero' }
  )
  .transform((val) => (val === '' ? null : parseFloat(val)));

// =============================================================================
// Form Data Schema (for react-hook-form)
// =============================================================================

export const gearItemFormSchema = z.object({
  // Section 1: General Info
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  brand: z.string().max(100, 'Brand must be 100 characters or less'),
  brandUrl: optionalUrlSchema,
  modelNumber: z.string().max(100, 'Model number must be 100 characters or less'),
  productUrl: optionalUrlSchema,

  // Section 2: Classification
  categoryId: z.string(),
  subcategoryId: z.string(),
  productTypeId: z.string(),

  // Section 3: Weight & Specifications
  weightValue: optionalPositiveNumberSchema,
  weightDisplayUnit: weightUnitSchema,
  lengthCm: optionalStrictPositiveNumberSchema,
  widthCm: optionalStrictPositiveNumberSchema,
  heightCm: optionalStrictPositiveNumberSchema,

  // Section 4: Purchase Details
  pricePaid: optionalPositiveNumberSchema,
  currency: z.string().max(3, 'Currency code must be 3 characters'),
  purchaseDate: z
    .string()
    .refine(
      (val) => val === '' || !isNaN(Date.parse(val)),
      { message: 'Invalid date format' }
    ),
  retailer: z.string().max(200, 'Retailer name must be 200 characters or less'),
  retailerUrl: optionalUrlSchema,

  // Section 5: Media
  primaryImageUrl: optionalUrlSchema,
  galleryImageUrls: z.array(
    z.string().url('Invalid URL format').or(z.literal(''))
  ).transform((arr) => arr.filter(Boolean)),

  // Section 6: Status & Condition
  condition: gearConditionSchema,
  status: gearStatusSchema,
  notes: z.string().max(5000, 'Notes must be 5000 characters or less'),
});

export type GearItemFormData = z.infer<typeof gearItemFormSchema>;

// =============================================================================
// Partial Schema (for draft saving)
// =============================================================================

export const gearItemDraftSchema = gearItemFormSchema.partial().extend({
  name: z.string(), // Name can be empty in draft
});

export type GearItemDraftData = z.infer<typeof gearItemDraftSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate form data and return typed result or errors
 */
export function validateGearItemForm(data: unknown): {
  success: boolean;
  data?: GearItemFormData;
  errors?: z.ZodError;
} {
  const result = gearItemFormSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error };
}

/**
 * Get field-specific error message
 */
export function getFieldError(
  errors: z.ZodError | undefined,
  field: keyof GearItemFormData
): string | undefined {
  if (!errors) return undefined;
  const fieldError = errors.errors.find((e) => e.path[0] === field);
  return fieldError?.message;
}
