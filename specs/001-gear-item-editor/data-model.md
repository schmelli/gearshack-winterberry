# Data Model: Gear Item Editor

**Feature**: 001-gear-item-editor
**Date**: 2025-12-04

## Overview

This document defines the TypeScript interfaces and types for the Gear Item Editor feature. All types will be implemented in `@/types/gear.ts` and `@/types/taxonomy.ts`.

## Core Types

### GearItem

The primary entity representing a piece of outdoor gear.

```typescript
// types/gear.ts

export interface GearItem {
  // Identity
  id: string;
  createdAt: Date;
  updatedAt: Date;

  // Section 1: General Info
  name: string;                    // Required
  brand: string | null;            // Brand name (free text or from taxonomy)
  brandUrl: string | null;         // URL to brand website
  modelNumber: string | null;      // Manufacturer model identifier
  productUrl: string | null;       // URL to product page

  // Section 2: Classification (from GearGraph Ontology)
  categoryId: string | null;       // Reference to GearCategory
  subcategoryId: string | null;    // Reference to GearSubcategory
  productTypeId: string | null;    // Reference to ProductType

  // Section 3: Weight & Specifications
  weightGrams: number | null;      // Canonical weight in grams
  weightDisplayUnit: WeightUnit;   // User preference for display
  lengthCm: number | null;         // Length in centimeters
  widthCm: number | null;          // Width in centimeters
  heightCm: number | null;         // Height in centimeters

  // Section 4: Purchase Details
  pricePaid: number | null;        // Purchase price
  currency: string | null;         // Currency code (USD, EUR, etc.)
  purchaseDate: Date | null;       // When acquired
  retailer: string | null;         // Store/retailer name
  retailerUrl: string | null;      // URL to purchase location

  // Section 5: Media
  primaryImageUrl: string | null;  // Main product image
  galleryImageUrls: string[];      // Additional images

  // Section 6: Status & Condition
  condition: GearCondition;        // Physical state
  status: GearStatus;              // Ownership state
  notes: string | null;            // Free-text notes
}
```

### Enumerations

```typescript
// types/gear.ts

export type WeightUnit = 'g' | 'oz' | 'lb';

export type GearCondition = 'new' | 'used' | 'worn';

export type GearStatus = 'active' | 'wishlist' | 'sold';

// Constants for UI labels
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
```

### Form Data Type

Separate type for form state (some fields differ from storage type):

```typescript
// types/gear.ts

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
  weightValue: string;             // String for form input
  weightDisplayUnit: WeightUnit;
  lengthCm: string;
  widthCm: string;
  heightCm: string;

  // Section 4: Purchase Details
  pricePaid: string;               // String for form input
  currency: string;
  purchaseDate: string;            // ISO date string for form
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
```

### Default Values

```typescript
// types/gear.ts

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
```

## Taxonomy Types

### Category Hierarchy

```typescript
// types/taxonomy.ts

export interface ProductType {
  id: string;
  label: string;
}

export interface GearSubcategory {
  id: string;
  label: string;
  productTypes: ProductType[];
}

export interface GearCategory {
  id: string;
  label: string;
  subcategories: GearSubcategory[];
}

export interface OutdoorBrand {
  id: string;
  name: string;
  url: string | null;
}

export interface TaxonomyData {
  categories: GearCategory[];
  brands: OutdoorBrand[];
}
```

### Taxonomy Utilities

