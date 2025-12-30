/**
 * Matching Utilities Tests
 *
 * Tests for the normalizeForMatch function used to match gear items
 * between shared loadouts and user inventory.
 */

import { describe, it, expect } from 'vitest';
import { normalizeForMatch } from '@/lib/utils/matching';

// =============================================================================
// Test Constants - Realistic Outdoor Gear Brands and Products
// =============================================================================

const GEAR_EXAMPLES = {
  tent: { brand: 'Big Agnes', name: 'Copper Spur HV UL2' },
  quilt: { brand: 'Enlightened Equipment', name: 'Enigma 20' },
  pack: { brand: 'Gossamer Gear', name: 'Mariposa 60' },
  stove: { brand: 'MSR', name: 'PocketRocket Deluxe' },
  pad: { brand: 'Thermarest', name: 'NeoAir XLite NXT' },
};

// =============================================================================
// Tests
// =============================================================================

describe('normalizeForMatch', () => {
  // ===========================================================================
  // Basic Functionality
  // ===========================================================================

  describe('Basic Functionality', () => {
    it('should create pipe-separated lowercase string from brand and name', () => {
      const result = normalizeForMatch('Osprey', 'Atmos AG 65');
      expect(result).toBe('osprey|atmos ag 65');
    });

    it('should handle realistic gear items', () => {
      const result = normalizeForMatch(
        GEAR_EXAMPLES.tent.brand,
        GEAR_EXAMPLES.tent.name
      );
      expect(result).toBe('big agnes|copper spur hv ul2');
    });

    it('should handle brand names with multiple words', () => {
      const result = normalizeForMatch(
        'Enlightened Equipment',
        'Enigma 20'
      );
      expect(result).toBe('enlightened equipment|enigma 20');
    });

    it('should handle abbreviated brand names', () => {
      const result = normalizeForMatch('MSR', 'PocketRocket Deluxe');
      expect(result).toBe('msr|pocketrocket deluxe');
    });
  });

  // ===========================================================================
  // Null Brand Handling
  // ===========================================================================

  describe('Null Brand Handling', () => {
    it('should handle null brand with pipe prefix', () => {
      const result = normalizeForMatch(null, 'Tent Stakes');
      expect(result).toBe('|tent stakes');
    });

    it('should produce consistent output for brandless items', () => {
      const result1 = normalizeForMatch(null, 'Generic Item');
      const result2 = normalizeForMatch(null, 'Generic Item');
      expect(result1).toBe(result2);
    });

    it('should differentiate branded vs unbranded items', () => {
      const brandedResult = normalizeForMatch('Osprey', 'Item');
      const unbrandedResult = normalizeForMatch(null, 'Item');
      expect(brandedResult).not.toBe(unbrandedResult);
      expect(brandedResult).toBe('osprey|item');
      expect(unbrandedResult).toBe('|item');
    });
  });

  // ===========================================================================
  // Whitespace Handling
  // ===========================================================================

  describe('Whitespace Handling', () => {
    it('should trim leading whitespace from brand', () => {
      const result = normalizeForMatch('  REI', 'Flash 22');
      expect(result).toBe('rei|flash 22');
    });

    it('should trim trailing whitespace from brand', () => {
      const result = normalizeForMatch('REI  ', 'Flash 22');
      expect(result).toBe('rei|flash 22');
    });

    it('should trim both sides of brand', () => {
      const result = normalizeForMatch('  REI  ', 'Flash 22');
      expect(result).toBe('rei|flash 22');
    });

    it('should trim leading whitespace from name', () => {
      const result = normalizeForMatch('REI', '  Flash 22');
      expect(result).toBe('rei|flash 22');
    });

    it('should trim trailing whitespace from name', () => {
      const result = normalizeForMatch('REI', 'Flash 22  ');
      expect(result).toBe('rei|flash 22');
    });

    it('should trim both sides of name', () => {
      const result = normalizeForMatch('REI', '  Flash 22  ');
      expect(result).toBe('rei|flash 22');
    });

    it('should handle both brand and name with whitespace', () => {
      const result = normalizeForMatch('  REI  ', '  Flash 22  ');
      expect(result).toBe('rei|flash 22');
    });

    it('should preserve internal spaces in brand', () => {
      const result = normalizeForMatch('Big Agnes', 'Tent');
      expect(result).toBe('big agnes|tent');
    });

    it('should preserve internal spaces in name', () => {
      const result = normalizeForMatch('Brand', 'Multi Word Name');
      expect(result).toBe('brand|multi word name');
    });
  });

  // ===========================================================================
  // Case Normalization
  // ===========================================================================

  describe('Case Normalization', () => {
    it('should convert uppercase brand to lowercase', () => {
      const result = normalizeForMatch('OSPREY', 'Pack');
      expect(result).toBe('osprey|pack');
    });

    it('should convert mixed case brand to lowercase', () => {
      const result = normalizeForMatch('BiGaGnEs', 'Tent');
      expect(result).toBe('bigagnes|tent');
    });

    it('should convert uppercase name to lowercase', () => {
      const result = normalizeForMatch('Brand', 'ATMOS AG 65');
      expect(result).toBe('brand|atmos ag 65');
    });

    it('should convert mixed case name to lowercase', () => {
      const result = normalizeForMatch('Brand', 'NeoAir XLite NXT');
      expect(result).toBe('brand|neoair xlite nxt');
    });

    it('should produce same output for different case inputs', () => {
      const result1 = normalizeForMatch('Osprey', 'Atmos AG 65');
      const result2 = normalizeForMatch('OSPREY', 'ATMOS AG 65');
      const result3 = normalizeForMatch('osprey', 'atmos ag 65');
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });
  });

  // ===========================================================================
  // Matching Use Cases
  // ===========================================================================

  describe('Matching Use Cases', () => {
    it('should match identical items regardless of case', () => {
      const key1 = normalizeForMatch('Big Agnes', 'Copper Spur HV UL2');
      const key2 = normalizeForMatch('big agnes', 'copper spur hv ul2');
      expect(key1).toBe(key2);
    });

    it('should match identical items regardless of whitespace', () => {
      const key1 = normalizeForMatch('Big Agnes', 'Copper Spur HV UL2');
      const key2 = normalizeForMatch('  Big Agnes  ', '  Copper Spur HV UL2  ');
      expect(key1).toBe(key2);
    });

    it('should differentiate items with same name but different brands', () => {
      const key1 = normalizeForMatch('Big Agnes', 'Scout UL2');
      const key2 = normalizeForMatch('Nemo', 'Scout UL2');
      expect(key1).not.toBe(key2);
    });

    it('should differentiate items with same brand but different names', () => {
      const key1 = normalizeForMatch('Big Agnes', 'Copper Spur HV UL2');
      const key2 = normalizeForMatch('Big Agnes', 'Tiger Wall UL2');
      expect(key1).not.toBe(key2);
    });

    it('should create unique keys for all sample gear items', () => {
      const keys = Object.values(GEAR_EXAMPLES).map(
        (item) => normalizeForMatch(item.brand, item.name)
      );
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty string brand', () => {
      const result = normalizeForMatch('', 'Item Name');
      expect(result).toBe('|item name');
    });

    it('should handle empty string name', () => {
      const result = normalizeForMatch('Brand', '');
      expect(result).toBe('brand|');
    });

    it('should handle both empty strings', () => {
      const result = normalizeForMatch('', '');
      expect(result).toBe('|');
    });

    it('should handle single character brand', () => {
      const result = normalizeForMatch('A', 'Item');
      expect(result).toBe('a|item');
    });

    it('should handle single character name', () => {
      const result = normalizeForMatch('Brand', 'X');
      expect(result).toBe('brand|x');
    });

    it('should handle special characters in brand', () => {
      const result = normalizeForMatch("Patagonia®", 'Jacket');
      expect(result).toBe('patagonia®|jacket');
    });

    it('should handle special characters in name', () => {
      const result = normalizeForMatch('Brand', 'Item™ Pro+');
      expect(result).toBe('brand|item™ pro+');
    });

    it('should handle numbers in brand', () => {
      const result = normalizeForMatch('3F UL Gear', 'Tent');
      expect(result).toBe('3f ul gear|tent');
    });

    it('should handle numbers in name', () => {
      const result = normalizeForMatch('Gregory', 'Baltoro 65');
      expect(result).toBe('gregory|baltoro 65');
    });

    it('should handle hyphenated names', () => {
      const result = normalizeForMatch('Sea-to-Summit', 'Self-Inflating Mat');
      expect(result).toBe('sea-to-summit|self-inflating mat');
    });

    it('should handle unicode characters', () => {
      const result = normalizeForMatch('Fjällräven', 'Kånken');
      expect(result).toBe('fjällräven|kånken');
    });

    it('should handle only whitespace brand', () => {
      const result = normalizeForMatch('   ', 'Item');
      expect(result).toBe('|item');
    });

    it('should handle only whitespace name', () => {
      const result = normalizeForMatch('Brand', '   ');
      expect(result).toBe('brand|');
    });
  });

  // ===========================================================================
  // Performance Considerations
  // ===========================================================================

  describe('Performance', () => {
    it('should handle long brand names', () => {
      const longBrand = 'Very Long Brand Name Company Inc'.repeat(10);
      const result = normalizeForMatch(longBrand, 'Item');
      expect(result).toContain('|item');
      expect(result.startsWith('very long brand name company inc')).toBe(true);
    });

    it('should handle long item names', () => {
      const longName = 'Ultra Lightweight Pro Model Edition Version'.repeat(10);
      const result = normalizeForMatch('Brand', longName);
      expect(result.startsWith('brand|')).toBe(true);
      expect(result.includes('ultra lightweight pro model edition version')).toBe(true);
    });
  });
});
