/**
 * usePriceHistory Hook Tests
 *
 * Tests for historical price data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceHistory } from '@/hooks/price-tracking/usePriceHistory';

// =============================================================================
// Mocks
// =============================================================================

const mockGetPriceHistory = vi.fn();

vi.mock('@/lib/supabase/price-tracking-queries', () => ({
  getPriceHistory: (trackingId: string, days: number) => mockGetPriceHistory(trackingId, days),
}));

vi.mock('@/lib/constants/price-tracking', () => ({
  HISTORY_CONFIG: {
    DEFAULT_DISPLAY_DAYS: 30,
    MAX_HISTORY_DAYS: 90,
  },
}));

// =============================================================================
// Test Data
// =============================================================================

const mockHistoryData = [
  {
    id: 'history-1',
    tracking_id: 'tracking-123',
    price_amount: 99.99,
    price_currency: 'USD',
    source_name: 'REI',
    recorded_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'history-2',
    tracking_id: 'tracking-123',
    price_amount: 109.99,
    price_currency: 'USD',
    source_name: 'REI',
    recorded_at: '2024-01-15T00:00:00Z',
  },
  {
    id: 'history-3',
    tracking_id: 'tracking-123',
    price_amount: 89.99,
    price_currency: 'USD',
    source_name: 'Backcountry',
    recorded_at: '2024-01-30T00:00:00Z',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('usePriceHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPriceHistory.mockResolvedValue([]);
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty history initially', async () => {
      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history).toEqual([]);
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockGetPriceHistory.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should not fetch when trackingId is empty', async () => {
      const { result } = renderHook(() => usePriceHistory(''));

      // Wait a tick for useEffect to run
      await waitFor(() => {
        // The hook doesn't fetch when trackingId is empty
        expect(mockGetPriceHistory).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Fetch History Tests
  // ===========================================================================

  describe('Fetch History', () => {
    it('should fetch history on mount with default days', async () => {
      mockGetPriceHistory.mockResolvedValue(mockHistoryData);

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith('tracking-123', 30);
      expect(result.current.history).toHaveLength(3);
    });

    it('should return transformed history data', async () => {
      mockGetPriceHistory.mockResolvedValue(mockHistoryData);

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.history[0]).toEqual({
        id: 'history-1',
        tracking_id: 'tracking-123',
        price_amount: 99.99,
        price_currency: 'USD',
        source_name: 'REI',
        recorded_at: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle fetch error', async () => {
      mockGetPriceHistory.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Fetch failed');
    });
  });

  // ===========================================================================
  // fetchHistory Method Tests
  // ===========================================================================

  describe('fetchHistory', () => {
    it('should fetch with custom days parameter', async () => {
      mockGetPriceHistory.mockResolvedValue(mockHistoryData);

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchHistory(60);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith('tracking-123', 60);
    });

    it('should use default days when not specified', async () => {
      mockGetPriceHistory.mockResolvedValue(mockHistoryData);

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.fetchHistory();
      });

      // Should be called with default 30 days
      expect(mockGetPriceHistory).toHaveBeenLastCalledWith('tracking-123', 30);
    });

    it('should update loading state during fetch', async () => {
      let resolvePromise: (value: unknown[]) => void;
      mockGetPriceHistory.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      // Initially loading
      expect(result.current.isLoading).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!(mockHistoryData);
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should clear error on successful fetch', async () => {
      mockGetPriceHistory.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => usePriceHistory('tracking-123'));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      mockGetPriceHistory.mockResolvedValueOnce(mockHistoryData);

      await act(async () => {
        await result.current.fetchHistory();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when trackingId changes', async () => {
      mockGetPriceHistory.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        ({ id }) => usePriceHistory(id),
        { initialProps: { id: 'tracking-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPriceHistory).toHaveBeenCalledWith('tracking-1', 30);

      rerender({ id: 'tracking-2' });

      await waitFor(() => {
        expect(mockGetPriceHistory).toHaveBeenCalledWith('tracking-2', 30);
      });
    });

    it('should not refetch when same trackingId is provided', async () => {
      mockGetPriceHistory.mockResolvedValue([]);

      const { result, rerender } = renderHook(
        ({ id }) => usePriceHistory(id),
        { initialProps: { id: 'tracking-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const callCount = mockGetPriceHistory.mock.calls.length;

      rerender({ id: 'tracking-1' });

      // Should not make additional calls
      expect(mockGetPriceHistory.mock.calls.length).toBe(callCount);
    });
  });
});
