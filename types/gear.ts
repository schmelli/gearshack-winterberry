/**
 * Gear Item Types and Interfaces
 *
 * Feature: 001-gear-item-editor
 * Constitution: Types MUST be defined in @/types directory
 */

// =============================================================================
// Enumerations
// =============================================================================

export type WeightUnit = 'g' | 'oz' | 'lb';

export type GearCondition = 'new' | 'used' | 'worn';

// Note: 'active' renamed to 'own' for Supabase migration (040-supabase-migration, T018)
// Added 'lent' and 'retired' statuses for extended lifecycle
export type GearStatus = 'own' | 'wishlist' | 'sold' | 'lent' | 'retired';

// =============================================================================
// UI Labels for Enumerations
// =============================================================================

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  g: 'Grams (g)',
  oz: 'Ounces (oz)',
  lb: 'Pounds (lb)',
};

export const GEAR_CONDITION_LABELS: Record<GearCondition, string> = {
  new: 'New',
  used: 'Used',
  worn: 'Worn',
};

export const GEAR_STATUS_LABELS: Record<GearStatus, string> = {
  own: 'Own',
  wishlist: 'Wishlist',
  sold: 'Sold',
  lent: 'Lent',
  retired: 'Retired',
};

// =============================================================================
// Cloud Function Processed Images (Feature: 019-image-perfection)
// =============================================================================

/** Single processed image from Cloud Functions background removal */
export interface NobgImage {
  /** PNG URL (required) */
  png: string;
  /** WebP URL (optional, future optimization) */
  webp?: string;
}

/** Collection of processed images by size key */
export interface NobgImages {
  [size: string]: NobgImage;
}

// =============================================================================
// GearItem Entity (Storage/Domain Model)
// =============================================================================

export interface GearItem {
  // Identity
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Section 1: General Info
  name: string;
  brand: string | null;
  /** Product description for details, specifications, or notes */
  description: string | null;
  brandUrl: string | null;
  modelNumber: string | null;
  productUrl: string | null;

  // Section 2: Classification (from GearGraph Ontology)
  // Cascading Category Refactor: Store only productTypeId (level 3), derive parents client-side
  productTypeId: string | null;

  // Section 3: Weight & Specifications
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;
  // Category-specific specs
  size: string | null; // For clothing, footwear
  color: string | null; // For clothing, tents, etc.
  volumeLiters: number | null; // For packs, bags
  materials: string | null; // For tents, packs, sleeping bags
  tentConstruction: string | null; // For tents: freestanding, tunnel, dome, tarp, etc.

  // Section 4: Purchase Details
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  retailerUrl: string | null;
  /** Manufacturer's suggested retail price (MSRP) - Feature 057 */
  manufacturerPrice: number | null;
  /** Currency for manufacturer price - Feature 057 */
  manufacturerCurrency: string | null;

  // Section 5: Media
  primaryImageUrl: string | null;
  galleryImageUrls: string[];
  /** Processed images from Cloud Functions (background removed) */
  nobgImages?: NobgImages;

  // Section 6: Status & Condition
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
  /** Quantity owned (default 1) - supports items like stakes, batteries, etc. */
  quantity: number;
  /** Whether this item is marked as favourite - Feature 041 */
  isFavourite: boolean;
  /** Whether this item is available for sale - Feature 045 */
  isForSale: boolean;
  /** Whether this item can be borrowed by others - Feature 045 */
  canBeBorrowed: boolean;
  /** Whether this item can be traded - Feature 045 */
  canBeTraded: boolean;

  // Section 7: Merchant Source Attribution (Feature: 053-merchant-integration)
  /** Merchant ID if item was added from a merchant loadout */
  sourceMerchantId: string | null;
  /** Offer ID if item was added via a merchant offer */
  sourceOfferId: string | null;
  /** Loadout ID if item was added from a merchant loadout */
  sourceLoadoutId: string | null;

  // Section 8: VIP Source Attribution (Feature: 052-vip-loadouts)
  /** Attribution metadata for VIP curated items */
  sourceAttribution?: {
    /** Type of source (e.g., 'vip_curated', 'merchant') */
    type: string;
    /** Source URL (e.g., YouTube video link where VIP showed this gear) */
    url?: string;
    /** When the source was last checked/verified */
    checkedAt?: string;
  } | null;

  // Section 9: Dependencies (Feature: 037-gear-dependencies)
  /** IDs of gear items that typically go with this item (e.g., paddle with packraft) */
  dependencyIds: string[];
}

// =============================================================================
// GearItemFormData (Form State)
// =============================================================================

export interface GearItemFormData {
  // Section 1: General Info
  name: string;
  brand: string;
  /** Product description for details, specifications, or notes */
  description: string;
  brandUrl: string;
  modelNumber: string;
  productUrl: string;

  // Section 2: Classification (Cascading Category Refactor: only productTypeId)
  productTypeId: string;

  // Section 3: Weight & Specifications
  weightValue: string;
  weightDisplayUnit: WeightUnit;
  lengthCm: string;
  widthCm: string;
  heightCm: string;
  // Category-specific specs
  size: string; // For clothing, footwear
  color: string; // For clothing, tents, etc.
  volumeLiters: string; // For packs, bags
  materials: string; // For tents, packs, sleeping bags
  tentConstruction: string; // For tents: freestanding, tunnel, dome, tarp, etc.

  // Section 4: Purchase Details
  pricePaid: string;
  currency: string;
  purchaseDate: string;
  retailer: string;
  retailerUrl: string;
  /** Manufacturer's suggested retail price (MSRP) - Feature 057 */
  manufacturerPrice: string;
  /** Currency for manufacturer price - Feature 057 */
  manufacturerCurrency: string;

  // Section 5: Media
  primaryImageUrl: string;
  galleryImageUrls: string[];

  // Section 6: Status & Condition
  condition: GearCondition;
  status: GearStatus;
  notes: string;
  /** Quantity owned (default 1) - supports items like stakes, batteries, etc. */
  quantity: string;
  /** Whether this item is marked as favourite - Feature 041 */
  isFavourite: boolean;
  /** Whether this item is available for sale - Feature 045 */
  isForSale: boolean;
  /** Whether this item can be borrowed by others - Feature 045 */
  canBeBorrowed: boolean;
  /** Whether this item can be traded - Feature 045 */
  canBeTraded: boolean;

  // Section 7: Dependencies (Feature: 037-gear-dependencies)
  /** IDs of gear items that typically go with this item */
  dependencyIds: string[];
}

// =============================================================================
// Default Form Values
// =============================================================================

export const DEFAULT_GEAR_ITEM_FORM: GearItemFormData = {
  name: '',
  brand: '',
  description: '',
  brandUrl: '',
  modelNumber: '',
  productUrl: '',
  productTypeId: '',
  weightValue: '',
  weightDisplayUnit: 'g',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  size: '',
  color: '',
  volumeLiters: '',
  materials: '',
  tentConstruction: '',
  pricePaid: '',
  currency: 'USD',
  purchaseDate: '',
  retailer: '',
  retailerUrl: '',
  manufacturerPrice: '',
  manufacturerCurrency: 'EUR',
  primaryImageUrl: '',
  galleryImageUrls: [],
  condition: 'new',
  status: 'own',
  notes: '',
  quantity: '1',
  isFavourite: false,
  isForSale: false,
  canBeBorrowed: false,
  canBeTraded: false,
  dependencyIds: [],
};
