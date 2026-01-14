/**
 * Integration Tests: Weight Conversion System
 * Feature: 012-automatic-unit-conversion
 *
 * End-to-end tests verifying that weight preference changes propagate
 * across the application, displays update correctly, and persistence works.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { mockUser, createQueryBuilderMock, resetSupabaseMocks } from '../mocks/supabase';
import type { WeightUnit } from '@/types/gear';

// =============================================================================
// Mock Dependencies
// =============================================================================

// Mock Supabase profile data
const mockProfile = {
  id: mockUser.id,
  email: mockUser.email,
  full_name: 'Test Hiker',
  preferred_weight_unit: 'g' as WeightUnit,
  updated_at: new Date().toISOString(),
};

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseAuth = {
  getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: vi.fn(() => ({
    auth: mockSupabaseAuth,
    from: mockSupabaseFrom,
  })),
}));

// Mock toast notifications
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const mockGearItem = {
  id: 'gear-001',
  user_id: mockUser.id,
  name: 'Test Tent',
  weight: 1020, // grams
  weight_display_unit: 'g' as WeightUnit,
  category_id: 'cat-001',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockLoadout = {
  id: 'loadout-001',
  user_id: mockUser.id,
  name: 'Weekend Backpacking',
  description: 'Gear for a weekend trip',
  loadout_items: [
    {
      id: 'item-001',
      loadout_id: 'loadout-001',
      gear_item_id: 'gear-001',
      quantity: 1,
      worn: false,
      consumable: false,
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// =============================================================================
// Helper Functions
// =============================================================================

function setupProfileMock(preferredUnit: WeightUnit = 'g') {
  const profile = { ...mockProfile, preferred_weight_unit: preferredUnit };
  const queryBuilder = createQueryBuilderMock(profile);
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'profiles') return queryBuilder;
    if (table === 'gear_items') return createQueryBuilderMock([mockGearItem]);
    if (table === 'loadouts') return createQueryBuilderMock([mockLoadout]);
    return createQueryBuilderMock([]);
  });
  return queryBuilder;
}

// =============================================================================
// Tests
// =============================================================================

describe('Weight Conversion System Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetSupabaseMocks();
    setupProfileMock('g'); // Default to grams
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // User Preference Tests
  // ---------------------------------------------------------------------------

  describe('User Preference Persistence', () => {
    it('should load user preference from database', async () => {
      // Arrange
      setupProfileMock('oz');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');

      // Act
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.preferredWeightUnit).toBe('oz');
    });

    it('should default to grams when no preference is set', async () => {
      // Arrange
      const profileWithoutUnit = { ...mockProfile, preferred_weight_unit: null };
      const queryBuilder = createQueryBuilderMock(profileWithoutUnit);
      mockSupabaseFrom.mockReturnValue(queryBuilder);
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');

      // Act
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.preferredWeightUnit).toBe('g');
    });

    it('should update preference and persist to database', async () => {
      // Arrange
      const queryBuilder = setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      let updateResult: { error: string | null } = { error: null };
      await act(async () => {
        updateResult = await result.current.setPreferredWeightUnit('oz');
      });

      // Assert
      expect(updateResult.error).toBeNull();
      expect(queryBuilder.update).toHaveBeenCalledWith({
        preferred_weight_unit: 'oz',
      });
    });

    it('should reject invalid weight units', async () => {
      // Arrange
      setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act
      let updateResult: { error: string | null } = { error: null };
      await act(async () => {
        updateResult = await result.current.setPreferredWeightUnit('kg' as WeightUnit);
      });

      // Assert
      expect(updateResult.error).toContain('Invalid weight unit');
    });
  });

  // ---------------------------------------------------------------------------
  // Weight Conversion Hook Tests
  // ---------------------------------------------------------------------------

  describe('Weight Conversion with Preferences', () => {
    it('should convert weight to user preferred unit', async () => {
      // Arrange
      setupProfileMock('oz');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');

      // Act
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      // Assert
      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('oz');
      });

      // Convert 1000g to oz (should be ~35.27 oz)
      const converted = result.current.convertWeight(1000, 'g');
      expect(converted).toBeCloseTo(35.27, 1);
    });

    it('should format weight for display in preferred unit', async () => {
      // Arrange
      setupProfileMock('lb');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');

      // Act
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      // Assert
      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('lb');
      });

      // Format 1000g in pounds (should be ~2.2 lb)
      const formatted = result.current.formatForDisplay(1000);
      expect(formatted).toContain('2.2');
      expect(formatted).toContain('lb');
    });

    it('should update conversions when preference changes', async () => {
      // Arrange
      const _queryBuilder = setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');

      const prefsHook = renderHook(() => useUserPreferences(mockUser.id));
      const conversionHook = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(prefsHook.result.current.isLoading).toBe(false);
      });

      // Verify initial state (grams)
      expect(conversionHook.result.current.preferredUnit).toBe('g');
      let formatted = conversionHook.result.current.formatForDisplay(1000);
      expect(formatted).toContain('1000');
      expect(formatted).toContain('g');

      // Act: Change preference to ounces
      await act(async () => {
        await prefsHook.result.current.setPreferredWeightUnit('oz');
      });

      // Update mock to return new preference
      setupProfileMock('oz');
      await act(async () => {
        await prefsHook.result.current.refreshPreferences();
      });

      // Assert: Conversion hook should reflect new preference
      await waitFor(() => {
        expect(conversionHook.result.current.preferredUnit).toBe('oz');
      });

      formatted = conversionHook.result.current.formatForDisplay(1000);
      expect(formatted).toContain('oz');
    });
  });

  // ---------------------------------------------------------------------------
  // E2E Workflow Tests
  // ---------------------------------------------------------------------------

  describe('End-to-End Weight Conversion Workflow', () => {
    it('should complete full preference change workflow', async () => {
      // Arrange
      const queryBuilder = setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');

      // Step 1: Load initial preferences (grams)
      const prefsHook = renderHook(() => useUserPreferences(mockUser.id));
      const conversionHook = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(prefsHook.result.current.isLoading).toBe(false);
      });

      expect(prefsHook.result.current.preferredWeightUnit).toBe('g');
      expect(conversionHook.result.current.preferredUnit).toBe('g');

      // Step 2: Change preference to ounces
      await act(async () => {
        const result = await prefsHook.result.current.setPreferredWeightUnit('oz');
        expect(result.error).toBeNull();
      });

      // Verify database update was called
      expect(queryBuilder.update).toHaveBeenCalledWith({
        preferred_weight_unit: 'oz',
      });

      // Step 3: Simulate reload - update mock and refresh
      setupProfileMock('oz');
      await act(async () => {
        await prefsHook.result.current.refreshPreferences();
      });

      // Step 4: Verify preference persisted
      await waitFor(() => {
        expect(prefsHook.result.current.preferredWeightUnit).toBe('oz');
      });

      // Step 5: Verify all displays update (conversion hook respects new preference)
      await waitFor(() => {
        expect(conversionHook.result.current.preferredUnit).toBe('oz');
      });

      const formatted = conversionHook.result.current.formatForDisplay(1000);
      expect(formatted).toContain('oz');
    });

    it('should handle adding gear with different input units', async () => {
      // Arrange
      setupProfileMock('g');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('g');
      });

      // Act: User enters "5 lb" in weight input
      const inputValue = 5;
      const inputUnit: WeightUnit = 'lb';

      // Convert to grams for storage
      const gramsForStorage = result.current.toGrams(inputValue, inputUnit);

      // Assert: Should store as grams (5 lb = ~2268 g)
      expect(gramsForStorage).toBeCloseTo(2268, 0);

      // Verify round-trip conversion
      const displayValue = result.current.fromGrams(gramsForStorage, inputUnit);
      expect(displayValue).toBeCloseTo(5, 1);
    });

    it('should maintain precision across multiple conversions', async () => {
      // Arrange
      setupProfileMock('g');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('g');
      });

      // Act: Round-trip conversion g → oz → g
      const originalGrams = 1020;
      const ounces = result.current.convertWeight(originalGrams, 'g', 'oz');
      const backToGrams = result.current.convertWeight(ounces, 'oz', 'g');

      // Assert: Should maintain precision within 1g
      expect(backToGrams).toBeCloseTo(originalGrams, 0);
    });
  });

  // ---------------------------------------------------------------------------
  // Error Handling Tests
  // ---------------------------------------------------------------------------

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Arrange
      const errorQueryBuilder = createQueryBuilderMock(null, new Error('Database connection failed'));
      mockSupabaseFrom.mockReturnValue(errorQueryBuilder);
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');

      // Act
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      // Assert
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      expect(result.current.error).toBeTruthy();
      // Should still default to 'g' when error occurs
      expect(result.current.preferredWeightUnit).toBe('g');
    });

    it('should handle missing user ID', async () => {
      // Arrange
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');

      // Act
      const { result } = renderHook(() => useUserPreferences(null));

      // Assert
      expect(result.current.preferredWeightUnit).toBe('g'); // Default

      // Attempting to set preference should fail
      const updateResult = await result.current.setPreferredWeightUnit('oz');
      expect(updateResult.error).toContain('No user ID');
    });

    it('should handle concurrent preference updates', async () => {
      // Arrange
      const queryBuilder = setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act: Trigger multiple updates concurrently
      await act(async () => {
        const promises = [
          result.current.setPreferredWeightUnit('oz'),
          result.current.setPreferredWeightUnit('lb'),
        ];
        await Promise.all(promises);
      });

      // Assert: Both updates should succeed (last write wins in Supabase)
      expect(queryBuilder.update).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('Edge Cases', () => {
    it('should handle zero weight', async () => {
      // Arrange
      setupProfileMock('oz');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('oz');
      });

      // Act & Assert
      const converted = result.current.convertWeight(0, 'g', 'oz');
      expect(converted).toBe(0);

      const formatted = result.current.formatForDisplay(0);
      expect(formatted).toContain('0');
    });

    it('should handle very small weights', async () => {
      // Arrange
      setupProfileMock('g');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('g');
      });

      // Act: 0.1 oz = ~2.83 g
      const smallWeight = result.current.toGrams(0.1, 'oz');

      // Assert
      expect(smallWeight).toBeCloseTo(2.83, 1);
    });

    it('should handle very large weights', async () => {
      // Arrange
      setupProfileMock('lb');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('lb');
      });

      // Act: 50,000g = ~110 lb (heavy pack)
      const largeWeight = result.current.fromGrams(50000);

      // Assert
      expect(largeWeight).toBeCloseTo(110, 0);
    });

    it('should handle all unit combinations', async () => {
      // Arrange
      setupProfileMock('g');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('g');
      });

      // Test all 9 conversion combinations
      const testCases: Array<[number, WeightUnit, WeightUnit, number]> = [
        [1000, 'g', 'g', 1000],      // g → g
        [1000, 'g', 'oz', 35.27],    // g → oz
        [1000, 'g', 'lb', 2.2],      // g → lb
        [35.27, 'oz', 'g', 1000],    // oz → g
        [35.27, 'oz', 'oz', 35.27],  // oz → oz
        [35.27, 'oz', 'lb', 2.2],    // oz → lb
        [2.2, 'lb', 'g', 1000],      // lb → g
        [2.2, 'lb', 'oz', 35.27],    // lb → oz
        [2.2, 'lb', 'lb', 2.2],      // lb → lb
      ];

      testCases.forEach(([value, from, to, expected]) => {
        const converted = result.current.convertWeight(value, from, to);
        expect(converted).toBeCloseTo(expected, 1);
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Performance Tests
  // ---------------------------------------------------------------------------

  describe('Performance', () => {
    it('should cache conversion results', async () => {
      // Arrange
      setupProfileMock('oz');
      const { useWeightConversion } = await import('@/hooks/useWeightConversion');
      const { result, rerender } = renderHook(() => useWeightConversion(mockUser.id));

      await waitFor(() => {
        expect(result.current.preferredUnit).toBe('oz');
      });

      // Act: Get reference to conversion function
      const convertFn1 = result.current.convertWeight;

      // Re-render without preference change
      rerender();

      const convertFn2 = result.current.convertWeight;

      // Assert: Function reference should be stable (memoized)
      expect(convertFn1).toBe(convertFn2);
    });

    it('should handle rapid preference changes', async () => {
      // Arrange
      const queryBuilder = setupProfileMock('g');
      const { useUserPreferences } = await import('@/hooks/useUserPreferences');
      const { result } = renderHook(() => useUserPreferences(mockUser.id));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Act: Rapidly change preferences
      const units: WeightUnit[] = ['oz', 'lb', 'g', 'oz'];
      for (const unit of units) {
        await act(async () => {
          await result.current.setPreferredWeightUnit(unit);
        });
      }

      // Assert: All updates should complete
      expect(queryBuilder.update).toHaveBeenCalledTimes(units.length);
      expect(queryBuilder.update).toHaveBeenLastCalledWith({
        preferred_weight_unit: 'oz',
      });
    });
  });
});
