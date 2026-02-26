/**
 * Supabase Transformers Tests
 *
 * Tests for data transformation between camelCase (TypeScript)
 * and snake_case (PostgreSQL) formats.
 */

import { describe, it, expect } from 'vitest';
import {
  gearItemFromDb,
  gearItemToDbInsert,
  gearItemToDbUpdate,
  categoryFromDb,
} from '@/lib/supabase/transformers';
import type { GearItem } from '@/types/gear';
import type { Tables } from '@/types/database';

// =============================================================================
// Test Constants
// =============================================================================

const validUUID = '550e8400-e29b-41d4-a716-446655440000';
const userId = 'user-550e8400-e29b-41d4-a716-446655440001';

// Complete database row for gear item
const mockGearItemRow: Tables<'gear_items'> = {
  id: validUUID,
  user_id: userId,
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-06-15T14:45:00Z',

  // General Info
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  description: 'Ultralight 2-person backpacking tent',
  brand_url: 'https://bigagnes.com',
  model_number: 'TLCS2HV23',
  product_url: 'https://bigagnes.com/copper-spur',

  // Classification
  product_type_id: 'shelter-tents-backpacking',

  // Weight & Specifications
  weight_grams: 1020,
  weight_display_unit: 'g',
  length_cm: 218,
  width_cm: 127,
  height_cm: 99,
  size: '2-person',
  color: 'Olive Green',
  volume_liters: null,
  materials: 'Solution-dyed ripstop nylon',
  tent_construction: 'Semi-freestanding',

  // Purchase Details
  price_paid: 449.95,
  currency: 'USD',
  purchase_date: '2023-06-15',
  retailer: 'REI',
  retailer_url: 'https://rei.com',

  // Media
  primary_image_url: 'https://res.cloudinary.com/test/tent.jpg',
  gallery_image_urls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
  nobg_images: { medium: { png: 'https://example.com/nobg.png' } },

  // Status & Condition
  condition: 'new',
  status: 'own',
  notes: 'Great for PCT thru-hike',
  is_favourite: true,
  is_for_sale: false,
  can_be_borrowed: true,
  can_be_traded: false,

  // Dependencies
  dependency_ids: ['dep-1', 'dep-2'],
};

// Complete GearItem for insert testing
const mockGearItemForInsert: Omit<GearItem, 'id' | 'createdAt' | 'updatedAt'> = {
  name: 'MSR PocketRocket Deluxe',
  brand: 'MSR',
  description: 'Ultralight backpacking stove',
  brandUrl: 'https://msrgear.com',
  modelNumber: 'PRD-001',
  productUrl: 'https://msrgear.com/pocketrocket',
  productTypeId: 'cooking-stoves',
  weightGrams: 83,
  weightDisplayUnit: 'g',
  lengthCm: 10,
  widthCm: 5,
  heightCm: 5,
  size: null,
  color: 'Red',
  volumeLiters: null,
  materials: 'Stainless steel',
  tentConstruction: null,
  pricePaid: 49.95,
  currency: 'USD',
  purchaseDate: new Date('2024-01-15'),
  retailer: 'REI',
  retailerUrl: 'https://rei.com',
  primaryImageUrl: 'https://example.com/stove.jpg',
  galleryImageUrls: [],
  nobgImages: {},
  condition: 'new',
  status: 'own',
  notes: 'Perfect for ultralight trips',
  quantity: 1,
  isFavourite: false,
  isForSale: false,
  canBeBorrowed: false,
  canBeTraded: false,
  dependencyIds: [],
};

// =============================================================================
// gearItemFromDb Tests
// =============================================================================

