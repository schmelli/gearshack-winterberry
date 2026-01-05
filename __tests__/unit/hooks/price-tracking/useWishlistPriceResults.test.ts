/**
 * useWishlistPriceResults Hook Tests
 *
 * Tests for fetching top 3 price results for wishlist items.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWishlistPriceResults } from '@/hooks/price-tracking/useWishlistPriceResults';

// =============================================================================
// Mocks
// =============================================================================

const mockTrackingSelect = vi.fn();
const mockResultsSelect = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'price_tracking') {
      return { select: mockTrackingSelect };
    }
    if (table === 'price_results') {
      return { select: mockResultsSelect };
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

const mockTrackingData = { id: 'tracking-123' };

const mockPriceResultsData = [
  {
    id: 'result-1',
    tracking_id: 'tracking-123',
    source_type: 'google_shopping',
    source_name: 'Google Shopping',
    source_url: 'https://google.com/shopping/1',
    price_amount: 99.99,
    price_currency: 'USD',
    shipping_cost: 5.99,
    shipping_currency: 'USD',
    total_price: 105.98,
    product_name: 'Test Product 1',
    product_image_url: 'https://example.com/image1.jpg',
    product_condition: 'new',
    is_local: false,
    shop_latitude: null,
    shop_longitude: null,
    distance_km: null,
    fetched_at: '2024-01-01T00:00:00Z',
    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
  },
  {
    id: 'result-2',
    tracking_id: 'tracking-123',
    source_type: 'ebay',
    source_name: 'eBay',
    source_url: 'https://ebay.com/item/2',
    price_amount: 89.99,
    price_currency: 'USD',
    shipping_cost: 10.0,
    shipping_currency: 'USD',
    total_price: 99.99,
    product_name: 'Test Product 2',
    product_image_url: 'https://example.com/image2.jpg',
    product_condition: 'used',
    is_local: false,
    shop_latitude: null,
    shop_longitude: null,
    distance_km: null,
    fetched_at: '2024-01-01T00:00:00Z',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useWishlistPriceResults', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: no tracking
    mockTrackingSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });

    mockResultsSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gt: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty price results initially', async () => {
      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.priceResults).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockReturnValue(new Promise(() => {})),
          }),
        }),
      });

      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should handle empty gearItemId', async () => {
      const { result } = renderHook(() => useWishlistPriceResults(''));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.priceResults).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Fetch Behavior Tests
  // ===========================================================================

  describe('Fetch Behavior', () => {
    it('should return empty results when no tracking exists', async () => {
      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.priceResults).toEqual([]);
    });

    it('should fetch price results when tracking exists', async () => {
      // Mock tracking exists
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockTrackingData, error: null }),
          }),
        }),
      });

      // Mock price results
      mockResultsSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: mockPriceResultsData, error: null }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.priceResults).toHaveLength(2);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set error on tracking fetch failure', async () => {
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Tracking error' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Failed to fetch tracking data');
    });

    it('should set error on results fetch failure', async () => {
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockTrackingData, error: null }),
          }),
        }),
      });

      mockResultsSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Results error' },
              }),
            }),
          }),
        }),
      });

      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toContain('Failed to fetch price results');
    });

    it('should handle validation failure gracefully', async () => {
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: mockTrackingData, error: null }),
          }),
        }),
      });

      // Return invalid data that won't pass Zod validation
      mockResultsSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gt: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'invalid', missing_required_fields: true }],
                error: null,
              }),
            }),
          }),
        }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Should gracefully degrade to empty results
      expect(result.current.priceResults).toEqual([]);

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch price results', async () => {
      const { result } = renderHook(() => useWishlistPriceResults('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when gearItemId changes', async () => {
      const { result, rerender } = renderHook(
        ({ id }) => useWishlistPriceResults(id),
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
  });
});
