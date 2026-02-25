/**
 * useAlertPreferences Hook Tests
 *
 * Tests for alert preferences management via API endpoints.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAlertPreferences } from '@/hooks/price-tracking/useAlertPreferences';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Data
// =============================================================================

const mockPreferences = {
  id: 'pref-123',
  user_id: 'user-123',
  email_enabled: true,
  push_enabled: true,
  price_drop_threshold: 10,
  frequency: 'immediate',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

// =============================================================================
// Tests
// =============================================================================

describe('useAlertPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock: successful fetch
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPreferences),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return null preferences initially', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(null),
      });

      const { result } = renderHook(() => useAlertPreferences());

      // Wait for initial loading
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.preferences).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should start with isLoading true', () => {
      mockFetch.mockReturnValue(new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAlertPreferences());

      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Fetch Preferences Tests
  // ===========================================================================

  describe('Fetch Preferences', () => {
    it('should fetch preferences on mount', async () => {
      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/alerts/preferences');
      expect(result.current.preferences).toEqual(mockPreferences);
    });

    it('should handle fetch failure', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Not Found',
      });

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.message).toBe('Failed to fetch preferences');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error?.message).toBe('Network error');
    });
  });

  // ===========================================================================
  // Update Preferences Tests
  // ===========================================================================

  describe('updatePreferences', () => {
    it('should update preferences successfully', async () => {
      const updatedPreferences = { ...mockPreferences, price_drop_threshold: 15 };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedPreferences),
        });

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.updatePreferences({ price_drop_threshold: 15 });
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/alerts/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price_drop_threshold: 15 }),
      });

      expect(result.current.preferences?.price_drop_threshold).toBe(15);
    });

    it('should handle update failure', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        })
        .mockResolvedValueOnce({
          ok: false,
          statusText: 'Bad Request',
        });

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.updatePreferences({ price_drop_threshold: -1 });
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Failed to update preferences');
      expect(result.current.error?.message).toBe('Failed to update preferences');
    });

    it('should clear error before update', async () => {
      mockFetch
        .mockRejectedValueOnce(new Error('Initial error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        });

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.error).not.toBeNull();
      });

      await act(async () => {
        await result.current.updatePreferences({ email_enabled: false });
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch preferences', async () => {
      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      const initialCallCount = mockFetch.mock.calls.length;

      await act(async () => {
        await result.current.refresh();
      });

      expect(mockFetch.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    it('should update preferences after refresh', async () => {
      const updatedPreferences = { ...mockPreferences, email_enabled: false };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPreferences),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(updatedPreferences),
        });

      const { result } = renderHook(() => useAlertPreferences());

      await waitFor(() => {
        expect(result.current.preferences?.email_enabled).toBe(true);
      });

      await act(async () => {
        await result.current.refresh();
      });

      expect(result.current.preferences?.email_enabled).toBe(false);
    });
  });
});
