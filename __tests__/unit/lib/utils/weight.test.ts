/**
 * Weight Utilities Tests
 *
 * Tests for weight conversion, formatting, and calculation functions.
 * Uses realistic outdoor gear weights for test data.
 */

import { describe, it, expect } from 'vitest';
import {
  gramsToOunces,
  gramsToPounds,
  ouncesToGrams,
  poundsToGrams,
  ouncesToPounds,
  poundsToOunces,
  convertWeight,
  toGrams,
  fromGrams,
  formatWeight,
  formatWeightFromGrams,
  parseWeight,
  calculateWeightSummary,
} from '@/lib/utils/weight';

// =============================================================================
// Constants for testing (real gear weights)
// =============================================================================

const ULTRALIGHT_TENT_GRAMS = 1020; // Big Agnes Copper Spur HV UL2
const QUILT_GRAMS = 567; // Enlightened Equipment Enigma 20
const PAD_GRAMS = 354; // Thermarest NeoAir XLite NXT
const PACK_GRAMS = 737; // Gossamer Gear Mariposa 60
const STOVE_GRAMS = 83; // MSR PocketRocket Deluxe

describe('Weight Utilities', () => {
  // ===========================================================================
  // Basic Conversion Tests
  // ===========================================================================

  describe('gramsToOunces', () => {
    it('should convert 0 grams to 0 ounces', () => {
      expect(gramsToOunces(0)).toBe(0);
    });

    it('should convert ultralight tent weight correctly', () => {
      // 1020g ≈ 35.98 oz
      const result = gramsToOunces(ULTRALIGHT_TENT_GRAMS);
      expect(result).toBeCloseTo(35.98, 1);
    });

    it('should convert small weights (stove)', () => {
      // 83g ≈ 2.93 oz
      const result = gramsToOunces(STOVE_GRAMS);
      expect(result).toBeCloseTo(2.93, 1);
    });

    it('should handle decimal grams', () => {
      const result = gramsToOunces(28.3495);
      expect(result).toBeCloseTo(1, 4);
    });
  });

  describe('gramsToPounds', () => {
    it('should convert 0 grams to 0 pounds', () => {
      expect(gramsToPounds(0)).toBe(0);
    });

    it('should convert 1 pound in grams correctly', () => {
      expect(gramsToPounds(453.592)).toBeCloseTo(1, 4);
    });

    it('should convert pack weight correctly', () => {
      // 737g ≈ 1.62 lb
      const result = gramsToPounds(PACK_GRAMS);
      expect(result).toBeCloseTo(1.62, 1);
    });

    it('should handle typical base weight (5kg)', () => {
      // 5000g ≈ 11.02 lb
      const result = gramsToPounds(5000);
      expect(result).toBeCloseTo(11.02, 1);
    });
  });

  describe('ouncesToGrams', () => {
    it('should convert 0 ounces to 0 grams', () => {
      expect(ouncesToGrams(0)).toBe(0);
    });

    it('should convert 1 ounce to grams correctly', () => {
      expect(ouncesToGrams(1)).toBeCloseTo(28.3495, 3);
    });

    it('should be inverse of gramsToOunces', () => {
      const grams = 567; // Quilt weight
      const oz = gramsToOunces(grams);
      const backToGrams = ouncesToGrams(oz);
      expect(backToGrams).toBeCloseTo(grams, 4);
    });
  });

  describe('poundsToGrams', () => {
    it('should convert 0 pounds to 0 grams', () => {
      expect(poundsToGrams(0)).toBe(0);
    });

    it('should convert 1 pound to grams correctly', () => {
      expect(poundsToGrams(1)).toBeCloseTo(453.592, 2);
    });

    it('should be inverse of gramsToPounds', () => {
      const grams = 1020; // Tent weight
      const pounds = gramsToPounds(grams);
      const backToGrams = poundsToGrams(pounds);
      expect(backToGrams).toBeCloseTo(grams, 4);
    });

    it('should handle 10 lb pack correctly', () => {
      // 10 lb = 4535.92 g
      expect(poundsToGrams(10)).toBeCloseTo(4535.92, 1);
    });
  });

  describe('ouncesToPounds', () => {
    it('should convert 16 ounces to 1 pound', () => {
      expect(ouncesToPounds(16)).toBe(1);
    });

    it('should convert 32 ounces to 2 pounds', () => {
      expect(ouncesToPounds(32)).toBe(2);
    });

    it('should handle fractional ounces', () => {
      expect(ouncesToPounds(8)).toBe(0.5);
    });
  });

  describe('poundsToOunces', () => {
    it('should convert 1 pound to 16 ounces', () => {
      expect(poundsToOunces(1)).toBe(16);
    });

    it('should handle fractional pounds', () => {
      expect(poundsToOunces(0.5)).toBe(8);
    });

    it('should be inverse of ouncesToPounds', () => {
      const ounces = 20;
      const pounds = ouncesToPounds(ounces);
      expect(poundsToOunces(pounds)).toBe(ounces);
    });
  });

  // ===========================================================================
  // Generic Conversion Tests
  // ===========================================================================

  describe('convertWeight', () => {
    it('should return same value when from and to are equal', () => {
      expect(convertWeight(100, 'g', 'g')).toBe(100);
      expect(convertWeight(5.5, 'oz', 'oz')).toBe(5.5);
      expect(convertWeight(2.3, 'lb', 'lb')).toBe(2.3);
    });

    it('should convert grams to ounces', () => {
      const result = convertWeight(QUILT_GRAMS, 'g', 'oz');
      expect(result).toBeCloseTo(20, 0);
    });

    it('should convert grams to pounds', () => {
      const result = convertWeight(ULTRALIGHT_TENT_GRAMS, 'g', 'lb');
      expect(result).toBeCloseTo(2.25, 1);
    });

    it('should convert ounces to grams', () => {
      const result = convertWeight(20, 'oz', 'g');
      expect(result).toBeCloseTo(567, 0);
    });

    it('should convert pounds to grams', () => {
      const result = convertWeight(2, 'lb', 'g');
      expect(result).toBeCloseTo(907.18, 1);
    });

    it('should convert ounces to pounds', () => {
      const result = convertWeight(32, 'oz', 'lb');
      expect(result).toBe(2);
    });

    it('should convert pounds to ounces', () => {
      const result = convertWeight(1.5, 'lb', 'oz');
      expect(result).toBeCloseTo(24, 4);
    });

    it('should throw for unknown source unit', () => {
      expect(() => convertWeight(100, 'kg' as any, 'g')).toThrow('Unknown weight unit');
    });

    it('should throw for unknown target unit', () => {
      expect(() => convertWeight(100, 'g', 'kg' as any)).toThrow('Unknown weight unit');
    });
  });

  describe('toGrams', () => {
    it('should return same value for grams', () => {
      expect(toGrams(100, 'g')).toBe(100);
    });

    it('should convert ounces to grams', () => {
      expect(toGrams(1, 'oz')).toBeCloseTo(28.35, 1);
    });

    it('should convert pounds to grams', () => {
      expect(toGrams(1, 'lb')).toBeCloseTo(453.59, 1);
    });
  });

  describe('fromGrams', () => {
    it('should return same value for grams', () => {
      expect(fromGrams(100, 'g')).toBe(100);
    });

    it('should convert to ounces correctly', () => {
      expect(fromGrams(28.3495, 'oz')).toBeCloseTo(1, 4);
    });

    it('should convert to pounds correctly', () => {
      expect(fromGrams(453.592, 'lb')).toBeCloseTo(1, 4);
    });
  });

  // ===========================================================================
  // Formatting Tests
  // ===========================================================================

  describe('formatWeight', () => {
    it('should format grams with default precision', () => {
      expect(formatWeight(123.456, 'g')).toBe('123.5 g');
    });

    it('should format ounces with default precision', () => {
      expect(formatWeight(4.32, 'oz')).toBe('4.3 oz');
    });

    it('should format pounds with default precision', () => {
      expect(formatWeight(2.5, 'lb')).toBe('2.5 lb');
    });

    it('should respect custom precision', () => {
      expect(formatWeight(123.456, 'g', 0)).toBe('123 g');
      expect(formatWeight(123.456, 'g', 2)).toBe('123.46 g');
      expect(formatWeight(123.456, 'g', 3)).toBe('123.456 g');
    });

    it('should handle zero weight', () => {
      expect(formatWeight(0, 'g')).toBe('0.0 g');
    });

    it('should handle large weights', () => {
      expect(formatWeight(10000, 'g', 0)).toBe('10000 g');
    });
  });

  describe('formatWeightFromGrams', () => {
    it('should format in grams correctly', () => {
      expect(formatWeightFromGrams(STOVE_GRAMS, 'g')).toBe('83.0 g');
    });

    it('should format tent weight in ounces', () => {
      const result = formatWeightFromGrams(ULTRALIGHT_TENT_GRAMS, 'oz');
      expect(result).toBe('36.0 oz');
    });

    it('should format pack weight in pounds', () => {
      const result = formatWeightFromGrams(PACK_GRAMS, 'lb');
      expect(result).toBe('1.6 lb');
    });

    it('should respect precision parameter', () => {
      const result = formatWeightFromGrams(PACK_GRAMS, 'lb', 2);
      expect(result).toBe('1.62 lb');
    });
  });

  // ===========================================================================
  // Parsing Tests
  // ===========================================================================

  describe('parseWeight', () => {
    it('should parse plain numbers', () => {
      expect(parseWeight('123')).toBe(123);
      expect(parseWeight('45.6')).toBe(45.6);
    });

    it('should parse numbers with g suffix', () => {
      expect(parseWeight('123g')).toBe(123);
      expect(parseWeight('123 g')).toBe(123);
      expect(parseWeight('45.6g')).toBe(45.6);
    });

    it('should parse numbers with oz suffix', () => {
      expect(parseWeight('4.5oz')).toBe(4.5);
      expect(parseWeight('4.5 oz')).toBe(4.5);
    });

    it('should parse numbers with lb suffix', () => {
      expect(parseWeight('2.3lb')).toBe(2.3);
      expect(parseWeight('2.3 lb')).toBe(2.3);
      expect(parseWeight('2lbs')).toBe(2);
    });

    it('should return null for empty input', () => {
      expect(parseWeight('')).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseWeight('abc')).toBeNull();
      expect(parseWeight('not a number')).toBeNull();
    });

    it('should return null for NaN', () => {
      expect(parseWeight('NaN')).toBeNull();
    });

    it('should return null for Infinity', () => {
      expect(parseWeight('Infinity')).toBeNull();
    });

    it('should handle whitespace', () => {
      expect(parseWeight('  123  ')).toBe(123);
      expect(parseWeight('  45.6 g  ')).toBe(45.6);
    });

    it('should handle case insensitive suffixes', () => {
      expect(parseWeight('123G')).toBe(123);
      expect(parseWeight('123OZ')).toBe(123);
      expect(parseWeight('123LB')).toBe(123);
    });
  });

  // ===========================================================================
  // Weight Summary Tests
  // ===========================================================================

  describe('calculateWeightSummary', () => {
    it('should calculate all weights correctly', () => {
      const total = 5000;
      const worn = 500;
      const consumable = 300;

      const summary = calculateWeightSummary(total, worn, consumable);

      expect(summary.totalWeight).toBe(5000);
      expect(summary.wornWeight).toBe(500);
      expect(summary.consumableWeight).toBe(300);
      expect(summary.baseWeight).toBe(4200); // 5000 - 500 - 300
    });

    it('should handle zero worn and consumable', () => {
      const summary = calculateWeightSummary(3000, 0, 0);

      expect(summary.totalWeight).toBe(3000);
      expect(summary.baseWeight).toBe(3000);
      expect(summary.wornWeight).toBe(0);
      expect(summary.consumableWeight).toBe(0);
    });

    it('should handle all worn (trail running setup)', () => {
      const summary = calculateWeightSummary(500, 500, 0);

      expect(summary.totalWeight).toBe(500);
      expect(summary.baseWeight).toBe(0);
      expect(summary.wornWeight).toBe(500);
    });

    it('should calculate realistic ultralight setup', () => {
      // Big 3: Tent 1020g, Quilt 567g, Pad 354g = 1941g base
      // Worn: Clothes 400g
      // Consumable: Food/water 1500g
      // Total: 3841g

      const summary = calculateWeightSummary(3841, 400, 1500);

      expect(summary.totalWeight).toBe(3841);
      expect(summary.baseWeight).toBe(1941);
      expect(summary.wornWeight).toBe(400);
      expect(summary.consumableWeight).toBe(1500);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very small weights (featherweight gear)', () => {
      // 1 gram item
      const oz = gramsToOunces(1);
      expect(oz).toBeCloseTo(0.035, 2);
    });

    it('should handle very large weights (group gear)', () => {
      // 50kg group gear
      const pounds = gramsToPounds(50000);
      expect(pounds).toBeCloseTo(110.23, 1);
    });

    it('should maintain precision through round-trip conversions', () => {
      const originalGrams = 567.89;

      // g -> oz -> g
      const oz = gramsToOunces(originalGrams);
      const backToGrams1 = ouncesToGrams(oz);
      expect(backToGrams1).toBeCloseTo(originalGrams, 4);

      // g -> lb -> g
      const lb = gramsToPounds(originalGrams);
      const backToGrams2 = poundsToGrams(lb);
      expect(backToGrams2).toBeCloseTo(originalGrams, 4);
    });

    it('should handle negative weights (edge case, should not happen)', () => {
      // While negative weights don't make physical sense,
      // the functions should handle them mathematically
      expect(gramsToOunces(-100)).toBeLessThan(0);
      expect(gramsToPounds(-100)).toBeLessThan(0);
    });
  });
});
