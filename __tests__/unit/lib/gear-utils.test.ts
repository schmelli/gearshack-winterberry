/**
 * Gear Utility Functions Tests
 *
 * Tests for gear item conversion functions, weight calculations,
 * and image optimization utilities.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  gramsToDisplayUnit,
  displayUnitToGrams,
  formatWeight,
  formatWeightForDisplay,
  gearItemToFormData,
  formDataToGearItem,
  generateGearItemId,
  createNewGearItem,
  updateGearItem,
  getOptimizedImageUrl,
} from '@/lib/gear-utils';
import type { GearItem, GearItemFormData } from '@/types/gear';

// Mock cloudinary-utils
vi.mock('@/lib/cloudinary-utils', () => ({
  optimizeCloudinaryUrl: (url: string, options: { width: number }) =>
    `${url}?w=${options.width}&q=auto`,
}));

// =============================================================================
// Test Constants
// =============================================================================

const GRAMS_PER_OZ = 28.3495;
const GRAMS_PER_LB = 453.592;

// Realistic outdoor gear weights in grams
const TENT_WEIGHT_GRAMS = 1020; // Big Agnes Copper Spur HV UL2
const STOVE_WEIGHT_GRAMS = 83; // MSR PocketRocket Deluxe
const PACK_WEIGHT_GRAMS = 737; // Gossamer Gear Mariposa 60

// =============================================================================
// Mock Data
// =============================================================================

const mockGearItem: GearItem = {
  id: 'gear-001',
  name: 'Big Agnes Copper Spur HV UL2',
  brand: 'Big Agnes',
  description: 'Ultralight 2-person tent',
  brandUrl: 'https://bigagnes.com',
  modelNumber: 'TLCS2HV23',
  productUrl: 'https://bigagnes.com/copper-spur',
  productTypeId: 'shelter-tents-backpacking',
  weightGrams: 1020,
  weightDisplayUnit: 'g',
  lengthCm: 218,
  widthCm: 127,
  heightCm: 99,
  size: null,
  color: 'Olive Green',
  volumeLiters: null,
  materials: 'Solution-dyed ripstop nylon',
  tentConstruction: 'Semi-freestanding',
  pricePaid: 449.95,
  currency: 'USD',
  purchaseDate: new Date('2023-06-15'),
  retailer: 'REI',
  retailerUrl: 'https://rei.com',
  primaryImageUrl: 'https://res.cloudinary.com/test/image/upload/tent.jpg',
  galleryImageUrls: [],
  condition: 'new',
  status: 'own',
  notes: 'Great for PCT thru-hike',
  quantity: 1,
  isFavourite: true,
  isForSale: false,
  canBeBorrowed: false,
  canBeTraded: false,
  dependencyIds: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

const mockFormData: GearItemFormData = {
  name: 'MSR PocketRocket Deluxe',
  brand: 'MSR',
  description: 'Ultralight backpacking stove',
  brandUrl: '',
  modelNumber: 'PRD-001',
  productUrl: '',
  productTypeId: 'cooking-stoves',
  weightValue: '83',
  weightDisplayUnit: 'g',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  size: '',
  color: 'Red',
  volumeLiters: '',
  materials: 'Stainless steel',
  tentConstruction: '',
  pricePaid: '49.95',
  currency: 'USD',
  purchaseDate: '2024-01-15',
  retailer: 'REI',
  retailerUrl: '',
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

// =============================================================================
// Weight Conversion Tests
// =============================================================================

describe('gramsToDisplayUnit', () => {
  describe('Grams (identity)', () => {
    it('should return same value for grams', () => {
      expect(gramsToDisplayUnit(1000, 'g')).toBe(1000);
    });

    it('should handle zero grams', () => {
      expect(gramsToDisplayUnit(0, 'g')).toBe(0);
    });

    it('should handle decimal grams', () => {
      expect(gramsToDisplayUnit(100.5, 'g')).toBe(100.5);
    });
  });

  describe('Ounces', () => {
    it('should convert tent weight to ounces', () => {
      const oz = gramsToDisplayUnit(TENT_WEIGHT_GRAMS, 'oz');
      expect(oz).toBeCloseTo(TENT_WEIGHT_GRAMS / GRAMS_PER_OZ, 2);
    });

    it('should convert stove weight to ounces', () => {
      const oz = gramsToDisplayUnit(STOVE_WEIGHT_GRAMS, 'oz');
      expect(oz).toBeCloseTo(2.93, 1);
    });
  });

  describe('Pounds', () => {
    it('should convert pack weight to pounds', () => {
      const lb = gramsToDisplayUnit(PACK_WEIGHT_GRAMS, 'lb');
      expect(lb).toBeCloseTo(1.62, 1);
    });

    it('should convert 1kg to pounds', () => {
      const lb = gramsToDisplayUnit(1000, 'lb');
      expect(lb).toBeCloseTo(2.2, 1);
    });
  });
});

describe('displayUnitToGrams', () => {
  describe('Grams (identity)', () => {
    it('should return same value for grams', () => {
      expect(displayUnitToGrams(1000, 'g')).toBe(1000);
    });
  });

  describe('Ounces', () => {
    it('should convert 1 oz to grams', () => {
      const grams = displayUnitToGrams(1, 'oz');
      expect(grams).toBeCloseTo(GRAMS_PER_OZ, 2);
    });

    it('should be inverse of gramsToDisplayUnit', () => {
      const oz = gramsToDisplayUnit(TENT_WEIGHT_GRAMS, 'oz');
      const backToGrams = displayUnitToGrams(oz, 'oz');
      expect(backToGrams).toBeCloseTo(TENT_WEIGHT_GRAMS, 4);
    });
  });

  describe('Pounds', () => {
    it('should convert 1 lb to grams', () => {
      const grams = displayUnitToGrams(1, 'lb');
      expect(grams).toBeCloseTo(GRAMS_PER_LB, 2);
    });

    it('should be inverse of gramsToDisplayUnit', () => {
      const lb = gramsToDisplayUnit(PACK_WEIGHT_GRAMS, 'lb');
      const backToGrams = displayUnitToGrams(lb, 'lb');
      expect(backToGrams).toBeCloseTo(PACK_WEIGHT_GRAMS, 4);
    });
  });
});

describe('formatWeight', () => {
  it('should format grams with no decimal places', () => {
    expect(formatWeight(TENT_WEIGHT_GRAMS, 'g')).toBe('1020');
  });

  it('should format ounces with 2 decimal places', () => {
    expect(formatWeight(STOVE_WEIGHT_GRAMS, 'oz')).toMatch(/^\d+\.\d{2}$/);
  });

  it('should format pounds with 2 decimal places', () => {
    expect(formatWeight(PACK_WEIGHT_GRAMS, 'lb')).toMatch(/^\d+\.\d{2}$/);
  });

  it('should handle zero weight', () => {
    expect(formatWeight(0, 'g')).toBe('0');
    expect(formatWeight(0, 'oz')).toBe('0.00');
    expect(formatWeight(0, 'lb')).toBe('0.00');
  });
});

describe('formatWeightForDisplay', () => {
  it('should return em dash for null', () => {
    expect(formatWeightForDisplay(null)).toBe('—');
  });

  it('should format grams for < 1000g', () => {
    expect(formatWeightForDisplay(STOVE_WEIGHT_GRAMS)).toBe('83 g');
    expect(formatWeightForDisplay(500)).toBe('500 g');
    expect(formatWeightForDisplay(999)).toBe('999 g');
  });

  it('should format kilograms for >= 1000g', () => {
    expect(formatWeightForDisplay(1000)).toBe('1.00 kg');
    expect(formatWeightForDisplay(TENT_WEIGHT_GRAMS)).toBe('1.02 kg');
    expect(formatWeightForDisplay(2500)).toBe('2.50 kg');
  });

  it('should handle zero weight', () => {
    expect(formatWeightForDisplay(0)).toBe('0 g');
  });
});

// =============================================================================
// Form Conversion Tests
// =============================================================================

describe('gearItemToFormData', () => {
  it('should convert GearItem to form data', () => {
    const formData = gearItemToFormData(mockGearItem);

    expect(formData.name).toBe(mockGearItem.name);
    expect(formData.brand).toBe(mockGearItem.brand);
    expect(formData.weightValue).toBe('1020');
    expect(formData.weightDisplayUnit).toBe('g');
    expect(formData.condition).toBe('new');
    expect(formData.status).toBe('own');
  });

  it('should handle null values', () => {
    const itemWithNulls = {
      ...mockGearItem,
      brand: null,
      description: null,
      weightGrams: null,
    };
    const formData = gearItemToFormData(itemWithNulls);

    expect(formData.brand).toBe('');
    expect(formData.description).toBe('');
    expect(formData.weightValue).toBe('');
  });

  it('should convert weight to display unit', () => {
    const itemInOz = { ...mockGearItem, weightDisplayUnit: 'oz' as const };
    const formData = gearItemToFormData(itemInOz);

    expect(parseFloat(formData.weightValue)).toBeCloseTo(
      TENT_WEIGHT_GRAMS / GRAMS_PER_OZ,
      2
    );
  });

  it('should format purchase date as ISO date string', () => {
    const formData = gearItemToFormData(mockGearItem);
    expect(formData.purchaseDate).toBe('2023-06-15');
  });
});

describe('formDataToGearItem', () => {
  it('should convert form data to GearItem (without id/timestamps)', () => {
    const item = formDataToGearItem(mockFormData);

    expect(item.name).toBe(mockFormData.name);
    expect(item.brand).toBe(mockFormData.brand);
    expect(item.weightGrams).toBe(83);
    expect(item.condition).toBe('new');
    expect(item.status).toBe('own');
  });

  it('should convert empty strings to null', () => {
    const formWithEmpty = { ...mockFormData, brand: '', description: '' };
    const item = formDataToGearItem(formWithEmpty);

    expect(item.brand).toBeNull();
    expect(item.description).toBeNull();
  });

  it('should parse numeric fields correctly', () => {
    const item = formDataToGearItem(mockFormData);

    expect(item.pricePaid).toBe(49.95);
    expect(item.quantity).toBe(1);
  });

  it('should convert weight from display unit to grams', () => {
    const formInOz = { ...mockFormData, weightValue: '1', weightDisplayUnit: 'oz' as const };
    const item = formDataToGearItem(formInOz);

    expect(item.weightGrams).toBeCloseTo(GRAMS_PER_OZ, 2);
  });

  it('should handle empty weight as null', () => {
    const formWithoutWeight = { ...mockFormData, weightValue: '' };
    const item = formDataToGearItem(formWithoutWeight);

    expect(item.weightGrams).toBeNull();
  });

  it('should parse purchase date', () => {
    const item = formDataToGearItem(mockFormData);

    expect(item.purchaseDate).toBeInstanceOf(Date);
    expect(item.purchaseDate?.toISOString().split('T')[0]).toBe('2024-01-15');
  });

  it('should filter empty gallery URLs', () => {
    const formWithEmptyUrls = {
      ...mockFormData,
      galleryImageUrls: ['https://example.com/1.jpg', '', 'https://example.com/2.jpg'],
    };
    const item = formDataToGearItem(formWithEmptyUrls);

    expect(item.galleryImageUrls).toHaveLength(2);
    expect(item.galleryImageUrls).not.toContain('');
  });
});

// =============================================================================
// ID Generation Tests
// =============================================================================

describe('generateGearItemId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateGearItemId();
    const id2 = generateGearItemId();

    expect(id1).not.toBe(id2);
  });

  it('should start with gear- prefix', () => {
    const id = generateGearItemId();
    expect(id.startsWith('gear-')).toBe(true);
  });

  it('should have expected format', () => {
    const id = generateGearItemId();
    expect(id).toMatch(/^gear-\d+-[a-z0-9]+$/);
  });
});

// =============================================================================
// Create/Update Item Tests
// =============================================================================

describe('createNewGearItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should create item with generated ID', () => {
    const item = createNewGearItem(mockFormData);

    expect(item.id).toMatch(/^gear-/);
    expect(item.name).toBe(mockFormData.name);
  });

  it('should set createdAt and updatedAt to current time', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.setSystemTime(now);

    const item = createNewGearItem(mockFormData);

    expect(item.createdAt).toEqual(now);
    expect(item.updatedAt).toEqual(now);
  });
});

describe('updateGearItem', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('should preserve original ID and createdAt', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.setSystemTime(now);

    const updated = updateGearItem(mockGearItem, mockFormData);

    expect(updated.id).toBe(mockGearItem.id);
    expect(updated.createdAt).toBe(mockGearItem.createdAt);
  });

  it('should update updatedAt to current time', () => {
    const now = new Date('2024-06-15T12:00:00Z');
    vi.setSystemTime(now);

    const updated = updateGearItem(mockGearItem, mockFormData);

    expect(updated.updatedAt).toEqual(now);
  });

  it('should apply form data changes', () => {
    const updated = updateGearItem(mockGearItem, mockFormData);

    expect(updated.name).toBe(mockFormData.name);
    expect(updated.brand).toBe(mockFormData.brand);
  });
});

// =============================================================================
// Image Optimization Tests
// =============================================================================

describe('getOptimizedImageUrl', () => {
  it('should return null for item without image', () => {
    const itemWithoutImage = { ...mockGearItem, primaryImageUrl: null };
    const url = getOptimizedImageUrl(itemWithoutImage);

    expect(url).toBeNull();
  });

  it('should return primary image URL with optimizations', () => {
    const url = getOptimizedImageUrl(mockGearItem);

    expect(url).toContain('res.cloudinary.com');
    expect(url).toContain('w=800');
  });

  it('should use custom width parameter', () => {
    const url = getOptimizedImageUrl(mockGearItem, 400);

    expect(url).toContain('w=400');
  });

  it('should prioritize nobg images over primary', () => {
    const itemWithNobg = {
      ...mockGearItem,
      nobgImages: {
        medium: { png: 'https://res.cloudinary.com/test/nobg.png' },
      },
    };
    const url = getOptimizedImageUrl(itemWithNobg);

    expect(url).toContain('nobg.png');
  });

  it('should fall back to primary if nobg is empty', () => {
    const itemWithEmptyNobg = {
      ...mockGearItem,
      nobgImages: {},
    };
    const url = getOptimizedImageUrl(itemWithEmptyNobg);

    expect(url).toContain('tent.jpg');
  });

  it('should return non-Cloudinary URL unchanged', () => {
    const itemWithExternalImage = {
      ...mockGearItem,
      primaryImageUrl: 'https://example.com/image.jpg',
    };
    const url = getOptimizedImageUrl(itemWithExternalImage);

    expect(url).toBe('https://example.com/image.jpg');
  });
});
