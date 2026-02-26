/**
 * usePersonalOffers Hook Tests
 *
 * Tests for personal offers from partner retailers.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersonalOffers } from '@/hooks/price-tracking/usePersonalOffers';

// =============================================================================
// Mocks
// =============================================================================

const mockUser = { id: 'user-123' };
const mockAuth = {
  getUser: vi.fn(),
};

const mockOffersSelect = vi.fn();
const mockOffersUpdate = vi.fn();
const mockTrackingSelect = vi.fn();

const mockSupabase = {
  auth: mockAuth,
  from: vi.fn((table: string) => {
    if (table === 'personal_offers') {
      return {
        select: mockOffersSelect,
        update: mockOffersUpdate,
      };
    }
    if (table === 'price_tracking') {
      return { select: mockTrackingSelect };
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

const mockOffersData = [
  {
    id: 'offer-1',
    user_id: 'user-123',
    tracking_id: 'tracking-1',
    offer_price: 99.99,
    original_price: 129.99,
    discount_percent: 23,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    expires_at: new Date(Date.now() + 86400000).toISOString(),
    partner_retailers: {
      name: 'REI',
      logo_url: 'https://rei.com/logo.png',
      website_url: 'https://rei.com',
    },
  },
  {
    id: 'offer-2',
    user_id: 'user-123',
    tracking_id: 'tracking-2',
    offer_price: 79.99,
    original_price: 99.99,
    discount_percent: 20,
    is_active: true,
    created_at: '2024-01-02T00:00:00Z',
    expires_at: new Date(Date.now() + 172800000).toISOString(),
    partner_retailers: {
      name: 'Backcountry',
      logo_url: 'https://backcountry.com/logo.png',
      website_url: 'https://backcountry.com',
    },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('usePersonalOffers', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: authenticated user
    mockAuth.getUser.mockResolvedValue({ data: { user: mockUser } });

    // Default mock: empty offers
    mockOffersSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    });

    mockOffersUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    mockTrackingSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty offers initially', async () => {
      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockAuth.getUser.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePersonalOffers());

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Authentication Tests
  // ===========================================================================

  describe('Authentication', () => {
    it('should set error when user is not authenticated', async () => {
      mockAuth.getUser.mockResolvedValue({ data: { user: null } });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('User not authenticated');
    });
  });

  // ===========================================================================
  // Fetch Offers Tests
  // ===========================================================================

  describe('Fetch Offers', () => {
    it('should fetch offers for authenticated user', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockOffersData, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('personal_offers');
      expect(result.current.offers).toHaveLength(2);
    });

    it('should filter by gear item when gearItemId provided', async () => {
      mockTrackingSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: { id: 'tracking-1' },
              error: null,
            }),
          }),
        }),
      });

      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [mockOffersData[0]], error: null }),
          }),
        }),
      });

      mockOffersSelect.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => usePersonalOffers('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('price_tracking');
    });

    it('should handle fetch error', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should handle null data gracefully', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.offers).toEqual([]);
    });
  });

  // ===========================================================================
  // Dismiss Offer Tests
  // ===========================================================================

  describe('dismissOffer', () => {
    it('should dismiss an offer successfully', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockOffersData, error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.offers).toHaveLength(2);
      });

      await act(async () => {
        await result.current.dismissOffer('offer-1');
      });

      expect(mockOffersUpdate).toHaveBeenCalled();
      expect(result.current.offers).toHaveLength(1);
      expect(result.current.offers.find((o) => o.id === 'offer-1')).toBeUndefined();
    });

    it('should handle dismiss error', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: mockOffersData, error: null }),
          }),
        }),
      });

      mockOffersUpdate.mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'Dismiss failed' } }),
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.offers).toHaveLength(2);
      });

      await expect(
        act(async () => {
          await result.current.dismissOffer('offer-1');
        })
      ).rejects.toThrow();

      consoleSpy.mockRestore();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch offers', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const { result } = renderHook(() => usePersonalOffers());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockAuth.getUser.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockAuth.getUser.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when gearItemId changes', async () => {
      mockOffersSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      });

      const { result, rerender } = renderHook(
        ({ id }) => usePersonalOffers(id),
        { initialProps: { id: undefined as string | undefined } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockAuth.getUser.mock.calls.length;

      rerender({ id: 'gear-123' });

      await waitFor(() => {
        expect(mockAuth.getUser.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });
  });
});
