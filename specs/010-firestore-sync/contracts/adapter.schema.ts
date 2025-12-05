/**
 * Legacy Data Adapter Schema
 *
 * Feature: 010-firestore-sync
 * Zod schemas for validating and transforming legacy Flutter app data
 */

import { z } from 'zod';
import { Timestamp } from 'firebase/firestore';

// =============================================================================
// Helper: Firestore Timestamp Transformer
// =============================================================================

/**
 * Transforms Firestore Timestamp to JavaScript Date
 * Handles both Timestamp objects and ISO strings
 */
const FirestoreTimestampSchema = z.union([
  z.instanceof(Timestamp).transform((ts) => ts.toDate()),
  z.string().datetime().transform((str) => new Date(str)),
  z.date(),
]);

/**
 * Optional Firestore Timestamp (nullable)
 */
const OptionalTimestampSchema = z.union([
  FirestoreTimestampSchema,
  z.null(),
  z.undefined(),
]).transform((val) => val ?? null);

// =============================================================================
// Enum Validators with Fallbacks
// =============================================================================

const WeightUnitSchema = z.enum(['g', 'oz', 'lb']).catch('g');

const GearConditionSchema = z.enum(['new', 'used', 'worn']).catch('used');

const GearStatusSchema = z.enum(['active', 'wishlist', 'sold']).catch('active');

const ActivityTypeSchema = z.enum([
  'hiking', 'camping', 'climbing', 'skiing', 'backpacking'
]);

const SeasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);

// =============================================================================
// Firestore GearItem Schema (Legacy Flutter Format)
// =============================================================================

export const FirestoreGearItemSchema = z.object({
  // Required fields
  name: z.string().min(1),

  // Optional fields with snake_case mapping
  brand: z.string().nullable().optional(),
  brand_url: z.string().nullable().optional(),
  brandUrl: z.string().nullable().optional(), // Support both formats
  model_number: z.string().nullable().optional(),
  modelNumber: z.string().nullable().optional(),
  product_url: z.string().nullable().optional(),
  productUrl: z.string().nullable().optional(),

  // Category fields
  category: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  subcategory: z.string().nullable().optional(),
  subcategoryId: z.string().nullable().optional(),
  product_type: z.string().nullable().optional(),
  productTypeId: z.string().nullable().optional(),

  // Weight and dimensions
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

  // Purchase details
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

  // Status and condition
  condition: GearConditionSchema.optional(),
  status: GearStatusSchema.optional(),
  notes: z.string().nullable().optional(),

  // Timestamps
  created_at: FirestoreTimestampSchema.optional(),
  createdAt: FirestoreTimestampSchema.optional(),
  updated_at: FirestoreTimestampSchema.optional(),
  updatedAt: FirestoreTimestampSchema.optional(),
}).passthrough(); // Preserve unknown fields

export type FirestoreGearItem = z.input<typeof FirestoreGearItemSchema>;

// =============================================================================
// Firestore Loadout Schema (Legacy Flutter Format)
// =============================================================================

const LoadoutItemStateSchema = z.object({
  itemId: z.string(),
  isWorn: z.boolean().default(false),
  isConsumable: z.boolean().default(false),
});

export const FirestoreLoadoutSchema = z.object({
  // Required fields
  name: z.string().min(1),

  // Optional fields
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

  // Item states
  item_states: z.array(LoadoutItemStateSchema).optional(),
  itemStates: z.array(LoadoutItemStateSchema).optional(),

  // Timestamps
  created_at: FirestoreTimestampSchema.optional(),
  createdAt: FirestoreTimestampSchema.optional(),
  updated_at: FirestoreTimestampSchema.optional(),
  updatedAt: FirestoreTimestampSchema.optional(),
}).passthrough(); // Preserve unknown fields

export type FirestoreLoadout = z.input<typeof FirestoreLoadoutSchema>;

// =============================================================================
// Category Fallback Map
// =============================================================================

/**
 * Maps legacy/invalid category values to valid category IDs
 * Used when Flutter app categories don't match web app taxonomy
 */
export const CATEGORY_FALLBACK_MAP: Record<string, string> = {
  // Common legacy mappings
  'misc': 'miscellaneous',
  'other': 'miscellaneous',
  'unknown': 'miscellaneous',
  '': 'miscellaneous',
};

export const DEFAULT_CATEGORY_ID = 'miscellaneous';
