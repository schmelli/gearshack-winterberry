/**
 * Gear Item Schema Validation Tests
 *
 * Tests for gear item form validation including all field types,
 * edge cases, and error messages.
 */

import { describe, it, expect } from 'vitest';
import {
  gearItemFormSchema,
  gearItemDraftSchema,
  weightUnitSchema,
  gearConditionSchema,
  gearStatusSchema,
  validateGearItemForm,
  getFieldError,
  type GearItemFormSchema,
} from '@/lib/validations/gear-schema';

// =============================================================================
// Test Data
// =============================================================================

const validGearItem: GearItemFormSchema = {
  // General Info
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  description: 'A lightweight 2-person backpacking tent for 3-season use',
  brandUrl: 'https://bigagnes.com',
  modelNumber: 'THVCS220',
  productUrl: 'https://bigagnes.com/products/copper-spur-hv-ul2',

  // Classification
  productTypeId: 'shelter-tent-2p',

  // Weight & Specifications
  weightValue: '1020',
  weightDisplayUnit: 'g',
  lengthCm: '218',
  widthCm: '132',
  heightCm: '102',
  size: 'Regular',
  color: 'Gray/Gold',
  volumeLiters: '',
  materials: 'Ripstop nylon, DAC poles',
  tentConstruction: 'Semi-freestanding',

  // Purchase Details
  pricePaid: '449.95',
  currency: 'USD',
  purchaseDate: '2023-06-15',
  retailer: 'REI',
  retailerUrl: 'https://rei.com',

  // Media
  primaryImageUrl: 'https://cloudinary.com/tent.jpg',
  galleryImageUrls: [],

  // Status & Condition
  condition: 'used',
  status: 'own',
  notes: 'Great tent, bought on sale',
  quantity: '1',
  isFavourite: true,
  isForSale: false,
  canBeBorrowed: true,
  canBeTraded: false,

  // Dependencies
  dependencyIds: [],
};

// =============================================================================
// Enum Schema Tests
// =============================================================================

describe('Weight Unit Schema', () => {
  it('should accept valid weight units', () => {
    expect(weightUnitSchema.parse('g')).toBe('g');
    expect(weightUnitSchema.parse('oz')).toBe('oz');
    expect(weightUnitSchema.parse('lb')).toBe('lb');
  });

  it('should reject invalid weight units', () => {
    expect(() => weightUnitSchema.parse('kg')).toThrow();
    expect(() => weightUnitSchema.parse('lbs')).toThrow();
    expect(() => weightUnitSchema.parse('')).toThrow();
  });
});

describe('Gear Condition Schema', () => {
  it('should accept valid conditions', () => {
    expect(gearConditionSchema.parse('new')).toBe('new');
    expect(gearConditionSchema.parse('used')).toBe('used');
    expect(gearConditionSchema.parse('worn')).toBe('worn');
  });

  it('should reject invalid conditions', () => {
    expect(() => gearConditionSchema.parse('excellent')).toThrow();
    expect(() => gearConditionSchema.parse('')).toThrow();
  });
});

describe('Gear Status Schema', () => {
  it('should accept valid statuses', () => {
    expect(gearStatusSchema.parse('own')).toBe('own');
    expect(gearStatusSchema.parse('wishlist')).toBe('wishlist');
    expect(gearStatusSchema.parse('sold')).toBe('sold');
    expect(gearStatusSchema.parse('lent')).toBe('lent');
    expect(gearStatusSchema.parse('retired')).toBe('retired');
  });

  it('should reject invalid statuses', () => {
    expect(() => gearStatusSchema.parse('borrowed')).toThrow();
    expect(() => gearStatusSchema.parse('')).toThrow();
  });
});

// =============================================================================
// Full Form Schema Tests
// =============================================================================

