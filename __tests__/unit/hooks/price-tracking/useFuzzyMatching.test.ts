/**
 * useFuzzyMatching Hook Tests
 *
 * Tests for fuzzy match confirmation flow.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useFuzzyMatching } from '@/hooks/price-tracking/useFuzzyMatching';

// =============================================================================
// Mocks
// =============================================================================

const mockConfirmProductMatch = vi.fn();

vi.mock('@/lib/supabase/price-tracking-queries', () => ({
  confirmProductMatch: (request: unknown) => mockConfirmProductMatch(request),
}));

// =============================================================================
// Test Data
// =============================================================================

const mockConfirmRequest = {
  tracking_id: 'tracking-123',
  product_id: 'product-456',
  confirmed_name: 'Test Product',
  confidence_score: 0.95,
};

// =============================================================================
// Tests
// =============================================================================

describe('useFuzzyMatching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirmProductMatch.mockResolvedValue(undefined);
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => useFuzzyMatching());

      expect(result.current.isConfirming).toBe(false);
      expect(result.current.error).toBeNull();
      expect(typeof result.current.confirmMatch).toBe('function');
      expect(typeof result.current.skipMatch).toBe('function');
    });
  });

  // ===========================================================================
  // Confirm Match Tests
  // ===========================================================================

  describe('confirmMatch', () => {
    it('should confirm match successfully', async () => {
      const { result } = renderHook(() => useFuzzyMatching());

      await act(async () => {
        await result.current.confirmMatch(mockConfirmRequest);
      });

      expect(mockConfirmProductMatch).toHaveBeenCalledWith(mockConfirmRequest);
      expect(result.current.isConfirming).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should set isConfirming during confirmation', async () => {
      let resolvePromise: () => void;
      mockConfirmProductMatch.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => useFuzzyMatching());

      let confirmPromise: Promise<void>;
      act(() => {
        confirmPromise = result.current.confirmMatch(mockConfirmRequest);
      });

      // Should be confirming while waiting
      expect(result.current.isConfirming).toBe(true);

      // Resolve the promise
      await act(async () => {
        resolvePromise!();
        await confirmPromise;
      });

      expect(result.current.isConfirming).toBe(false);
    });

    it('should handle confirmation error', async () => {
      mockConfirmProductMatch.mockRejectedValue(new Error('Confirmation failed'));

      const { result } = renderHook(() => useFuzzyMatching());

      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.confirmMatch(mockConfirmRequest);
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Confirmation failed');
      expect(result.current.error?.message).toBe('Confirmation failed');
      expect(result.current.isConfirming).toBe(false);
    });

    it('should clear error before new confirmation', async () => {
      mockConfirmProductMatch.mockRejectedValueOnce(new Error('First error'));

      const { result } = renderHook(() => useFuzzyMatching());

      // First confirmation fails
      await act(async () => {
        try {
          await result.current.confirmMatch(mockConfirmRequest);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // Second confirmation succeeds
      mockConfirmProductMatch.mockResolvedValueOnce(undefined);

      await act(async () => {
        await result.current.confirmMatch(mockConfirmRequest);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Skip Match Tests
  // ===========================================================================

  describe('skipMatch', () => {
    it('should clear error when skipping', async () => {
      mockConfirmProductMatch.mockRejectedValue(new Error('Previous error'));

      const { result } = renderHook(() => useFuzzyMatching());

      // First, create an error state
      await act(async () => {
        try {
          await result.current.confirmMatch(mockConfirmRequest);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // Now skip the match
      act(() => {
        result.current.skipMatch();
      });

      expect(result.current.error).toBeNull();
    });

    it('should work when no error exists', () => {
      const { result } = renderHook(() => useFuzzyMatching());

      // Should not throw
      act(() => {
        result.current.skipMatch();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Multiple Operations Tests
  // ===========================================================================

  describe('Multiple Operations', () => {
    it('should handle multiple confirmations sequentially', async () => {
      const { result } = renderHook(() => useFuzzyMatching());

      await act(async () => {
        await result.current.confirmMatch({ ...mockConfirmRequest, product_id: 'product-1' });
      });

      await act(async () => {
        await result.current.confirmMatch({ ...mockConfirmRequest, product_id: 'product-2' });
      });

      expect(mockConfirmProductMatch).toHaveBeenCalledTimes(2);
      expect(result.current.isConfirming).toBe(false);
    });
  });
});
