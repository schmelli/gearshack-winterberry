/**
 * Legacy Data Adapter
 *
 * Feature: 010-firestore-sync
 * Purpose: Transform Flutter app Firestore data to/from web app TypeScript interfaces
 *
 * Key Responsibilities:
 * - Read: Transform Firestore documents (snake_case) to web app types (camelCase)
 * - Write: Transform web app types back to Flutter-compatible format (snake_case)
 * - Convert Firestore Timestamps to JavaScript Dates
 * - Apply category fallbacks for invalid values
 * - Preserve unknown fields for backward compatibility
 * - Graceful error handling with sensible defaults
 */

import { Timestamp } from 'firebase/firestore';
import type { GearItem } from '@/types/gear';
import type { Loadout, LoadoutItemState, ActivityType } from '@/types/loadout';
import {
  FirestoreGearItemSchema,
  FirestoreLoadoutSchema,
  CATEGORY_FALLBACK_MAP,
  DEFAULT_CATEGORY_ID,
} from '@/lib/validations/adapter';

// =============================================================================
// ID Validation
// =============================================================================

/**
 * Validates a Firestore document ID
 *
 * Valid IDs:
 * - Auto-generated: 20 alphanumeric characters
 * - Custom: Letters, numbers, hyphens, underscores (min 10 chars)
 *
 * Invalid IDs:
 * - Hex colors (#4CAF50)
 * - Empty strings
 * - Too short (<10 chars)
 * - Special characters (except - and _)
 */
export function isValidFirestoreId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  return /^[a-zA-Z0-9_-]{10,}$/.test(id);
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if a value is a Firestore Timestamp
 */
function isFirestoreTimestamp(value: unknown): value is Timestamp {
  return value instanceof Timestamp;
}

/**
 * Type guard to check if a value is a Date
 */
function isDate(value: unknown): value is Date {
  return value instanceof Date;
}

// =============================================================================
// Helper: Field Resolution (snake_case or camelCase)
// =============================================================================

/**
 * Resolves a field value from either snake_case or camelCase format
 * Prioritizes camelCase (web format) over snake_case (Flutter format)
 *
 * @example
 * resolveField(doc, 'weightGrams', 'weight') // Returns weightGrams if exists, else weight
 */
function resolveField<T>(
  doc: Record<string, unknown>,
  camelField: string,
  snakeField: string,
  defaultValue: T
): T;
function resolveField<T>(
  doc: Record<string, unknown>,
  camelField: string,
  snakeField: string
): T | undefined;
function resolveField<T>(
  doc: Record<string, unknown>,
  camelField: string,
  snakeField: string,
  defaultValue?: T
): T | undefined {
  const camelValue = doc[camelField];
  const snakeValue = doc[snakeField];

  // Prioritize camelCase (web format)
  if (camelValue !== undefined && camelValue !== null) {
    return camelValue as T;
  }

  if (snakeValue !== undefined && snakeValue !== null) {
    return snakeValue as T;
  }

  return defaultValue;
}

// =============================================================================
// Helper: Timestamp Conversion
// =============================================================================

/**
 * Converts a Firestore Timestamp or ISO string to JavaScript Date
 * Returns null for invalid or missing values
 */
