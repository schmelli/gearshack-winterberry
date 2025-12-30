/**
 * Wishlist Schema Validation Tests
 *
 * Tests for wishlist-related validation schemas including
 * community availability, duplicate detection, and sort options.
 */

import { describe, it, expect } from 'vitest';
import {
  communityAvailabilityMatchSchema,
  communityAvailabilityMatchesSchema,
  checkDuplicateSchema,
  inventoryViewModeSchema,
  wishlistSortOptionSchema,
} from '@/lib/validations/wishlist-schema';

// =============================================================================
// Test Data
// =============================================================================

const validCommunityMatch = {
  matchedItemId: '550e8400-e29b-41d4-a716-446655440000',
  ownerId: '550e8400-e29b-41d4-a716-446655440001',
  ownerDisplayName: 'TrailRunner',
  ownerAvatarUrl: 'https://example.com/avatar.jpg',
  itemName: 'Big Agnes Copper Spur HV UL2',
  itemBrand: 'Big Agnes',
  forSale: true,
  lendable: false,
  tradeable: true,
  similarityScore: 0.95,
  primaryImageUrl: 'https://example.com/tent.jpg',
};

// =============================================================================
// Community Availability Match Schema Tests
// =============================================================================

describe('Community Availability Match Schema', () => {
  describe('Valid Data', () => {
    it('should accept valid community match', () => {
      const result = communityAvailabilityMatchSchema.safeParse(validCommunityMatch);
      expect(result.success).toBe(true);
    });

    it('should accept match with null optional fields', () => {
      const valid = {
        ...validCommunityMatch,
        ownerAvatarUrl: null,
        itemBrand: null,
        primaryImageUrl: null,
      };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('UUID Validation', () => {
    it('should reject invalid matchedItemId UUID', () => {
      const invalid = { ...validCommunityMatch, matchedItemId: 'not-a-uuid' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid ownerId UUID', () => {
      const invalid = { ...validCommunityMatch, ownerId: 'not-a-uuid' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Required Fields', () => {
    it('should require ownerDisplayName', () => {
      const invalid = { ...validCommunityMatch, ownerDisplayName: '' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should require itemName', () => {
      const invalid = { ...validCommunityMatch, itemName: '' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('URL Validation', () => {
    it('should reject invalid avatar URL', () => {
      const invalid = { ...validCommunityMatch, ownerAvatarUrl: 'not-a-url' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid image URL', () => {
      const invalid = { ...validCommunityMatch, primaryImageUrl: 'not-a-url' };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Similarity Score Validation', () => {
    it('should accept similarity score of 0', () => {
      const valid = { ...validCommunityMatch, similarityScore: 0 };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept similarity score of 1', () => {
      const valid = { ...validCommunityMatch, similarityScore: 1 };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept similarity score between 0 and 1', () => {
      const valid = { ...validCommunityMatch, similarityScore: 0.75 };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject similarity score below 0', () => {
      const invalid = { ...validCommunityMatch, similarityScore: -0.1 };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject similarity score above 1', () => {
      const invalid = { ...validCommunityMatch, similarityScore: 1.1 };
      const result = communityAvailabilityMatchSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('Boolean Fields', () => {
    it('should accept all false availability flags', () => {
      const valid = {
        ...validCommunityMatch,
        forSale: false,
        lendable: false,
        tradeable: false,
      };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept all true availability flags', () => {
      const valid = {
        ...validCommunityMatch,
        forSale: true,
        lendable: true,
        tradeable: true,
      };
      const result = communityAvailabilityMatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Community Availability Matches Array Schema Tests
// =============================================================================

describe('Community Availability Matches Array Schema', () => {
  it('should accept empty array', () => {
    const result = communityAvailabilityMatchesSchema.safeParse([]);
    expect(result.success).toBe(true);
  });

  it('should accept array of valid matches', () => {
    const result = communityAvailabilityMatchesSchema.safeParse([
      validCommunityMatch,
      { ...validCommunityMatch, matchedItemId: '550e8400-e29b-41d4-a716-446655440002' },
    ]);
    expect(result.success).toBe(true);
  });

  it('should reject array with invalid match', () => {
    const result = communityAvailabilityMatchesSchema.safeParse([
      validCommunityMatch,
      { ...validCommunityMatch, matchedItemId: 'invalid' },
    ]);
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Check Duplicate Schema Tests
// =============================================================================

describe('Check Duplicate Schema', () => {
  it('should accept valid brand and model', () => {
    const result = checkDuplicateSchema.safeParse({
      brand: 'Big Agnes',
      modelNumber: 'Copper Spur HV UL2',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null brand', () => {
    const result = checkDuplicateSchema.safeParse({
      brand: null,
      modelNumber: 'Copper Spur HV UL2',
    });
    expect(result.success).toBe(true);
  });

  it('should accept null model number', () => {
    const result = checkDuplicateSchema.safeParse({
      brand: 'Big Agnes',
      modelNumber: null,
    });
    expect(result.success).toBe(true);
  });

  it('should accept both null', () => {
    const result = checkDuplicateSchema.safeParse({
      brand: null,
      modelNumber: null,
    });
    expect(result.success).toBe(true);
  });
});

// =============================================================================
// Inventory View Mode Schema Tests
// =============================================================================

describe('Inventory View Mode Schema', () => {
  it('should accept inventory mode', () => {
    const result = inventoryViewModeSchema.safeParse('inventory');
    expect(result.success).toBe(true);
  });

  it('should accept wishlist mode', () => {
    const result = inventoryViewModeSchema.safeParse('wishlist');
    expect(result.success).toBe(true);
  });

  it('should reject invalid mode', () => {
    const result = inventoryViewModeSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should reject empty string', () => {
    const result = inventoryViewModeSchema.safeParse('');
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// Wishlist Sort Option Schema Tests
// =============================================================================

describe('Wishlist Sort Option Schema', () => {
  const validOptions = [
    'dateAdded',
    'dateAddedOldest',
    'name',
    'nameDesc',
    'category',
    'weight',
  ];

  validOptions.forEach((option) => {
    it(`should accept ${option} sort option`, () => {
      const result = wishlistSortOptionSchema.safeParse(option);
      expect(result.success).toBe(true);
    });
  });

  it('should reject invalid sort option', () => {
    const result = wishlistSortOptionSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });

  it('should reject price as sort option (not in wishlist)', () => {
    const result = wishlistSortOptionSchema.safeParse('price');
    expect(result.success).toBe(false);
  });
});