describe('gearItemFromDb', () => {
  describe('Basic Transformation', () => {
    it('should transform complete database row to GearItem', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.id).toBe(validUUID);
      expect(item.name).toBe('Big Agnes Copper Spur HV UL2');
      expect(item.brand).toBe('Big Agnes');
    });

    it('should convert snake_case to camelCase fields', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.brandUrl).toBe('https://bigagnes.com');
      expect(item.modelNumber).toBe('TLCS2HV23');
      expect(item.productUrl).toBe('https://bigagnes.com/copper-spur');
      expect(item.productTypeId).toBe('shelter-tents-backpacking');
    });
  });

  describe('Date Transformations', () => {
    it('should convert created_at to Date object', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.createdAt).toBeInstanceOf(Date);
      expect(item.createdAt.toISOString()).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should convert updated_at to Date object', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.updatedAt).toBeInstanceOf(Date);
      expect(item.updatedAt.toISOString()).toBe('2024-06-15T14:45:00.000Z');
    });

    it('should convert purchase_date to Date object', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.purchaseDate).toBeInstanceOf(Date);
      expect(item.purchaseDate?.toISOString().split('T')[0]).toBe('2023-06-15');
    });

    it('should handle null purchase_date', () => {
      const rowWithoutPurchaseDate = { ...mockGearItemRow, purchase_date: null };
      const item = gearItemFromDb(rowWithoutPurchaseDate);

      expect(item.purchaseDate).toBeNull();
    });
  });

  describe('Numeric Conversions', () => {
    it('should convert weight_grams to number', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.weightGrams).toBe(1020);
      expect(typeof item.weightGrams).toBe('number');
    });

    it('should convert dimensions to numbers', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.lengthCm).toBe(218);
      expect(item.widthCm).toBe(127);
      expect(item.heightCm).toBe(99);
    });

    it('should convert price_paid to number', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.pricePaid).toBe(449.95);
      expect(typeof item.pricePaid).toBe('number');
    });

    it('should handle null numeric fields', () => {
      const rowWithNulls = {
        ...mockGearItemRow,
        weight_grams: null,
        length_cm: null,
        price_paid: null,
        volume_liters: null,
      };
      const item = gearItemFromDb(rowWithNulls);

      expect(item.weightGrams).toBeNull();
      expect(item.lengthCm).toBeNull();
      expect(item.pricePaid).toBeNull();
      expect(item.volumeLiters).toBeNull();
    });
  });

  describe('Array Fields', () => {
    it('should preserve gallery_image_urls array', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.galleryImageUrls).toEqual([
        'https://example.com/img1.jpg',
        'https://example.com/img2.jpg',
      ]);
    });

    it('should default to empty array when gallery_image_urls is null', () => {
      const rowWithNullGallery = { ...mockGearItemRow, gallery_image_urls: null };
      const item = gearItemFromDb(rowWithNullGallery);

      expect(item.galleryImageUrls).toEqual([]);
    });

    it('should preserve dependency_ids array', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.dependencyIds).toEqual(['dep-1', 'dep-2']);
    });

    it('should default to empty array when dependency_ids is null', () => {
      const rowWithNullDeps = { ...mockGearItemRow, dependency_ids: null };
      const item = gearItemFromDb(rowWithNullDeps);

      expect(item.dependencyIds).toEqual([]);
    });
  });

  describe('JSON Fields', () => {
    it('should transform nobg_images JSON', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.nobgImages).toEqual({ medium: { png: 'https://example.com/nobg.png' } });
    });

    it('should default to empty object when nobg_images is null', () => {
      const rowWithNullNobg = { ...mockGearItemRow, nobg_images: null };
      const item = gearItemFromDb(rowWithNullNobg);

      expect(item.nobgImages).toEqual({});
    });
  });

  describe('Boolean Fields', () => {
    it('should preserve boolean values', () => {
      const item = gearItemFromDb(mockGearItemRow);

      expect(item.isFavourite).toBe(true);
      expect(item.isForSale).toBe(false);
      expect(item.canBeBorrowed).toBe(true);
      expect(item.canBeTraded).toBe(false);
    });

    it('should default booleans to false when null', () => {
      const rowWithNullBooleans = {
        ...mockGearItemRow,
        is_favourite: null,
        is_for_sale: null,
        can_be_borrowed: null,
        can_be_traded: null,
      };
      const item = gearItemFromDb(rowWithNullBooleans as Tables<'gear_items'>);

      expect(item.isFavourite).toBe(false);
      expect(item.isForSale).toBe(false);
      expect(item.canBeBorrowed).toBe(false);
      expect(item.canBeTraded).toBe(false);
    });
  });

  describe('Status Mapping', () => {
    it('should map "own" status correctly', () => {
      const item = gearItemFromDb(mockGearItemRow);
      expect(item.status).toBe('own');
    });

    it('should map "wishlist" status correctly', () => {
      const wishlistRow = { ...mockGearItemRow, status: 'wishlist' };
      const item = gearItemFromDb(wishlistRow);
      expect(item.status).toBe('wishlist');
    });

    it('should map "sold" status correctly', () => {
      const soldRow = { ...mockGearItemRow, status: 'sold' };
      const item = gearItemFromDb(soldRow);
      expect(item.status).toBe('sold');
    });
  });

  describe('Condition Mapping', () => {
    it('should map "new" condition correctly', () => {
      const item = gearItemFromDb(mockGearItemRow);
      expect(item.condition).toBe('new');
    });

    it('should map "used" condition correctly', () => {
      const usedRow = { ...mockGearItemRow, condition: 'used' };
      const item = gearItemFromDb(usedRow);
      expect(item.condition).toBe('used');
    });
  });

  describe('Quantity Field', () => {
    it('should default quantity to 1 when undefined', () => {
      const item = gearItemFromDb(mockGearItemRow);
      expect(item.quantity).toBe(1);
    });
  });
});