function timestampToDate(value: unknown): Date | null {
  if (!value) return null;

  if (isFirestoreTimestamp(value)) {
    return value.toDate();
  }

  if (isDate(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

/**
 * Converts a JavaScript Date to Firestore Timestamp
 * Returns current timestamp for invalid dates
 */
function dateToTimestamp(date: Date | null | undefined): Timestamp {
  if (!date || !isDate(date)) {
    return Timestamp.now();
  }
  return Timestamp.fromDate(date);
}

// =============================================================================
// Helper: Category Validation
// =============================================================================

/**
 * Validates and normalizes category ID
 * Applies fallback mapping for legacy/invalid values
 */
function normalizeCategoryId(categoryId: unknown): string {
  if (typeof categoryId !== 'string' || !categoryId) {
    return DEFAULT_CATEGORY_ID;
  }

  // Check if category is in fallback map
  const normalized = CATEGORY_FALLBACK_MAP[categoryId.toLowerCase()];
  if (normalized) {
    return normalized;
  }

  return categoryId;
}

// =============================================================================
// GearItem Adapter: Firestore → Web App
// =============================================================================

/**
 * Transforms a Firestore GearItem document to web app GearItem interface
 *
 * @param doc - Raw Firestore document data (unknown type for safety)
 * @param id - Document ID from Firestore
 * @returns Validated GearItem with sensible defaults
 *
 * Features:
 * - Validates with Zod schema (graceful error handling)
 * - Converts snake_case → camelCase
 * - Transforms Firestore Timestamps → JavaScript Dates
 * - Applies category fallbacks
 * - Preserves unknown fields in original document
 *
 * @example
 * const gearItem = adaptGearItem(docSnapshot.data(), docSnapshot.id);
 */
export function adaptGearItem(doc: unknown, id: string): GearItem {
  // T010: Debug logging for raw legacy document
  console.log('RAW LEGACY DOC:', id, doc);

  // Validate with Zod (safeParse for graceful error handling)
  const result = FirestoreGearItemSchema.safeParse(doc);

  if (!result.success) {
    console.warn(`[Adapter] Invalid GearItem document ${id}:`, result.error);
    // Return minimal valid GearItem with defaults
    // FR-003: Use "Unnamed Gear" instead of "Untitled Item"
    return {
      id,
      name: 'Unnamed Gear',
      brand: null,
      brandUrl: null,
      modelNumber: null,
      productUrl: null,
      categoryId: DEFAULT_CATEGORY_ID,
      subcategoryId: null,
      productTypeId: null,
      weightGrams: null,
      weightDisplayUnit: 'g',
      lengthCm: null,
      widthCm: null,
      heightCm: null,
      pricePaid: null,
      currency: null,
      purchaseDate: null,
      retailer: null,
      retailerUrl: null,
      primaryImageUrl: null,
      galleryImageUrls: [],
      condition: 'used',
      status: 'active',
      notes: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const validated = result.data;

  // Resolve fields with snake_case/camelCase duality
  const weightGrams =
    resolveField<number>(
      validated as Record<string, unknown>,
      'weightGrams',
      'weight'
    ) ?? null;

  const categoryId = normalizeCategoryId(
    resolveField(validated as Record<string, unknown>, 'categoryId', 'category')
  );

  const purchaseDate = timestampToDate(
    resolveField(
      validated as Record<string, unknown>,
      'purchaseDate',
      'purchase_date'
    )
  );

  const primaryImageUrl =
    resolveField<string>(
      validated as Record<string, unknown>,
      'primaryImageUrl',
      'primary_image'
    ) ?? null;

  const galleryImageUrls =
    resolveField<string[]>(
      validated as Record<string, unknown>,
      'galleryImageUrls',
      'gallery_images'
    ) ?? [];

  // T011: Resolve name from multiple possible fields (extended chain)
  // Check: name → title → productName/product_name → item_name → displayName → label
  const resolvedName =
    resolveField<string>(validated as Record<string, unknown>, 'name', 'title') ??
    resolveField<string>(validated as Record<string, unknown>, 'productName', 'product_name') ??
    resolveField<string>(validated as Record<string, unknown>, 'item_name', 'displayName') ??
    validated.label;

  // T012 & T013: Brand+model fallback logic
  const brand = resolveField<string>(validated as Record<string, unknown>, 'brand', 'brand');
  const model = resolveField<string>(validated as Record<string, unknown>, 'model', 'model');

  let finalName: string;

  // If we have brand + model but no name, use "{brand} {model}"
  if (!resolvedName && brand && model) {
    finalName = `${brand} ${model}`;
  }
  // If we have brand but no name, use "{brand} Item"
  else if (!resolvedName && brand) {
    finalName = `${brand} Item`;
  }
  // Final fallback
  else {
    finalName = resolvedName?.trim() || 'Unnamed Gear';
  }

  // Build GearItem with all field mappings
  return {
    id,
    name: finalName,
    brand: validated.brand ?? null,
    brandUrl:
      resolveField(
        validated as Record<string, unknown>,
        'brandUrl',
        'brand_url'
      ) ?? null,
    modelNumber:
      resolveField(
        validated as Record<string, unknown>,
        'modelNumber',
        'model_number'
      ) ?? null,
    productUrl:
      resolveField(
        validated as Record<string, unknown>,
        'productUrl',
        'product_url'
      ) ?? null,
    categoryId,
    subcategoryId:
      resolveField(
        validated as Record<string, unknown>,
        'subcategoryId',
        'subcategory'
      ) ?? null,
    productTypeId:
      resolveField(
        validated as Record<string, unknown>,
        'productTypeId',
        'product_type'
      ) ?? null,
    weightGrams,
    weightDisplayUnit:
      resolveField(
        validated as Record<string, unknown>,
        'weightDisplayUnit',
        'weight_unit'
      ) ?? 'g',
    lengthCm:
      resolveField(
        validated as Record<string, unknown>,
        'lengthCm',
        'length'
      ) ?? null,
    widthCm:
      resolveField(validated as Record<string, unknown>, 'widthCm', 'width') ??
      null,
    heightCm:
      resolveField(
        validated as Record<string, unknown>,
        'heightCm',
        'height'
      ) ?? null,
    pricePaid:
      resolveField(
        validated as Record<string, unknown>,
        'pricePaid',
        'price'
      ) ?? null,
    currency: validated.currency ?? null,
    purchaseDate,
    retailer: validated.retailer ?? null,
    retailerUrl:
      resolveField(
        validated as Record<string, unknown>,
        'retailerUrl',
        'retailer_url'
      ) ?? null,
    primaryImageUrl,
    galleryImageUrls,
    condition: validated.condition ?? 'used',
    status: validated.status ?? 'active',
    notes: validated.notes ?? null,
    createdAt:
      timestampToDate(
        resolveField(
          validated as Record<string, unknown>,
          'createdAt',
          'created_at'
        )
      ) ?? new Date(),
    updatedAt:
      timestampToDate(
        resolveField(
          validated as Record<string, unknown>,
          'updatedAt',
          'updated_at'
        )
      ) ?? new Date(),
  };
}

// =============================================================================
// Loadout Adapter: Firestore → Web App
// =============================================================================

/**
 * Transforms a Firestore Loadout document to web app Loadout interface
 *
 * @param doc - Raw Firestore document data (unknown type for safety)
 * @param id - Document ID from Firestore
 * @returns Validated Loadout with sensible defaults
 *
 * Features:
 * - Validates with Zod schema (graceful error handling)
 * - Converts snake_case → camelCase
 * - Transforms Firestore Timestamps → JavaScript Dates
 * - Preserves unknown fields in original document
 *
 * @example
 * const loadout = adaptLoadout(docSnapshot.data(), docSnapshot.id);
 */
export function adaptLoadout(doc: unknown, id: string): Loadout | null {
  // FR-001: Validate Firestore document ID
  if (!isValidFirestoreId(id)) {
    console.warn(`[Adapter] Invalid Loadout ID skipped: ${id}`);
    return null;
  }

  // Validate with Zod (safeParse for graceful error handling)
  const result = FirestoreLoadoutSchema.safeParse(doc);

  if (!result.success) {
    console.warn(`[Adapter] Invalid Loadout document ${id}:`, result.error);
    // Return minimal valid Loadout with defaults
    return {
      id,
      name: 'Untitled Loadout',
      description: null,
      tripDate: null,
      itemIds: [],
      activityTypes: [],
      seasons: [],
      itemStates: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  const validated = result.data;

  // Resolve fields with snake_case/camelCase duality
  const tripDate = timestampToDate(
    resolveField(validated as Record<string, unknown>, 'tripDate', 'trip_date')
  );

  const itemIds =
    resolveField<string[]>(
      validated as Record<string, unknown>,
      'itemIds',
      'item_ids'
    ) ?? [];

  const activityTypes =
    (resolveField<ActivityType[]>(
      validated as Record<string, unknown>,
      'activityTypes',
      'activity_types'
    ) ?? []) as ActivityType[];

  const itemStates =
    (resolveField<LoadoutItemState[]>(
      validated as Record<string, unknown>,
      'itemStates',
      'item_states'
    ) ?? []) as LoadoutItemState[];

  // Build Loadout with all field mappings
  return {
    id,
    name: validated.name,
    description: validated.description ?? null,
    tripDate,
    itemIds,
    activityTypes,
    seasons: validated.seasons ?? [],
    itemStates,
    createdAt:
      timestampToDate(
        resolveField(
          validated as Record<string, unknown>,
          'createdAt',
          'created_at'
        )
      ) ?? new Date(),
    updatedAt:
      timestampToDate(
        resolveField(
          validated as Record<string, unknown>,
          'updatedAt',
          'updated_at'
        )
      ) ?? new Date(),
  };
}

// =============================================================================
// GearItem Adapter: Web App → Firestore
// =============================================================================

/**
 * Prepares a GearItem for writing to Firestore (web → Flutter format)
 *
 * @param item - GearItem from web app
 * @returns Firestore-compatible document (snake_case fields, Timestamps)
 *
 * Features:
 * - Converts camelCase → snake_case
 * - Transforms JavaScript Dates → Firestore Timestamps
 * - Strips the `id` field (document ID is separate in Firestore)
 * - Preserves all fields for Flutter app compatibility
 *
 * @example
 * await setDoc(docRef, prepareGearItemForFirestore(gearItem));
 */
export function prepareGearItemForFirestore(
  item: GearItem
): Record<string, unknown> {
  return {
    // Required fields
    name: item.name,

    // General Info
    brand: item.brand,
    brand_url: item.brandUrl,
    model_number: item.modelNumber,
    product_url: item.productUrl,

    // Classification
    category: item.categoryId,
    subcategory: item.subcategoryId,
    product_type: item.productTypeId,

    // Weight and Dimensions
    weight: item.weightGrams,
    weight_unit: item.weightDisplayUnit,
    length: item.lengthCm,
    width: item.widthCm,
    height: item.heightCm,

    // Purchase Details
    price: item.pricePaid,
    currency: item.currency,
    purchase_date: item.purchaseDate ? dateToTimestamp(item.purchaseDate) : null,
    retailer: item.retailer,
    retailer_url: item.retailerUrl,

    // Media
    primary_image: item.primaryImageUrl,
    gallery_images: item.galleryImageUrls,

    // Status and Condition
    condition: item.condition,
    status: item.status,
    notes: item.notes,

    // Timestamps
    created_at: dateToTimestamp(item.createdAt),
    updated_at: dateToTimestamp(item.updatedAt),
  };
}

// =============================================================================
// Loadout Adapter: Web App → Firestore
// =============================================================================

/**
 * Prepares a Loadout for writing to Firestore (web → Flutter format)
 *
 * @param loadout - Loadout from web app
 * @returns Firestore-compatible document (snake_case fields, Timestamps)
 *
 * Features:
 * - Converts camelCase → snake_case
 * - Transforms JavaScript Dates → Firestore Timestamps
 * - Strips the `id` field (document ID is separate in Firestore)
 * - Preserves all fields for Flutter app compatibility
 *
 * @example
 * await setDoc(docRef, prepareLoadoutForFirestore(loadout));
 */
export function prepareLoadoutForFirestore(
  loadout: Loadout
): Record<string, unknown> {
  return {
    // Required fields
    name: loadout.name,

    // Optional metadata
    description: loadout.description,
    trip_date: loadout.tripDate ? dateToTimestamp(loadout.tripDate) : null,

    // Item references
    item_ids: loadout.itemIds,

    // Classifications
    activity_types: loadout.activityTypes ?? [],
    seasons: loadout.seasons ?? [],

    // Item states
    item_states: loadout.itemStates,

    // Timestamps
    created_at: dateToTimestamp(loadout.createdAt),
    updated_at: dateToTimestamp(loadout.updatedAt),
  };
}
