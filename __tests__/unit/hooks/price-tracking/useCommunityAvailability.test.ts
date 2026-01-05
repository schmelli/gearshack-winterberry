/**
 * useCommunityAvailability Hook Tests
 *
 * Tests for community availability data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCommunityAvailability } from '@/hooks/price-tracking/useCommunityAvailability';

// =============================================================================
// Mocks
// =============================================================================

const mockSelectChain = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'community_availability') {
      return { select: mockSelectChain };
    }
    return {};
  }),
};

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockAvailabilityData = {
  gear_item_id: 'gear-123',
  total_listings: 5,
  for_sale_count: 2,
  for_trade_count: 3,
  average_price: 89.99,
  lowest_price: 59.99,
  highest_price: 119.99,
  last_updated: '2024-01-15T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useCommunityAvailability', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: no availability data
    mockSelectChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return null availability initially', async () => {
      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availability).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should not fetch when gearItemId is empty', async () => {
      const { result } = renderHook(() => useCommunityAvailability(''));

      // The hook stays in loading state when gearItemId is empty
      // because useEffect doesn't call loadAvailability which would set isLoading to false
      expect(result.current.isLoading).toBe(true);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Fetch Availability Tests
  // ===========================================================================

  describe('Fetch Availability', () => {
    it('should fetch availability data on mount', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAvailabilityData,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('community_availability');
      expect(result.current.availability).toEqual(mockAvailabilityData);
    });

    it('should return availability with correct fields', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAvailabilityData,
            error: null,
          }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availability?.total_listings).toBe(5);
      expect(result.current.availability?.for_sale_count).toBe(2);
      expect(result.current.availability?.for_trade_count).toBe(3);
      expect(result.current.availability?.average_price).toBe(89.99);
      expect(result.current.availability?.lowest_price).toBe(59.99);
      expect(result.current.availability?.highest_price).toBe(119.99);
    });

    it('should handle null data gracefully', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availability).toBeNull();
      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set error on fetch failure', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should clear error on successful refresh', async () => {
      // First fetch fails
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      // Second fetch succeeds
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAvailabilityData,
            error: null,
          }),
        }),
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch availability data', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should update availability after refresh', async () => {
      // Initial: no availability
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result } = renderHook(() => useCommunityAvailability('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.availability).toBeNull();

      // After refresh: has availability
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: mockAvailabilityData,
            error: null,
          }),
        }),
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.availability).toEqual(mockAvailabilityData);
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when gearItemId changes', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result, rerender } = renderHook(
        ({ id }) => useCommunityAvailability(id),
        { initialProps: { id: 'gear-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      rerender({ id: 'gear-2' });

      await waitFor(() => {
        expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should not refetch when same gearItemId is provided', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result, rerender } = renderHook(
        ({ id }) => useCommunityAvailability(id),
        { initialProps: { id: 'gear-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockSupabase.from.mock.calls.length;

      rerender({ id: 'gear-1' });

      // Should not make additional calls
      expect(mockSupabase.from.mock.calls.length).toBe(callCount);
    });
  });
});
