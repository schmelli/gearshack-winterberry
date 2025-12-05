/**
 * Legacy Data Adapter Validation Schemas
 *
 * Feature: 010-firestore-sync
 * Purpose: Zod schemas for validating and transforming legacy Flutter app Firestore data
 *
 * Key Responsibilities:
 * - Validate incoming Firestore documents from legacy Flutter app
 * - Transform snake_case fields to camelCase
 * - Convert Firestore Timestamps to JavaScript Dates
 * - Provide graceful fallbacks for invalid enum values
 * - Map legacy category names to valid category IDs
 */

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// =============================================================================
// Helper: Firestore Timestamp Transformer
// =============================================================================

/**
 * Transforms Firestore Timestamp to JavaScript Date
 * Handles:
 * - Firestore Timestamp objects (from Firebase SDK)
 * - ISO 8601 datetime strings
 * - JavaScript Date objects
 */
export const FirestoreTimestampSchema = z.union([
  z.instanceof(Timestamp).transform((ts) => ts.toDate()),
  z.string().datetime().transform((str) => new Date(str)),
  z.date(),
]);

/**
 * Optional Firestore Timestamp (nullable)
 * Returns null for undefined or null values
 */
const OptionalTimestampSchema = z.union([
  FirestoreTimestampSchema,
  z.null(),
  z.undefined(),
]).transform((val) => val ?? null);

// =============================================================================
// Enum Validators with Graceful Fallbacks
// =============================================================================

/**
 * Weight unit with fallback to 'g' (grams)
 * Matches GearItem.weightDisplayUnit type
 */
const WeightUnitSchema = z.enum(['g', 'oz', 'lb']).catch('g');

/**
 * Gear condition with fallback to 'used'
 * Matches GearItem.condition type
 */
const GearConditionSchema = z.enum(['new', 'used', 'worn']).catch('used');

/**
 * Gear status with fallback to 'active'
 * Matches GearItem.status type
 */
const GearStatusSchema = z.enum(['active', 'wishlist', 'sold']).catch('active');

/**
 * Activity type for loadout classification
 * Matches Loadout.activityTypes type
 */
const ActivityTypeSchema = z.enum([
  'hiking',
  'camping',
  'climbing',
  'skiing',
  'backpacking',
]);

/**
 * Season classification for loadouts
 * Matches Loadout.seasons type
 */
const SeasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);

// =============================================================================
// Category Fallback Mapping
// =============================================================================

/**
 * Maps legacy/invalid category values to valid category IDs
 * Used when Flutter app categories don't match web app taxonomy
 *
 * Example:
 * - Flutter app may have 'misc' but web expects 'miscellaneous'
 * - Handles empty strings and unknown values
 */
export const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  // Common legacy mappings
  'misc': 'miscellaneous',
  'other': 'miscellaneous',
  'unknown': 'miscellaneous',
  '': 'miscellaneous',
};

/**
 * Default category ID when no valid category is provided
 * Ensures gear items always have a valid category
 */
export const DEFAULT_CATEGORY_ID = 'miscellaneous';

// =============================================================================
// Firestore GearItem Schema (Legacy Flutter Format)
// =============================================================================

/**
 * Validates and transforms legacy Flutter GearItem documents
 *
 * Field Mapping (Flutter → Web):
 * - weight → weightGrams
 * - weight_unit → weightDisplayUnit
 * - category → categoryId
 * - created_at → createdAt
 * - updated_at → updatedAt
 * - primary_image → primaryImageUrl
 * - gallery_images → galleryImageUrls
 * - brand_url → brandUrl
 * - model_number → modelNumber
 * - product_url → productUrl
 * - product_type → productTypeId
 * - purchase_date → purchaseDate
 * - retailer_url → retailerUrl
 * - length → lengthCm
 * - width → widthCm
 * - height → heightCm
 * - price → pricePaid
 *
 * Supports both snake_case (Flutter) and camelCase (Web) field names
 * for backwards compatibility during migration period.
 */