```typescript
// lib/taxonomy/taxonomy-utils.ts

import type { GearCategory, GearSubcategory, ProductType, TaxonomyData } from '@/types/taxonomy';
import taxonomyData from './taxonomy-data.json';

export function getTaxonomyData(): TaxonomyData {
  return taxonomyData as TaxonomyData;
}

export function getCategories(): GearCategory[] {
  return getTaxonomyData().categories;
}

export function getSubcategoriesForCategory(categoryId: string | null): GearSubcategory[] {
  if (!categoryId) return [];
  const category = getCategories().find(c => c.id === categoryId);
  return category?.subcategories ?? [];
}

export function getProductTypesForSubcategory(
  categoryId: string | null,
  subcategoryId: string | null
): ProductType[] {
  if (!categoryId || !subcategoryId) return [];
  const subcategories = getSubcategoriesForCategory(categoryId);
  const subcategory = subcategories.find(s => s.id === subcategoryId);
  return subcategory?.productTypes ?? [];
}

export function getCategoryLabel(categoryId: string | null): string | null {
  if (!categoryId) return null;
  return getCategories().find(c => c.id === categoryId)?.label ?? null;
}

export function getSubcategoryLabel(
  categoryId: string | null,
  subcategoryId: string | null
): string | null {
  if (!categoryId || !subcategoryId) return null;
  return getSubcategoriesForCategory(categoryId)
    .find(s => s.id === subcategoryId)?.label ?? null;
}

export function getProductTypeLabel(
  categoryId: string | null,
  subcategoryId: string | null,
  productTypeId: string | null
): string | null {
  if (!categoryId || !subcategoryId || !productTypeId) return null;
  return getProductTypesForSubcategory(categoryId, subcategoryId)
    .find(p => p.id === productTypeId)?.label ?? null;
}
```

## Conversion Functions

### Form ↔ Entity Conversion

```typescript
// lib/gear-utils.ts

import type { GearItem, GearItemFormData, WeightUnit } from '@/types/gear';

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;

export function gramsToDisplayUnit(grams: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz': return grams / GRAMS_PER_OZ;
    case 'lb': return grams / GRAMS_PER_LB;
    default: return grams;
  }
}

export function displayUnitToGrams(value: number, unit: WeightUnit): number {
  switch (unit) {
    case 'oz': return value * GRAMS_PER_OZ;
    case 'lb': return value * GRAMS_PER_LB;
    default: return value;
  }
}

export function gearItemToFormData(item: GearItem): GearItemFormData {
  const weightInDisplayUnit = item.weightGrams !== null
    ? gramsToDisplayUnit(item.weightGrams, item.weightDisplayUnit)
    : null;

  return {
    name: item.name,
    brand: item.brand ?? '',
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
  };
}

export function formDataToGearItem(
  formData: GearItemFormData,
  existingItem?: Partial<GearItem>
): Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'> {
  const weightValue = formData.weightValue ? parseFloat(formData.weightValue) : null;
  const weightGrams = weightValue !== null
    ? displayUnitToGrams(weightValue, formData.weightDisplayUnit)
    : null;

  return {
    name: formData.name,
    brand: formData.brand || null,
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
  };
}
```

## Entity Relationships

```
┌─────────────────┐
│    GearItem     │
├─────────────────┤
│ categoryId ─────┼──────► GearCategory
│ subcategoryId ──┼──────► GearSubcategory
│ productTypeId ──┼──────► ProductType
└─────────────────┘
         │
         │ Hierarchy
         ▼
┌─────────────────┐
│  GearCategory   │
├─────────────────┤
│ subcategories[] │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ GearSubcategory │
├─────────────────┤
│ productTypes[]  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   ProductType   │
└─────────────────┘
```

## Validation Rules

| Field | Rule | Error Message |
|-------|------|---------------|
| name | Required, non-empty | "Name is required" |
| weightValue | Optional, if provided must be >= 0 | "Weight must be a positive number" |
| brandUrl | Optional, if provided must be valid URL | "Invalid URL format" |
| productUrl | Optional, if provided must be valid URL | "Invalid URL format" |
| retailerUrl | Optional, if provided must be valid URL | "Invalid URL format" |
| primaryImageUrl | Optional, if provided must be valid URL | "Invalid URL format" |
| galleryImageUrls | Array of valid URLs | "Invalid URL format" |
| pricePaid | Optional, if provided must be >= 0 | "Price must be a positive number" |
| lengthCm, widthCm, heightCm | Optional, if provided must be > 0 | "Dimension must be a positive number" |

See `contracts/gear-item.schema.ts` for complete Zod validation schemas.
