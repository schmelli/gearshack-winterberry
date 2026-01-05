/**
 * useWeightConversion Hook Tests
 *
 * Tests for weight conversion hook that respects user preferences.
 * Validates conversion methods, formatting, memoization, and preference integration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useWeightConversion } from '@/hooks/useWeightConversion';
import type { UseUserPreferencesReturn } from '@/hooks/useUserPreferences';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock useUserPreferences hook
let mockUseUserPreferences: UseUserPreferencesReturn;

const mockSetPreferredWeightUnit = vi.fn();
const mockRefreshPreferences = vi.fn();

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => mockUseUserPreferences,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function setupMockPreferences(
  preferredWeightUnit: WeightUnit = 'g',
  isLoading = false,
  error: string | null = null
) {
  mockUseUserPreferences = {
    preferredWeightUnit,
    isLoading,
    error,
    setPreferredWeightUnit: mockSetPreferredWeightUnit,
    refreshPreferences: mockRefreshPreferences,
  };
}

// Realistic gear weights for testing
const ULTRALIGHT_TENT_GRAMS = 1020; // Big Agnes Copper Spur HV UL2
const QUILT_GRAMS = 567; // Enlightened Equipment Enigma 20
const STOVE_GRAMS = 83; // MSR PocketRocket Deluxe

// =============================================================================
// Tests
// =============================================================================

describe('useWeightConversion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSetPreferredWeightUnit.mockReset();
    mockRefreshPreferences.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return preferred unit from user preferences (grams)', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      expect(result.current.preferredUnit).toBe('g');
    });

    it('should return preferred unit from user preferences (ounces)', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      expect(result.current.preferredUnit).toBe('oz');
    });

    it('should return preferred unit from user preferences (pounds)', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      expect(result.current.preferredUnit).toBe('lb');
    });

    it('should expose all required methods', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      expect(result.current).toHaveProperty('preferredUnit');
      expect(result.current).toHaveProperty('convertWeight');
      expect(result.current).toHaveProperty('formatForDisplay');
      expect(result.current).toHaveProperty('toGrams');
      expect(result.current).toHaveProperty('fromGrams');
      expect(typeof result.current.convertWeight).toBe('function');
      expect(typeof result.current.formatForDisplay).toBe('function');
      expect(typeof result.current.toGrams).toBe('function');
      expect(typeof result.current.fromGrams).toBe('function');
    });
  });

  // ===========================================================================
  // convertWeight Tests
  // ===========================================================================

  describe('convertWeight', () => {
    it('should convert to preferred unit when target unit not specified (grams)', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(20, 'oz');

      // 20 oz ≈ 567 g
      expect(converted).toBeCloseTo(567, 0);
    });

    it('should convert to preferred unit when target unit not specified (ounces)', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(QUILT_GRAMS, 'g');

      // 567 g ≈ 20 oz
      expect(converted).toBeCloseTo(20, 0);
    });

    it('should convert to preferred unit when target unit not specified (pounds)', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(ULTRALIGHT_TENT_GRAMS, 'g');

      // 1020 g ≈ 2.25 lb
      expect(converted).toBeCloseTo(2.25, 1);
    });

    it('should use explicit target unit when provided (override preference)', () => {
      setupMockPreferences('g'); // Preferred unit is grams

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(QUILT_GRAMS, 'g', 'oz');

      // Should convert to oz despite preference being g
      expect(converted).toBeCloseTo(20, 0);
    });

    it('should handle grams to ounces conversion', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(STOVE_GRAMS, 'g');

      // 83 g ≈ 2.93 oz
      expect(converted).toBeCloseTo(2.93, 1);
    });

    it('should handle ounces to pounds conversion', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(32, 'oz');

      // 32 oz = 2 lb
      expect(converted).toBe(2);
    });

    it('should handle pounds to grams conversion', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(2.25, 'lb');

      // 2.25 lb ≈ 1020 g
      expect(converted).toBeCloseTo(1020, 0);
    });

    it('should handle zero weight', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(0, 'g');

      expect(converted).toBe(0);
    });

    it('should handle same source and target unit', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(500, 'g', 'g');

      expect(converted).toBe(500);
    });
  });

  // ===========================================================================
  // formatForDisplay Tests
  // ===========================================================================

  describe('formatForDisplay', () => {
    it('should format in preferred unit when unit not specified (grams)', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(QUILT_GRAMS);

      expect(formatted).toBe('567.0 g');
    });

    it('should format in preferred unit when unit not specified (ounces)', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(QUILT_GRAMS);

      // 567 g ≈ 20.0 oz
      expect(formatted).toBe('20.0 oz');
    });

    it('should format in preferred unit when unit not specified (pounds)', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(ULTRALIGHT_TENT_GRAMS);

      // 1020 g ≈ 2.2 lb
      expect(formatted).toBe('2.2 lb');
    });

    it('should use explicit unit when provided (override preference)', () => {
      setupMockPreferences('g'); // Preferred unit is grams

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(QUILT_GRAMS, 'oz');

      // Should format in oz despite preference being g
      expect(formatted).toBe('20.0 oz');
    });

    it('should respect custom precision parameter', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(QUILT_GRAMS, undefined, 2);

      // 567 g ≈ 20.00 oz (2 decimal places)
      expect(formatted).toBe('20.00 oz');
    });

    it('should use precision 0 for integer display', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(QUILT_GRAMS, undefined, 0);

      expect(formatted).toBe('567 g');
    });

    it('should handle zero weight', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(0);

      expect(formatted).toBe('0.0 oz');
    });

    it('should handle very small weights', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const formatted = result.current.formatForDisplay(1); // 1 gram

      // 1 g ≈ 0.04 oz
      expect(formatted).toContain('oz');
      expect(formatted).toContain('0.0');
    });
  });

  // ===========================================================================
  // toGrams Tests
  // ===========================================================================

  describe('toGrams', () => {
    it('should convert grams to grams (identity)', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(500, 'g');

      expect(grams).toBe(500);
    });

    it('should convert ounces to grams', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(20, 'oz');

      // 20 oz ≈ 567 g
      expect(grams).toBeCloseTo(567, 0);
    });

    it('should convert pounds to grams', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(2.25, 'lb');

      // 2.25 lb ≈ 1020 g
      expect(grams).toBeCloseTo(1020, 0);
    });

    it('should handle 1 ounce conversion', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(1, 'oz');

      expect(grams).toBeCloseTo(28.3495, 3);
    });

    it('should handle 1 pound conversion', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(1, 'lb');

      expect(grams).toBeCloseTo(453.592, 2);
    });

    it('should handle zero weight', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const grams = result.current.toGrams(0, 'oz');

      expect(grams).toBe(0);
    });
  });

  // ===========================================================================
  // fromGrams Tests
  // ===========================================================================

  describe('fromGrams', () => {
    it('should convert to preferred unit when unit not specified (grams)', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const value = result.current.fromGrams(QUILT_GRAMS);

      expect(value).toBe(QUILT_GRAMS);
    });

    it('should convert to preferred unit when unit not specified (ounces)', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const value = result.current.fromGrams(QUILT_GRAMS);

      // 567 g ≈ 20 oz
      expect(value).toBeCloseTo(20, 0);
    });

    it('should convert to preferred unit when unit not specified (pounds)', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const value = result.current.fromGrams(ULTRALIGHT_TENT_GRAMS);

      // 1020 g ≈ 2.25 lb
      expect(value).toBeCloseTo(2.25, 1);
    });

    it('should use explicit unit when provided (override preference)', () => {
      setupMockPreferences('g'); // Preferred unit is grams

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const value = result.current.fromGrams(QUILT_GRAMS, 'oz');

      // Should convert to oz despite preference being g
      expect(value).toBeCloseTo(20, 0);
    });

    it('should handle zero weight', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const value = result.current.fromGrams(0);

      expect(value).toBe(0);
    });

    it('should be inverse of toGrams', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const originalOz = 20;
      const grams = result.current.toGrams(originalOz, 'oz');
      const backToOz = result.current.fromGrams(grams, 'oz');

      expect(backToOz).toBeCloseTo(originalOz, 4);
    });
  });

  // ===========================================================================
  // Memoization Tests
  // ===========================================================================

  describe('Memoization', () => {
    it('should maintain stable convertWeight reference when preferences unchanged', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstConvertWeight = result.current.convertWeight;

      rerender();

      expect(result.current.convertWeight).toBe(firstConvertWeight);
    });

    it('should maintain stable formatForDisplay reference when preferences unchanged', () => {
      setupMockPreferences('oz');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstFormatForDisplay = result.current.formatForDisplay;

      rerender();

      expect(result.current.formatForDisplay).toBe(firstFormatForDisplay);
    });

    it('should maintain stable fromGrams reference when preferences unchanged', () => {
      setupMockPreferences('lb');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstFromGrams = result.current.fromGrams;

      rerender();

      expect(result.current.fromGrams).toBe(firstFromGrams);
    });

    it('should maintain stable toGrams reference across all rerenders', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstToGrams = result.current.toGrams;

      rerender();
      rerender();
      rerender();

      // toGrams is not a useCallback, it's imported directly from utils
      expect(result.current.toGrams).toBe(firstToGrams);
    });

    it('should update convertWeight reference when preferred unit changes', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstConvertWeight = result.current.convertWeight;

      // Change preferred unit
      setupMockPreferences('oz');
      rerender();

      expect(result.current.convertWeight).not.toBe(firstConvertWeight);
    });

    it('should update formatForDisplay reference when preferred unit changes', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstFormatForDisplay = result.current.formatForDisplay;

      // Change preferred unit
      setupMockPreferences('lb');
      rerender();

      expect(result.current.formatForDisplay).not.toBe(firstFormatForDisplay);
    });

    it('should update fromGrams reference when preferred unit changes', () => {
      setupMockPreferences('oz');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));
      const firstFromGrams = result.current.fromGrams;

      // Change preferred unit
      setupMockPreferences('g');
      rerender();

      expect(result.current.fromGrams).not.toBe(firstFromGrams);
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should handle full conversion workflow with grams preference', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      // User inputs 20 oz
      const grams = result.current.toGrams(20, 'oz');
      expect(grams).toBeCloseTo(567, 0);

      // Display in preferred unit (grams)
      const formatted = result.current.formatForDisplay(grams);
      expect(formatted).toBe('567.0 g');

      // Convert for comparison
      const converted = result.current.convertWeight(20, 'oz');
      expect(converted).toBeCloseTo(567, 0);
    });

    it('should handle full conversion workflow with ounces preference', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));

      // User inputs 1020 g
      const oz = result.current.fromGrams(1020);
      expect(oz).toBeCloseTo(36, 0);

      // Display in preferred unit (ounces)
      const formatted = result.current.formatForDisplay(1020);
      expect(formatted).toContain('oz');

      // Convert for comparison
      const converted = result.current.convertWeight(1020, 'g');
      expect(converted).toBeCloseTo(36, 0);
    });

    it('should handle preference change mid-session', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));

      // Initial state - grams
      expect(result.current.preferredUnit).toBe('g');
      const gramsFormatted = result.current.formatForDisplay(QUILT_GRAMS);
      expect(gramsFormatted).toBe('567.0 g');

      // Change to ounces
      setupMockPreferences('oz');
      rerender();

      expect(result.current.preferredUnit).toBe('oz');
      const ouncesFormatted = result.current.formatForDisplay(QUILT_GRAMS);
      expect(ouncesFormatted).toBe('20.0 oz');
    });

    it('should handle userId change', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(
        ({ userId }) => useWeightConversion(userId),
        { initialProps: { userId: 'user-123' } }
      );

      expect(result.current.preferredUnit).toBe('g');

      // Change user (might have different preferences)
      setupMockPreferences('lb');
      rerender({ userId: 'user-456' });

      expect(result.current.preferredUnit).toBe('lb');
    });

    it('should handle null userId', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion(null));

      // Should still work with default preferences
      expect(result.current.preferredUnit).toBe('g');
      expect(result.current.convertWeight(20, 'oz')).toBeCloseTo(567, 0);
      expect(result.current.formatForDisplay(567)).toBe('567.0 g');
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle very large weights', () => {
      setupMockPreferences('lb');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const largeGrams = 50000; // 50 kg
      const pounds = result.current.fromGrams(largeGrams);

      // 50000 g ≈ 110 lb
      expect(pounds).toBeCloseTo(110, 0);
    });

    it('should handle very small weights', () => {
      setupMockPreferences('oz');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const smallGrams = 0.1;
      const oz = result.current.fromGrams(smallGrams);

      expect(oz).toBeGreaterThan(0);
      expect(oz).toBeLessThan(0.01);
    });

    it('should handle decimal input values', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const converted = result.current.convertWeight(1.5, 'oz');

      // 1.5 oz ≈ 42.52 g
      expect(converted).toBeCloseTo(42.52, 1);
    });

    it('should handle all unit combinations', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const units: WeightUnit[] = ['g', 'oz', 'lb'];

      for (const from of units) {
        for (const to of units) {
          const converted = result.current.convertWeight(100, from, to);
          expect(typeof converted).toBe('number');
          expect(converted).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it('should maintain precision across multiple conversions', () => {
      setupMockPreferences('g');

      const { result } = renderHook(() => useWeightConversion('user-123'));
      const original = 500; // grams

      // g → oz → lb → g
      const oz = result.current.convertWeight(original, 'g', 'oz');
      const lb = result.current.convertWeight(oz, 'oz', 'lb');
      const backToGrams = result.current.convertWeight(lb, 'lb', 'g');

      expect(backToGrams).toBeCloseTo(original, 3);
    });

    it('should handle rapid preference changes', () => {
      setupMockPreferences('g');

      const { result, rerender } = renderHook(() => useWeightConversion('user-123'));

      expect(result.current.preferredUnit).toBe('g');

      setupMockPreferences('oz');
      rerender();
      expect(result.current.preferredUnit).toBe('oz');

      setupMockPreferences('lb');
      rerender();
      expect(result.current.preferredUnit).toBe('lb');

      setupMockPreferences('g');
      rerender();
      expect(result.current.preferredUnit).toBe('g');
    });
  });
});
