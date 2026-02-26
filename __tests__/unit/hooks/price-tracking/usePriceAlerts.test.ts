/**
 * usePriceAlerts Hook Tests
 *
 * Tests for price alerts management (fetch, mark as read, mark as clicked).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceAlerts } from '@/hooks/price-tracking/usePriceAlerts';

// =============================================================================
// Mocks
// =============================================================================

const mockSelectChain = vi.fn();
const mockUpdateChain = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'price_alerts') {
      return {
        select: mockSelectChain,
        update: mockUpdateChain,
      };
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

const mockAlertsData = [
  {
    id: 'alert-1',
    tracking_id: 'tracking-1',
    alert_type: 'price_drop',
    previous_price: 150,
    new_price: 120,
    created_at: '2024-01-01T00:00:00Z',
    opened_at: null,
    clicked_at: null,
  },
  {
    id: 'alert-2',
    tracking_id: 'tracking-2',
    alert_type: 'price_drop',
    previous_price: 200,
    new_price: 180,
    created_at: '2024-01-02T00:00:00Z',
    opened_at: '2024-01-02T01:00:00Z',
    clicked_at: null,
  },
  {
    id: 'alert-3',
    tracking_id: 'tracking-3',
    alert_type: 'back_in_stock',
    previous_price: null,
    new_price: 100,
    created_at: '2024-01-03T00:00:00Z',
    opened_at: '2024-01-03T01:00:00Z',
    clicked_at: '2024-01-03T02:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('usePriceAlerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: empty alerts
    mockSelectChain.mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    mockUpdateChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty alerts initially', async () => {
      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.alerts).toEqual([]);
      expect(result.current.error).toBeNull();
      expect(result.current.unreadCount).toBe(0);
    });

    it('should start with isLoading true', () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Fetch Alerts Tests
  // ===========================================================================

  describe('Fetch Alerts', () => {
    it('should fetch alerts on mount', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('price_alerts');
      expect(result.current.alerts).toHaveLength(3);
    });

    it('should calculate unread count correctly', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Only alert-1 has opened_at: null
      expect(result.current.unreadCount).toBe(1);
    });

    it('should handle fetch error', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' },
          }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
    });

    it('should handle null data gracefully', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.alerts).toEqual([]);
    });
  });

  // ===========================================================================
  // Mark As Read Tests
  // ===========================================================================

  describe('markAsRead', () => {
    it('should mark alert as read', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      const mockEq = vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      });
      mockUpdateChain.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsRead('alert-1');
      });

      expect(mockUpdateChain).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'alert-1');
    });

    it('should handle mark as read error', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      mockUpdateChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsRead('alert-1');
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  // ===========================================================================
  // Mark As Clicked Tests
  // ===========================================================================

  describe('markAsClicked', () => {
    it('should mark alert as clicked', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      const mockEq = vi.fn().mockReturnValue({
        is: vi.fn().mockResolvedValue({ error: null }),
      });
      mockUpdateChain.mockReturnValue({ eq: mockEq });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsClicked('alert-2');
      });

      expect(mockUpdateChain).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith('id', 'alert-2');
    });

    it('should handle mark as clicked error', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: mockAlertsData, error: null }),
        }),
      });

      mockUpdateChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.markAsClicked('alert-2');
      });

      expect(result.current.error).not.toBeNull();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch alerts', async () => {
      mockSelectChain.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const { result } = renderHook(() => usePriceAlerts());

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
});
