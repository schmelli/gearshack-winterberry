/**
 * useWishlistItemOffers Hook Tests
 *
 * Tests for fetching top 3 merchant offers for a wishlist item.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWishlistItemOffers } from '@/hooks/offers/useWishlistItemOffers';

// =============================================================================
// Mocks
// =============================================================================

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGt = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: mockSelect,
  })),
};

mockSelect.mockReturnValue({ eq: mockEq });
mockEq.mockReturnValue({ in: mockIn });
mockIn.mockReturnValue({ gt: mockGt });
mockGt.mockReturnValue({ order: mockOrder });
mockOrder.mockReturnValue({ limit: mockLimit });

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => mockSupabase,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockOffersData = [
  {
    id: 'offer-1',
    offer_price: 99.99,
    regular_price: 129.99,
    expires_at: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    merchant: {
      id: 'merchant-1',
      business_name: 'REI',
    },
  },
  {
    id: 'offer-2',
    offer_price: 109.99,
    regular_price: 149.99,
    expires_at: new Date(Date.now() + 172800000).toISOString(), // 2 days
    merchant: {
      id: 'merchant-2',
      business_name: 'Backcountry',
    },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useWishlistItemOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLimit.mockResolvedValue({ data: [], error: null });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty offers initially', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockLimit.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Fetch Behavior Tests
  // ===========================================================================

  describe('Fetch Behavior', () => {
    it('should not fetch when wishlistItemId is null', async () => {
      const { result } = renderHook(() => useWishlistItemOffers(null));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
      expect(result.current.offers).toEqual([]);
    });

    it('should not fetch when wishlistItemId is undefined', async () => {
      const { result } = renderHook(() => useWishlistItemOffers(undefined));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should not fetch when enabled is false', async () => {
      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123', false));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).not.toHaveBeenCalled();
    });

    it('should fetch offers for valid wishlistItemId', async () => {
      mockLimit.mockResolvedValue({ data: mockOffersData, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('merchant_offers');
      expect(mockEq).toHaveBeenCalledWith('wishlist_item_id', 'wishlist-123');
    });

    it('should limit results to 3 offers', async () => {
      mockLimit.mockResolvedValue({ data: mockOffersData, error: null });

      renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(mockLimit).toHaveBeenCalledWith(3);
      });
    });
  });

  // ===========================================================================
  // Data Transformation Tests
  // ===========================================================================

  describe('Data Transformation', () => {
    it('should transform offers data correctly', async () => {
      mockLimit.mockResolvedValue({ data: mockOffersData, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toHaveLength(2);
      expect(result.current.offers[0]).toEqual({
        id: 'offer-1',
        merchantId: 'merchant-1',
        merchantName: 'REI',
        offerPrice: 99.99,
        regularPrice: 129.99,
        discountPercent: 23, // (129.99 - 99.99) / 129.99 * 100 = 23.08%
        expiresAt: expect.any(String),
      });
    });

    it('should calculate discount percent correctly', async () => {
      const testData = [
        {
          id: 'offer-1',
          offer_price: 50,
          regular_price: 100,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          merchant: { id: 'm1', business_name: 'Test' },
        },
      ];
      mockLimit.mockResolvedValue({ data: testData, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers[0].discountPercent).toBe(50);
    });

    it('should handle zero regular price', async () => {
      const testData = [
        {
          id: 'offer-1',
          offer_price: 50,
          regular_price: 0,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          merchant: { id: 'm1', business_name: 'Test' },
        },
      ];
      mockLimit.mockResolvedValue({ data: testData, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers[0].discountPercent).toBe(0);
    });

    it('should handle null prices as 0', async () => {
      const testData = [
        {
          id: 'offer-1',
          offer_price: null,
          regular_price: null,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          merchant: { id: 'm1', business_name: 'Test' },
        },
      ];
      mockLimit.mockResolvedValue({ data: testData, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers[0].offerPrice).toBe(0);
      expect(result.current.offers[0].regularPrice).toBe(0);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set error on fetch failure', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: '500' },
      });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load offers');
      expect(result.current.offers).toEqual([]);
    });

    it('should silently handle missing table error', async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: 'relation "merchant_offers" does not exist', code: '42P01' },
      });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
      expect(result.current.offers).toEqual([]);
    });

    it('should handle null data gracefully', async () => {
      mockLimit.mockResolvedValue({ data: null, error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('Refresh', () => {
    it('should provide a refresh function', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(typeof result.current.refresh).toBe('function');
    });

    it('should refetch data when refresh is called', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result } = renderHook(() => useWishlistItemOffers('wishlist-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockSupabase.from).toHaveBeenCalledTimes(initialCallCount + 1);
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when wishlistItemId changes', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result, rerender } = renderHook(
        ({ id }) => useWishlistItemOffers(id),
        { initialProps: { id: 'wishlist-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      rerender({ id: 'wishlist-2' });

      await waitFor(() => {
        expect(mockSupabase.from.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('should not refetch when same wishlistItemId is provided', async () => {
      mockLimit.mockResolvedValue({ data: [], error: null });

      const { result, rerender } = renderHook(
        ({ id }) => useWishlistItemOffers(id),
        { initialProps: { id: 'wishlist-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockSupabase.from.mock.calls.length;

      rerender({ id: 'wishlist-1' });

      // Should not make additional calls
      expect(mockSupabase.from.mock.calls.length).toBe(initialCallCount);
    });
  });
});
