/**
 * useUserPreferences Hook Tests
 *
 * Tests for user preference management with weight unit persistence using Supabase.
 * Validates preference getter/setter, default values, and validation logic.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { UseSupabaseProfileReturn } from '@/hooks/useSupabaseProfile';

// =============================================================================
// Mock Setup
// =============================================================================

// Create a mock profile object generator
const createMockProfile = (preferredWeightUnit: string | null = 'g') => ({
  id: 'user-123-uuid',
  email: 'test@gearshack.com',
  display_name: 'Test Hiker',
  avatar_url: 'https://example.com/avatar.jpg',
  preferred_weight_unit: preferredWeightUnit,
  trail_name: null,
  bio: null,
  location_name: null,
  latitude: null,
  longitude: null,
  instagram: null,
  facebook: null,
  youtube: null,
  website: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
});

// Mock useSupabaseProfile hook
let mockUseSupabaseProfile: UseSupabaseProfileReturn;

const mockUpdateProfile = vi.fn();
const mockRefreshProfile = vi.fn();

vi.mock('@/hooks/useSupabaseProfile', () => ({
  useSupabaseProfile: () => mockUseSupabaseProfile,
}));

// =============================================================================
// Test Helpers
// =============================================================================

function setupMockProfile(
  profile: ReturnType<typeof createMockProfile> | null = createMockProfile(),
  isLoading = false,
  error: string | null = null
) {
  mockUseSupabaseProfile = {
    profile,
    isLoading,
    error,
    updateProfile: mockUpdateProfile,
    refreshProfile: mockRefreshProfile,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('useUserPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockReset();
    mockRefreshProfile.mockReset();
    mockUpdateProfile.mockResolvedValue({ error: null });
    mockRefreshProfile.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return default weight unit "g" when profile is null', () => {
      setupMockProfile(null, false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.preferredWeightUnit).toBe('g');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return default weight unit "g" when preferred_weight_unit is null', () => {
      setupMockProfile(createMockProfile(null), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.preferredWeightUnit).toBe('g');
    });

    it('should return profile weight unit when set to "oz"', () => {
      setupMockProfile(createMockProfile('oz'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.preferredWeightUnit).toBe('oz');
    });

    it('should return profile weight unit when set to "lb"', () => {
      setupMockProfile(createMockProfile('lb'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.preferredWeightUnit).toBe('lb');
    });

    it('should forward loading state from useSupabaseProfile', () => {
      setupMockProfile(createMockProfile(), true);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should forward error from useSupabaseProfile', () => {
      setupMockProfile(createMockProfile(), false, 'Database connection failed');

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.error).toBe('Database connection failed');
    });
  });

  // ===========================================================================
  // Preference Setter Tests
  // ===========================================================================

  describe('setPreferredWeightUnit', () => {
    it('should update weight unit to "oz" successfully', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('oz');
        expect(response.error).toBeNull();
      });

      expect(mockUpdateProfile).toHaveBeenCalledTimes(1);
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferred_weight_unit: 'oz',
      });
    });

    it('should update weight unit to "lb" successfully', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('lb');
        expect(response.error).toBeNull();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferred_weight_unit: 'lb',
      });
    });

    it('should update weight unit to "g" successfully', async () => {
      setupMockProfile(createMockProfile('oz'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('g');
        expect(response.error).toBeNull();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferred_weight_unit: 'g',
      });
    });

    it('should return error when userId is null', async () => {
      setupMockProfile(null, false);

      const { result } = renderHook(() => useUserPreferences(null));

      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('oz');
        expect(response.error).toBe('No user ID provided');
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should validate weight unit and reject invalid value', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        // @ts-expect-error - Testing invalid input
        const response = await result.current.setPreferredWeightUnit('kg');
        expect(response.error).toBe('Invalid weight unit. Must be g, oz, or lb.');
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should validate weight unit and reject empty string', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        // @ts-expect-error - Testing invalid input
        const response = await result.current.setPreferredWeightUnit('');
        expect(response.error).toBe('Invalid weight unit. Must be g, oz, or lb.');
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('should forward error from updateProfile', async () => {
      setupMockProfile(createMockProfile('g'), false);
      mockUpdateProfile.mockResolvedValueOnce({ error: 'Update failed: Network error' });

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('oz');
        expect(response.error).toBe('Update failed: Network error');
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferred_weight_unit: 'oz',
      });
    });
  });

  // ===========================================================================
  // Refresh Preferences Tests
  // ===========================================================================

  describe('refreshPreferences', () => {
    it('should call refreshProfile when invoked', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        await result.current.refreshPreferences();
      });

      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    });

    it('should handle refresh errors gracefully', async () => {
      setupMockProfile(createMockProfile('g'), false);
      mockRefreshProfile.mockRejectedValueOnce(new Error('Refresh failed'));

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      await act(async () => {
        await expect(result.current.refreshPreferences()).rejects.toThrow('Refresh failed');
      });

      expect(mockRefreshProfile).toHaveBeenCalledTimes(1);
    });
  });

  // ===========================================================================
  // Integration Tests
  // ===========================================================================

  describe('Integration', () => {
    it('should handle full preference update flow', async () => {
      // Start with grams
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.preferredWeightUnit).toBe('g');

      // Update to ounces
      await act(async () => {
        const response = await result.current.setPreferredWeightUnit('oz');
        expect(response.error).toBeNull();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        preferred_weight_unit: 'oz',
      });

      // Simulate profile refresh after update
      await act(async () => {
        await result.current.refreshPreferences();
      });

      expect(mockRefreshProfile).toHaveBeenCalled();
    });

    it('should maintain preference stability across multiple renders', () => {
      setupMockProfile(createMockProfile('lb'), false);

      const { result, rerender } = renderHook(() => useUserPreferences('user-123-uuid'));

      const firstPreference = result.current.preferredWeightUnit;
      expect(firstPreference).toBe('lb');

      // Re-render without changing props
      rerender();

      expect(result.current.preferredWeightUnit).toBe('lb');
      expect(result.current.preferredWeightUnit).toBe(firstPreference);
    });

    it('should handle userId change from null to valid', async () => {
      setupMockProfile(null, false);

      const { result, rerender } = renderHook(
        ({ userId }) => useUserPreferences(userId),
        { initialProps: { userId: null } }
      );

      expect(result.current.preferredWeightUnit).toBe('g');

      // Change userId to valid value
      setupMockProfile(createMockProfile('oz'), false);
      rerender({ userId: 'user-123-uuid' });

      await waitFor(() => {
        expect(result.current.preferredWeightUnit).toBe('oz');
      });
    });

    it('should handle concurrent preference updates', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      // Simulate concurrent updates
      const updates = [
        result.current.setPreferredWeightUnit('oz'),
        result.current.setPreferredWeightUnit('lb'),
      ];

      await act(async () => {
        const results = await Promise.all(updates);
        results.forEach((res) => expect(res.error).toBeNull());
      });

      // Both updates should have been called
      expect(mockUpdateProfile).toHaveBeenCalledTimes(2);
      expect(mockUpdateProfile).toHaveBeenNthCalledWith(1, {
        preferred_weight_unit: 'oz',
      });
      expect(mockUpdateProfile).toHaveBeenNthCalledWith(2, {
        preferred_weight_unit: 'lb',
      });
    });
  });

  // ===========================================================================
  // Edge Case Tests
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle profile with all valid weight units', async () => {
      const units: Array<'g' | 'oz' | 'lb'> = ['g', 'oz', 'lb'];

      for (const unit of units) {
        setupMockProfile(createMockProfile(unit), false);

        const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

        expect(result.current.preferredWeightUnit).toBe(unit);
      }
    });

    it('should handle rapid preference changes', async () => {
      setupMockProfile(createMockProfile('g'), false);

      const { result } = renderHook(() => useUserPreferences('user-123-uuid'));

      // Rapid sequential updates
      await act(async () => {
        await result.current.setPreferredWeightUnit('oz');
        await result.current.setPreferredWeightUnit('lb');
        await result.current.setPreferredWeightUnit('g');
      });

      expect(mockUpdateProfile).toHaveBeenCalledTimes(3);
    });

    it('should handle profile loading state transition', async () => {
      setupMockProfile(createMockProfile('g'), true);

      const { result, rerender } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.isLoading).toBe(true);

      // Transition to loaded state
      setupMockProfile(createMockProfile('oz'), false);
      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.preferredWeightUnit).toBe('oz');
      });
    });

    it('should handle error state transition', async () => {
      setupMockProfile(createMockProfile('g'), false, null);

      const { result, rerender } = renderHook(() => useUserPreferences('user-123-uuid'));

      expect(result.current.error).toBeNull();

      // Transition to error state
      setupMockProfile(createMockProfile('g'), false, 'Connection timeout');
      rerender();

      await waitFor(() => {
        expect(result.current.error).toBe('Connection timeout');
      });
    });
  });
});