// =============================================================================
// gearItemToDbInsert Tests
// =============================================================================

describe('gearItemToDbInsert', () => {
  describe('Basic Transformation', () => {
    it('should transform GearItem to insert row', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);

      expect(row.user_id).toBe(userId);
      expect(row.name).toBe('MSR PocketRocket Deluxe');
      expect(row.brand).toBe('MSR');
    });

    it('should convert camelCase to snake_case fields', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);

      expect(row.brand_url).toBe('https://msrgear.com');
      expect(row.model_number).toBe('PRD-001');
      expect(row.product_url).toBe('https://msrgear.com/pocketrocket');
      expect(row.product_type_id).toBe('cooking-stoves');
    });
  });

  describe('Date Transformations', () => {
    it('should convert purchaseDate to ISO date string', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);

      expect(row.purchase_date).toBe('2024-01-15');
    });

    it('should handle undefined purchaseDate', () => {
      const itemWithoutDate = { ...mockGearItemForInsert, purchaseDate: undefined };
      const row = gearItemToDbInsert(itemWithoutDate as typeof mockGearItemForInsert, userId);

      expect(row.purchase_date).toBeUndefined();
    });
  });

  describe('Numeric Fields', () => {
    it('should preserve numeric values', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);

      expect(row.weight_grams).toBe(83);
      expect(row.length_cm).toBe(10);
      expect(row.width_cm).toBe(5);
      expect(row.height_cm).toBe(5);
      expect(row.price_paid).toBe(49.95);
    });

    it('should handle null numeric values', () => {
      const itemWithNulls = {
        ...mockGearItemForInsert,
        weightGrams: null,
        lengthCm: null,
        pricePaid: null,
      };
      const row = gearItemToDbInsert(itemWithNulls, userId);

      expect(row.weight_grams).toBeNull();
      expect(row.length_cm).toBeNull();
      expect(row.price_paid).toBeNull();
    });
  });

  describe('Array Fields', () => {
    it('should preserve array values', () => {
      const itemWithArrays = {
        ...mockGearItemForInsert,
        galleryImageUrls: ['img1.jpg', 'img2.jpg'],
        dependencyIds: ['dep-1'],
      };
      const row = gearItemToDbInsert(itemWithArrays, userId);

      expect(row.gallery_image_urls).toEqual(['img1.jpg', 'img2.jpg']);
      expect(row.dependency_ids).toEqual(['dep-1']);
    });
  });

  describe('Boolean Fields', () => {
    it('should preserve boolean values', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);

      expect(row.is_favourite).toBe(false);
      expect(row.is_for_sale).toBe(false);
      expect(row.can_be_borrowed).toBe(false);
      expect(row.can_be_traded).toBe(false);
    });

    it('should default undefined booleans to false', () => {
      const itemWithUndefinedBooleans = {
        ...mockGearItemForInsert,
        isFavourite: undefined,
        isForSale: undefined,
      };
      const row = gearItemToDbInsert(itemWithUndefinedBooleans as typeof mockGearItemForInsert, userId);

      expect(row.is_favourite).toBe(false);
      expect(row.is_for_sale).toBe(false);
    });
  });

  describe('Status Mapping', () => {
    it('should map "own" status correctly', () => {
      const row = gearItemToDbInsert(mockGearItemForInsert, userId);
      expect(row.status).toBe('own');
    });

    it('should map legacy "active" status to "own"', () => {
      const itemWithActive = {
        ...mockGearItemForInsert,
        status: 'active' as unknown as typeof mockGearItemForInsert.status,
      };
      const row = gearItemToDbInsert(itemWithActive, userId);
      expect(row.status).toBe('own');
    });
  });
});

