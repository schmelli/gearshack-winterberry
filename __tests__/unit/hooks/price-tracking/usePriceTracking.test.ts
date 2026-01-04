/**
 * usePriceTracking Hook Tests
 *
 * Tests for price tracking management (enable, disable, toggle alerts).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePriceTracking } from '@/hooks/price-tracking/usePriceTracking';

// =============================================================================
// Mocks
// =============================================================================

const mockPriceTrackingStatus = {
  id: 'tracking-1',
  gear_item_id: 'gear-123',
  enabled: true,
  alerts_enabled: true,
  created_at: '2024-01-01T00:00:00Z',
};

const mockEnableTracking = vi.fn();
const mockDisableTracking = vi.fn();
const mockGetPriceTrackingStatus = vi.fn();
const mockToggleAlerts = vi.fn();

vi.mock('@/lib/supabase/price-tracking-queries', () => ({
  enablePriceTracking: (params: unknown) => mockEnableTracking(params),
  disablePriceTracking: (id: string) => mockDisableTracking(id),
  getPriceTrackingStatus: (id: string) => mockGetPriceTrackingStatus(id),
  toggleAlerts: (id: string, enabled: boolean) => mockToggleAlerts(id, enabled),
}));

// =============================================================================
// Tests
// =============================================================================

describe('usePriceTracking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetPriceTrackingStatus.mockResolvedValue(null);
    mockEnableTracking.mockResolvedValue(mockPriceTrackingStatus);
    mockDisableTracking.mockResolvedValue(undefined);
    mockToggleAlerts.mockResolvedValue({ ...mockPriceTrackingStatus, alerts_enabled: false });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return null tracking initially', async () => {
      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.tracking).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockGetPriceTrackingStatus.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      expect(result.current.isLoading).toBe(true);
    });

    it('should fetch tracking status on mount', async () => {
      mockGetPriceTrackingStatus.mockResolvedValue(mockPriceTrackingStatus);

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPriceTrackingStatus).toHaveBeenCalledWith('gear-123');
      expect(result.current.tracking).toEqual(mockPriceTrackingStatus);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set error on fetch failure', async () => {
      mockGetPriceTrackingStatus.mockRejectedValue(new Error('Fetch failed'));

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeInstanceOf(Error);
      expect(result.current.error?.message).toBe('Fetch failed');
    });

    it('should clear error on successful refresh', async () => {
      mockGetPriceTrackingStatus.mockRejectedValueOnce(new Error('Fetch failed'));

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      mockGetPriceTrackingStatus.mockResolvedValueOnce(mockPriceTrackingStatus);

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Enable Tracking Tests
  // ===========================================================================

  describe('enableTracking', () => {
    it('should enable tracking successfully', async () => {
      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enableTracking();
      });

      expect(mockEnableTracking).toHaveBeenCalledWith({
        gear_item_id: 'gear-123',
        alerts_enabled: true,
      });
      expect(result.current.tracking).toEqual(mockPriceTrackingStatus);
    });

    it('should enable tracking with alerts disabled', async () => {
      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.enableTracking(false);
      });

      expect(mockEnableTracking).toHaveBeenCalledWith({
        gear_item_id: 'gear-123',
        alerts_enabled: false,
      });
    });

    it('should handle enable error', async () => {
      mockEnableTracking.mockRejectedValue(new Error('Enable failed'));

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Catch inside act to let React flush state updates
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.enableTracking();
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Enable failed');
      expect(result.current.error?.message).toBe('Enable failed');
    });
  });

  // ===========================================================================
  // Disable Tracking Tests
  // ===========================================================================

  describe('disableTracking', () => {
    it('should disable tracking successfully', async () => {
      mockGetPriceTrackingStatus.mockResolvedValue(mockPriceTrackingStatus);

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.tracking).not.toBeNull();
      });

      await act(async () => {
        await result.current.disableTracking();
      });

      expect(mockDisableTracking).toHaveBeenCalledWith('gear-123');
      expect(result.current.tracking).toBeNull();
    });

    it('should handle disable error', async () => {
      mockGetPriceTrackingStatus.mockResolvedValue(mockPriceTrackingStatus);
      mockDisableTracking.mockRejectedValue(new Error('Disable failed'));

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.tracking).not.toBeNull();
      });

      // Catch inside act to let React flush state updates
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.disableTracking();
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Disable failed');
      expect(result.current.error?.message).toBe('Disable failed');
    });
  });

  // ===========================================================================
  // Toggle Alerts Tests
  // ===========================================================================

  describe('toggleAlerts', () => {
    it('should toggle alerts when tracking exists', async () => {
      mockGetPriceTrackingStatus.mockResolvedValue(mockPriceTrackingStatus);

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.tracking).not.toBeNull();
      });

      await act(async () => {
        await result.current.toggleAlerts(false);
      });

      expect(mockToggleAlerts).toHaveBeenCalledWith('tracking-1', false);
      expect(result.current.tracking?.alerts_enabled).toBe(false);
    });

    it('should do nothing when tracking is null', async () => {
      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.toggleAlerts(true);
      });

      expect(mockToggleAlerts).not.toHaveBeenCalled();
    });

    it('should handle toggle error', async () => {
      mockGetPriceTrackingStatus.mockResolvedValue(mockPriceTrackingStatus);
      mockToggleAlerts.mockRejectedValue(new Error('Toggle failed'));

      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.tracking).not.toBeNull();
      });

      // Catch inside act to let React flush state updates
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.toggleAlerts(false);
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Toggle failed');
      expect(result.current.error?.message).toBe('Toggle failed');
    });
  });

  // ===========================================================================
  // Re-render Tests
  // ===========================================================================

  describe('Re-renders', () => {
    it('should refetch when gearItemId changes', async () => {
      const { result, rerender } = renderHook(
        ({ id }) => usePriceTracking(id),
        { initialProps: { id: 'gear-1' } }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetPriceTrackingStatus).toHaveBeenCalledWith('gear-1');

      rerender({ id: 'gear-2' });

      await waitFor(() => {
        expect(mockGetPriceTrackingStatus).toHaveBeenCalledWith('gear-2');
      });
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch tracking status', async () => {
      const { result } = renderHook(() => usePriceTracking('gear-123'));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockGetPriceTrackingStatus.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockGetPriceTrackingStatus.mock.calls.length).toBeGreaterThan(initialCallCount);
    });
  });
});