describe('Gear Item Form Schema', () => {
  describe('Valid Data', () => {
    it('should validate a complete gear item', () => {
      const result = gearItemFormSchema.safeParse(validGearItem);
      expect(result.success).toBe(true);
    });

    it('should validate with minimal required fields', () => {
      const minimal = {
        ...validGearItem,
        brand: '',
        description: '',
        brandUrl: '',
        modelNumber: '',
        productUrl: '',
        weightValue: '',
        lengthCm: '',
        widthCm: '',
        heightCm: '',
        size: '',
        color: '',
        volumeLiters: '',
        materials: '',
        tentConstruction: '',
        pricePaid: '',
        currency: '',
        purchaseDate: '',
        retailer: '',
        retailerUrl: '',
        primaryImageUrl: '',
        notes: '',
        quantity: '',
      };
      const result = gearItemFormSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });
  });

  describe('Name Validation', () => {
    it('should require name', () => {
      const invalid = { ...validGearItem, name: '' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Name is required');
      }
    });

    it('should reject name over 200 characters', () => {
      const invalid = { ...validGearItem, name: 'a'.repeat(201) };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept name at exactly 200 characters', () => {
      const valid = { ...validGearItem, name: 'a'.repeat(200) };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Product Type Validation', () => {
    it('should require product type', () => {
      const invalid = { ...validGearItem, productTypeId: '' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Product type is required');
      }
    });
  });

  describe('URL Validation', () => {
    it('should accept valid URLs', () => {
      const result = gearItemFormSchema.safeParse(validGearItem);
      expect(result.success).toBe(true);
    });

    it('should accept empty URLs', () => {
      const valid = { ...validGearItem, brandUrl: '', productUrl: '', retailerUrl: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs', () => {
      const invalid = { ...validGearItem, brandUrl: 'not-a-url' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Invalid URL format');
      }
    });

    it('should reject URLs without protocol', () => {
      const invalid = { ...validGearItem, productUrl: 'example.com' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Weight Validation', () => {
    it('should accept valid weight values', () => {
      const valid = { ...validGearItem, weightValue: '567.5' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty weight', () => {
      const valid = { ...validGearItem, weightValue: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept zero weight', () => {
      const valid = { ...validGearItem, weightValue: '0' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative weight', () => {
      const invalid = { ...validGearItem, weightValue: '-100' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric weight', () => {
      const invalid = { ...validGearItem, weightValue: 'heavy' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Dimension Validation (lengthCm, widthCm, heightCm)', () => {
    it('should accept valid dimensions', () => {
      const valid = { ...validGearItem, lengthCm: '200', widthCm: '50', heightCm: '30' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty dimensions', () => {
      const valid = { ...validGearItem, lengthCm: '', widthCm: '', heightCm: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject zero dimensions (strict positive)', () => {
      const invalid = { ...validGearItem, lengthCm: '0' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative dimensions', () => {
      const invalid = { ...validGearItem, widthCm: '-10' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Price Validation', () => {
    it('should accept valid prices', () => {
      const valid = { ...validGearItem, pricePaid: '299.99' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept free items (zero price)', () => {
      const valid = { ...validGearItem, pricePaid: '0' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty price', () => {
      const valid = { ...validGearItem, pricePaid: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject negative prices', () => {
      const invalid = { ...validGearItem, pricePaid: '-50' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Date Validation', () => {
    it('should accept valid date strings', () => {
      const valid = { ...validGearItem, purchaseDate: '2024-01-15' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty date', () => {
      const valid = { ...validGearItem, purchaseDate: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid date format', () => {
      const invalid = { ...validGearItem, purchaseDate: 'not-a-date' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept ISO date format', () => {
      const valid = { ...validGearItem, purchaseDate: '2024-01-15T12:00:00Z' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('Quantity Validation', () => {
    it('should accept valid quantities', () => {
      const valid = { ...validGearItem, quantity: '5' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty quantity', () => {
      const valid = { ...validGearItem, quantity: '' };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject zero quantity', () => {
      const invalid = { ...validGearItem, quantity: '0' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative quantity', () => {
      const invalid = { ...validGearItem, quantity: '-1' };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Gallery Images Validation', () => {
    it('should accept valid image URLs', () => {
      const valid = {
        ...validGearItem,
        galleryImageUrls: ['https://example.com/img1.jpg', 'https://example.com/img2.jpg'],
      };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty gallery', () => {
      const valid = { ...validGearItem, galleryImageUrls: [] };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid URLs in gallery', () => {
      const invalid = {
        ...validGearItem,
        galleryImageUrls: ['https://example.com/valid.jpg', 'not-a-url'],
      };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Boolean Fields', () => {
    it('should accept boolean values', () => {
      const valid = {
        ...validGearItem,
        isFavourite: true,
        isForSale: false,
        canBeBorrowed: true,
        canBeTraded: false,
      };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject non-boolean values for boolean fields', () => {
      const invalid = { ...validGearItem, isFavourite: 'yes' as unknown as boolean };
      const result = gearItemFormSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Dependency IDs', () => {
    it('should accept empty dependencies array', () => {
      const valid = { ...validGearItem, dependencyIds: [] };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept valid dependency IDs', () => {
      const valid = {
        ...validGearItem,
        dependencyIds: ['dep-1', 'dep-2', 'dep-3'],
      };
      const result = gearItemFormSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Draft Schema Tests
// =============================================================================

describe('Gear Item Draft Schema', () => {
  it('should allow partial data with name', () => {
    const draft = { name: 'Work in progress tent' };
    const result = gearItemDraftSchema.safeParse(draft);
    expect(result.success).toBe(true);
  });

  it('should validate provided fields', () => {
    const draft = {
      name: 'Draft item',
      weightValue: '-100', // Invalid
    };
    const result = gearItemDraftSchema.safeParse(draft);
    // The partial schema still validates provided fields
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Helper Function Tests
// =============================================================================

describe('validateGearItemForm', () => {
  it('should return success true for valid data', () => {
    const result = validateGearItemForm(validGearItem);
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.errors).toBeUndefined();
  });

  it('should return success false for invalid data', () => {
    const invalid = { ...validGearItem, name: '' };
    const result = validateGearItemForm(invalid);
    expect(result.success).toBe(false);
    expect(result.data).toBeUndefined();
    expect(result.errors).toBeDefined();
  });

  it('should return typed data on success', () => {
    const result = validateGearItemForm(validGearItem);
    if (result.success && result.data) {
      expect(result.data.name).toBe('Big Agnes Copper Spur HV UL2');
      expect(result.data.brand).toBe('Big Agnes');
    }
  });
});

describe('getFieldError', () => {
  it('should return undefined when no errors', () => {
    const error = getFieldError(undefined, 'name');
    expect(error).toBeUndefined();
  });

  it('should return error message for invalid field', () => {
    const invalid = { ...validGearItem, name: '' };
    const result = gearItemFormSchema.safeParse(invalid);
    if (!result.success) {
      const error = getFieldError(result.error, 'name');
      expect(error).toBe('Name is required');
    }
  });

  it('should return undefined for valid fields', () => {
    const invalid = { ...validGearItem, name: '' };
    const result = gearItemFormSchema.safeParse(invalid);
    if (!result.success) {
      const error = getFieldError(result.error, 'brand');
      expect(error).toBeUndefined();
    }
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  it('should handle special characters in text fields', () => {
    const valid = {
      ...validGearItem,
      name: 'Tent "Ultra" (2024) – Special Edition™',
      notes: 'Notes with émojis 🏕️ and üñíçödé',
    };
    const result = gearItemFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should handle decimal weights with many places', () => {
    const valid = { ...validGearItem, weightValue: '123.456789' };
    const result = gearItemFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should handle future purchase dates', () => {
    const valid = { ...validGearItem, purchaseDate: '2030-01-01' };
    const result = gearItemFormSchema.safeParse(valid);
    // Schema doesn't restrict future dates
    expect(result.success).toBe(true);
  });

  it('should handle very long description at limit', () => {
    const valid = { ...validGearItem, description: 'a'.repeat(5000) };
    const result = gearItemFormSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('should reject description over limit', () => {
    const invalid = { ...validGearItem, description: 'a'.repeat(5001) };
    const result = gearItemFormSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });
});