// =============================================================================
// gearItemToDbUpdate Tests
// =============================================================================

describe('gearItemToDbUpdate', () => {
  describe('Partial Updates', () => {
    it('should only include defined fields', () => {
      const update = gearItemToDbUpdate({ name: 'Updated Name' });

      expect(update.name).toBe('Updated Name');
      expect(Object.keys(update)).toEqual(['name']);
    });

    it('should handle multiple fields', () => {
      const update = gearItemToDbUpdate({
        name: 'Updated Name',
        brand: 'New Brand',
        weightGrams: 500,
      });

      expect(update.name).toBe('Updated Name');
      expect(update.brand).toBe('New Brand');
      expect(update.weight_grams).toBe(500);
      expect(Object.keys(update)).toHaveLength(3);
    });
  });

  describe('Snake Case Conversion', () => {
    it('should convert camelCase to snake_case', () => {
      const update = gearItemToDbUpdate({
        brandUrl: 'https://example.com',
        modelNumber: 'M-001',
        productUrl: 'https://example.com/product',
        productTypeId: 'new-type',
        weightGrams: 100,
        weightDisplayUnit: 'oz',
        lengthCm: 50,
        widthCm: 30,
        heightCm: 20,
        volumeLiters: 40,
        tentConstruction: 'Freestanding',
        primaryImageUrl: 'https://example.com/img.jpg',
        galleryImageUrls: ['img1.jpg'],
        nobgImages: { small: { png: 'nobg.png' } },
        isFavourite: true,
        isForSale: true,
        canBeBorrowed: true,
        canBeTraded: true,
        dependencyIds: ['dep-1'],
        retailerUrl: 'https://retailer.com',
      });

      expect(update.brand_url).toBe('https://example.com');
      expect(update.model_number).toBe('M-001');
      expect(update.product_url).toBe('https://example.com/product');
      expect(update.product_type_id).toBe('new-type');
      expect(update.weight_grams).toBe(100);
      expect(update.weight_display_unit).toBe('oz');
      expect(update.length_cm).toBe(50);
      expect(update.width_cm).toBe(30);
      expect(update.height_cm).toBe(20);
      expect(update.volume_liters).toBe(40);
      expect(update.tent_construction).toBe('Freestanding');
      expect(update.primary_image_url).toBe('https://example.com/img.jpg');
      expect(update.gallery_image_urls).toEqual(['img1.jpg']);
      expect(update.is_favourite).toBe(true);
      expect(update.is_for_sale).toBe(true);
      expect(update.can_be_borrowed).toBe(true);
      expect(update.can_be_traded).toBe(true);
      expect(update.dependency_ids).toEqual(['dep-1']);
      expect(update.retailer_url).toBe('https://retailer.com');
    });
  });

  describe('Date Handling', () => {
    it('should convert purchaseDate to ISO string', () => {
      const update = gearItemToDbUpdate({
        purchaseDate: new Date('2024-03-15'),
      });

      expect(update.purchase_date).toBe('2024-03-15');
    });

    it('should handle null purchaseDate', () => {
      const update = gearItemToDbUpdate({
        purchaseDate: null,
      });

      expect(update.purchase_date).toBeNull();
    });
  });

  describe('Empty Update', () => {
    it('should return empty object for empty input', () => {
      const update = gearItemToDbUpdate({});

      expect(update).toEqual({});
    });
  });

  describe('Status Mapping', () => {
    it('should map status updates', () => {
      const update = gearItemToDbUpdate({ status: 'sold' });
      expect(update.status).toBe('sold');
    });

    it('should map legacy "active" to "own"', () => {
      const update = gearItemToDbUpdate({
        status: 'active' as unknown as GearItem['status'],
      });
      expect(update.status).toBe('own');
    });
  });

  describe('All Field Types', () => {
    it('should handle all basic string fields', () => {
      const update = gearItemToDbUpdate({
        name: 'Name',
        brand: 'Brand',
        description: 'Desc',
        size: 'Large',
        color: 'Blue',
        materials: 'Nylon',
        currency: 'EUR',
        retailer: 'Shop',
        notes: 'Notes',
      });

      expect(update.name).toBe('Name');
      expect(update.brand).toBe('Brand');
      expect(update.description).toBe('Desc');
      expect(update.size).toBe('Large');
      expect(update.color).toBe('Blue');
      expect(update.materials).toBe('Nylon');
      expect(update.currency).toBe('EUR');
      expect(update.retailer).toBe('Shop');
      expect(update.notes).toBe('Notes');
    });

    it('should handle numeric fields', () => {
      const update = gearItemToDbUpdate({
        pricePaid: 199.99,
      });

      expect(update.price_paid).toBe(199.99);
    });

    it('should handle condition field', () => {
      const update = gearItemToDbUpdate({
        condition: 'used',
      });

      expect(update.condition).toBe('used');
    });
  });
});