export const FirestoreGearItemSchema = z.object({
  // Name fields (any can contain the item name, resolved in adapter)
  name: z.string().optional(),
  title: z.string().optional(),
  item_name: z.string().optional(),
  displayName: z.string().optional(),
  productName: z.string().optional(),
  product_name: z.string().optional(),
  label: z.string().optional(),

  // General Info (optional fields with dual format support)
  brand: z.string().nullable().optional(),
  brand_url: z.string().nullable().optional(),
  brandUrl: z.string().nullable().optional(),
  model: z.string().nullable().optional(),
  model_number: z.string().nullable().optional(),
  modelNumber: z.string().nullable().optional(),
  product_url: z.string().nullable().optional(),
  productUrl: z.string().nullable().optional(),

  // Classification
  category: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  product_type: z.string().nullable().optional(),
  productTypeId: z.string().nullable().optional(),

  // Weight and Dimensions
  weight: z.number().nonnegative().nullable().optional(),
  weightGrams: z.number().nonnegative().nullable().optional(),
  weight_unit: WeightUnitSchema.optional(),
  weightDisplayUnit: WeightUnitSchema.optional(),
  length: z.number().nonnegative().nullable().optional(),
  lengthCm: z.number().nonnegative().nullable().optional(),
  width: z.number().nonnegative().nullable().optional(),
  widthCm: z.number().nonnegative().nullable().optional(),
  height: z.number().nonnegative().nullable().optional(),
  heightCm: z.number().nonnegative().nullable().optional(),

  // Purchase Details
  price: z.number().nonnegative().nullable().optional(),
  pricePaid: z.number().nonnegative().nullable().optional(),
  currency: z.string().nullable().optional(),
  purchase_date: OptionalTimestampSchema.optional(),
  purchaseDate: OptionalTimestampSchema.optional(),
  retailer: z.string().nullable().optional(),
  retailer_url: z.string().nullable().optional(),
  retailerUrl: z.string().nullable().optional(),

  // Media
  primary_image: z.string().nullable().optional(),
  primaryImageUrl: z.string().nullable().optional(),
  gallery_images: z.array(z.string()).optional(),
  galleryImageUrls: z.array(z.string()).optional(),

  // Status and Condition
  condition: GearConditionSchema.optional(),
  status: GearStatusSchema.optional(),
  notes: z.string().nullable().optional(),

  // Timestamps
  created_at: FirestoreTimestampSchema.optional(),
  createdAt: FirestoreTimestampSchema.optional(),
  updated_at: FirestoreTimestampSchema.optional(),
  updatedAt: FirestoreTimestampSchema.optional(),
}).passthrough(); // Preserve unknown fields for future compatibility

/**
 * TypeScript type for Firestore GearItem input
 * Represents raw data from Firestore before validation
 */
export type FirestoreGearItem = z.input<typeof FirestoreGearItemSchema>;

// =============================================================================
// Firestore Loadout Schema (Legacy Flutter Format)
// =============================================================================

/**
 * Per-item state within a loadout
 * Determines whether item contributes to Base Weight calculation
 */
const LoadoutItemStateSchema = z.object({
  itemId: z.string(),
  isWorn: z.boolean().default(false),
  isConsumable: z.boolean().default(false),
});

/**
 * Validates and transforms legacy Flutter Loadout documents
 *
 * Field Mapping (Flutter → Web):
 * - trip_date → tripDate
 * - item_ids → itemIds
 * - activity_types → activityTypes
 * - item_states → itemStates
 * - created_at → createdAt
 * - updated_at → updatedAt
 *
 * Supports both snake_case (Flutter) and camelCase (Web) field names
 * for backwards compatibility during migration period.
 */
export const FirestoreLoadoutSchema = z.object({
  // Required fields
  name: z.string().min(1),

  // Optional metadata
  description: z.string().nullable().optional(),
  trip_date: OptionalTimestampSchema.optional(),
  tripDate: OptionalTimestampSchema.optional(),

  // Item references
  item_ids: z.array(z.string()).optional(),
  itemIds: z.array(z.string()).optional(),

  // Classifications
  activity_types: z.array(ActivityTypeSchema).optional(),
  activityTypes: z.array(ActivityTypeSchema).optional(),
  seasons: z.array(SeasonSchema).optional(),

  // Item states (worn/consumable tracking)
  item_states: z.array(LoadoutItemStateSchema).optional(),
  itemStates: z.array(LoadoutItemStateSchema).optional(),

  // Timestamps
  created_at: FirestoreTimestampSchema.optional(),
  createdAt: FirestoreTimestampSchema.optional(),
  updated_at: FirestoreTimestampSchema.optional(),
  updatedAt: FirestoreTimestampSchema.optional(),
}).passthrough(); // Preserve unknown fields for future compatibility

/**
 * TypeScript type for Firestore Loadout input
 * Represents raw data from Firestore before validation
 */
export type FirestoreLoadout = z.input<typeof FirestoreLoadoutSchema>;

// =============================================================================
// Validation Helper Functions
// =============================================================================

/**
 * Validates a raw Firestore GearItem document
 *
 * @param doc - Unknown document data from Firestore
 * @returns Validated and typed GearItem data
 * @throws ZodError if validation fails
 *
 * Usage:
 * ```typescript
 * const rawDoc = await getDoc(gearItemRef);
 * const validated = validateGearItem(rawDoc.data());
 * ```
 */
export function validateGearItem(doc: unknown) {
  return FirestoreGearItemSchema.parse(doc);
}

/**
 * Validates a raw Firestore Loadout document
 *
 * @param doc - Unknown document data from Firestore
 * @returns Validated and typed Loadout data
 * @throws ZodError if validation fails
 *
 * Usage:
 * ```typescript
 * const rawDoc = await getDoc(loadoutRef);
 * const validated = validateLoadout(rawDoc.data());
 * ```
 */
export function validateLoadout(doc: unknown) {
  return FirestoreLoadoutSchema.parse(doc);
}
