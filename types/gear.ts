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

export type GearStatus = 'active' | 'wishlist' | 'sold';

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
  active: 'Active',
  wishlist: 'Wishlist',
  sold: 'Sold',
};

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
  brandUrl: string | null;
  modelNumber: string | null;
  productUrl: string | null;

  // Section 2: Classification (from GearGraph Ontology)
  categoryId: string | null;
  subcategoryId: string | null;
  productTypeId: string | null;

  // Section 3: Weight & Specifications
  weightGrams: number | null;
  weightDisplayUnit: WeightUnit;
  lengthCm: number | null;
  widthCm: number | null;
  heightCm: number | null;

  // Section 4: Purchase Details
  pricePaid: number | null;
  currency: string | null;
  purchaseDate: Date | null;
  retailer: string | null;
  retailerUrl: string | null;

  // Section 5: Media
  primaryImageUrl: string | null;
  galleryImageUrls: string[];

  // Section 6: Status & Condition
  condition: GearCondition;
  status: GearStatus;
  notes: string | null;
}

// =============================================================================
// GearItemFormData (Form State)
// =============================================================================

export interface GearItemFormData {
  // Section 1: General Info
  name: string;
  brand: string;
  brandUrl: string;
  modelNumber: string;
  productUrl: string;

  // Section 2: Classification
  categoryId: string;
  subcategoryId: string;
  productTypeId: string;

  // Section 3: Weight & Specifications
  weightValue: string;
  weightDisplayUnit: WeightUnit;
  lengthCm: string;
  widthCm: string;
  heightCm: string;

  // Section 4: Purchase Details
  pricePaid: string;
  currency: string;
  purchaseDate: string;
  retailer: string;
  retailerUrl: string;

  // Section 5: Media
  primaryImageUrl: string;
  galleryImageUrls: string[];

  // Section 6: Status & Condition
  condition: GearCondition;
  status: GearStatus;
  notes: string;
}

// =============================================================================
// Default Form Values
// =============================================================================

export const DEFAULT_GEAR_ITEM_FORM: GearItemFormData = {
  name: '',
  brand: '',
  brandUrl: '',
  modelNumber: '',
  productUrl: '',
  categoryId: '',
  subcategoryId: '',
  productTypeId: '',
  weightValue: '',
  weightDisplayUnit: 'g',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  pricePaid: '',
  currency: 'USD',
  purchaseDate: '',
  retailer: '',
  retailerUrl: '',
  primaryImageUrl: '',
  galleryImageUrls: [],
  condition: 'new',
  status: 'active',
  notes: '',
};