// =============================================================================
// categoryFromDb Tests
// =============================================================================

describe('categoryFromDb', () => {
  const mockCategoryRow: Tables<'categories'> = {
    id: 'shelter-tents',
    parent_id: 'shelter',
    level: 2,
    label: 'Tents',
    created_at: '2024-01-01T00:00:00Z',
  };

  describe('Basic Transformation', () => {
    it('should transform category row to Category', () => {
      const category = categoryFromDb(mockCategoryRow);

      expect(category.id).toBe('shelter-tents');
      expect(category.label).toBe('Tents');
      expect(category.level).toBe(2);
    });

    it('should convert snake_case to camelCase', () => {
      const category = categoryFromDb(mockCategoryRow);

      expect(category.parentId).toBe('shelter');
      expect(category.createdAt).toBeInstanceOf(Date);
    });
  });

  describe('Parent ID Handling', () => {
    it('should handle non-null parent_id', () => {
      const category = categoryFromDb(mockCategoryRow);
      expect(category.parentId).toBe('shelter');
    });

    it('should handle null parent_id (root category)', () => {
      const rootCategory = { ...mockCategoryRow, parent_id: null };
      const category = categoryFromDb(rootCategory);
      expect(category.parentId).toBeNull();
    });
  });

  describe('Date Transformation', () => {
    it('should convert created_at to Date object', () => {
      const category = categoryFromDb(mockCategoryRow);

      expect(category.createdAt).toBeInstanceOf(Date);
      expect(category.createdAt.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });
  });

  describe('Level Values', () => {
    it('should preserve level 1 (root)', () => {
      const rootRow = { ...mockCategoryRow, level: 1, parent_id: null };
      const category = categoryFromDb(rootRow);
      expect(category.level).toBe(1);
    });

    it('should preserve level 2 (category)', () => {
      const category = categoryFromDb(mockCategoryRow);
      expect(category.level).toBe(2);
    });

    it('should preserve level 3 (subcategory)', () => {
      const subRow = { ...mockCategoryRow, level: 3 };
      const category = categoryFromDb(subRow);
      expect(category.level).toBe(3);
    });
  });
});
