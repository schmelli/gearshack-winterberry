/**
 * Gear Item Zod Validation Schemas
 *
 * Feature: 001-gear-item-editor
 * Constitution: Zod for runtime validation with TypeScript inference
 *
 * Note: For react-hook-form compatibility, input/output types must match.
 * Transforms are done during entity conversion, not validation.
 */

import { z } from 'zod';

// =============================================================================
// Enums and Constants
// =============================================================================

export const weightUnitSchema = z.enum(['g', 'oz', 'lb']);
export type WeightUnit = z.infer<typeof weightUnitSchema>;

export const gearConditionSchema = z.enum(['new', 'used', 'worn']);
export type GearCondition = z.infer<typeof gearConditionSchema>;

export const gearStatusSchema = z.enum(['own', 'wishlist', 'sold', 'lent', 'retired']);
export type GearStatus = z.infer<typeof gearStatusSchema>;

// =============================================================================
// Validation Helpers (no transforms for form compatibility)
// =============================================================================

/**
 * Optional URL field - empty string or valid URL (no transform)
 */
const optionalUrlSchema = z
  .string()
  .refine(
    (val) => val === '' || z.string().url().safeParse(val).success,
    { message: 'Invalid URL format' }
  );

/**
 * Optional positive number from string input (no transform)
 */
const optionalPositiveNumberSchema = z
  .string()
  .refine(
    (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) >= 0),
    { message: 'Must be a positive number' }
  );

/**
 * Optional strictly positive number (> 0) from string input (no transform)
 */
const optionalStrictPositiveNumberSchema = z
  .string()
  .refine(
    (val) => val === '' || (!isNaN(parseFloat(val)) && parseFloat(val) > 0),
    { message: 'Must be a positive number greater than zero' }
  );

// =============================================================================
// Form Data Schema (for react-hook-form)
// Input and output types are identical - no transforms
// =============================================================================

export const gearItemFormSchema = z.object({
  // Section 1: General Info
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must be 200 characters or less'),
  brand: z.string().max(100, 'Brand must be 100 characters or less'),
  description: z.string().max(5000, 'Description must be 5000 characters or less'),
  brandUrl: optionalUrlSchema,
  modelNumber: z.string().max(100, 'Model number must be 100 characters or less'),
  productUrl: optionalUrlSchema,

  // Section 2: Classification (Cascading Category Refactor: only productTypeId)
  productTypeId: z.string().min(1, 'Product type is required'),

  // Section 3: Weight & Specifications
  weightValue: optionalPositiveNumberSchema,
  weightDisplayUnit: weightUnitSchema,
  lengthCm: optionalStrictPositiveNumberSchema,
  widthCm: optionalStrictPositiveNumberSchema,
  heightCm: optionalStrictPositiveNumberSchema,
  // Category-specific specifications
  size: z.string().max(50, 'Size must be 50 characters or less'),
  color: z.string().max(100, 'Color must be 100 characters or less'),
  volumeLiters: optionalStrictPositiveNumberSchema,
  materials: z.string().max(500, 'Materials must be 500 characters or less'),
  tentConstruction: z.string().max(50, 'Tent construction must be 50 characters or less'),

  // Section 4: Purchase Details
  pricePaid: optionalPositiveNumberSchema,
  currency: z.string().max(3, 'Currency code must be 3 characters'),
  purchaseDate: z
    .string()
    .refine((val) => val === '' || !isNaN(Date.parse(val)), {
      message: 'Invalid date format',
    }),
  retailer: z.string().max(200, 'Retailer name must be 200 characters or less'),
  retailerUrl: optionalUrlSchema,

  // Section 5: Media
  primaryImageUrl: optionalUrlSchema,
  galleryImageUrls: z.array(
    z.string().refine(
      (val) => val === '' || z.string().url().safeParse(val).success,
      { message: 'Invalid URL format' }
    )
  ),

  // Section 6: Status & Condition
  condition: gearConditionSchema,
  status: gearStatusSchema,
  notes: z.string().max(5000, 'Notes must be 5000 characters or less'),
  /** Quantity owned (default 1) - supports items like stakes, batteries, etc. */
  quantity: z
    .string()
    .refine(
      (val) => val === '' || (!isNaN(parseInt(val)) && parseInt(val) >= 1),
      { message: 'Quantity must be at least 1' }
    ),
  /** Whether this item is marked as favourite - Feature 041 */
  isFavourite: z.boolean(),
  /** Whether this item is available for sale - Feature 045 */
  isForSale: z.boolean(),
  /** Whether this item can be borrowed by others - Feature 045 */
  canBeBorrowed: z.boolean(),
  /** Whether this item can be traded - Feature 045 */
  canBeTraded: z.boolean(),

  // Section 7: Dependencies (Feature: 037-gear-dependencies)
  dependencyIds: z.array(z.string()),
});

export type GearItemFormSchema = z.infer<typeof gearItemFormSchema>;

// =============================================================================
// Partial Schema (for draft saving)
// =============================================================================

export const gearItemDraftSchema = gearItemFormSchema.partial().extend({
  name: z.string(),
});

export type GearItemDraftSchema = z.infer<typeof gearItemDraftSchema>;

// =============================================================================
// Validation Helpers
// =============================================================================

/**
 * Validate form data and return typed result or errors
 */
export function validateGearItemForm(data: unknown): {
  success: boolean;
  data?: GearItemFormSchema;
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
  errors: z.ZodError<GearItemFormSchema> | undefined,
  field: keyof GearItemFormSchema
): string | undefined {
  if (!errors) return undefined;
  const fieldError = errors.issues.find((e) => e.path[0] === field);
  return fieldError?.message;
}
