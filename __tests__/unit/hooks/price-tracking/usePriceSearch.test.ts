/**
 * usePriceSearch Hook Tests
 *
 * Tests for price search with state machine.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePriceSearch } from '@/hooks/price-tracking/usePriceSearch';

// =============================================================================
// Mocks
// =============================================================================

const mockFetch = vi.fn();
global.fetch = mockFetch;

// =============================================================================
// Test Data
// =============================================================================

const mockSearchRequest = {
  query: 'hiking backpack',
  brand: 'Osprey',
  category: 'backpacks',
  price_min: 50,
  price_max: 200,
};

const mockSuccessResults = {
  status: 'success',
  results: [
    {
      id: 'result-1',
      source: 'google_shopping',
      name: 'Osprey Atmos AG 65',
      price: 149.99,
      url: 'https://example.com/product-1',
    },
    {
      id: 'result-2',
      source: 'ebay',
      name: 'Osprey Exos 58',
      price: 129.99,
      url: 'https://example.com/product-2',
    },
  ],
  total_count: 2,
  search_time_ms: 250,
};

const mockPartialResults = {
  status: 'partial',
  results: [
    {
      id: 'result-1',
      source: 'google_shopping',
      name: 'Osprey Atmos AG 65',
      price: 149.99,
      url: 'https://example.com/product-1',
    },
  ],
  total_count: 1,
  search_time_ms: 500,
  errors: ['eBay API timeout'],
};

const mockErrorResults = {
  status: 'error',
  results: [],
  total_count: 0,
  search_time_ms: 0,
  errors: ['All sources failed'],
};

// =============================================================================
// Tests
// =============================================================================

describe('usePriceSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return initial state correctly', () => {
      const { result } = renderHook(() => usePriceSearch());

      expect(result.current.results).toBeNull();
      expect(result.current.status).toBe('idle');
      expect(result.current.error).toBeNull();
      expect(typeof result.current.searchPrices).toBe('function');
    });
  });

  // ===========================================================================
  // Search Success Tests
  // ===========================================================================

  describe('Successful Search', () => {
    it('should search prices successfully', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResults),
      });

      const { result } = renderHook(() => usePriceSearch());

      await act(async () => {
        await result.current.searchPrices(mockSearchRequest);
      });

      expect(mockFetch).toHaveBeenCalledWith('/api/price-tracking/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockSearchRequest),
      });

      expect(result.current.status).toBe('success');
      expect(result.current.results).toEqual(mockSuccessResults);
      expect(result.current.error).toBeNull();
    });

    it('should set loading status during search', async () => {
      let resolvePromise: (value: unknown) => void;
      mockFetch.mockReturnValue(
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
      );

      const { result } = renderHook(() => usePriceSearch());

      let searchPromise: Promise<void>;
      act(() => {
        searchPromise = result.current.searchPrices(mockSearchRequest);
      });

      // Should be loading while waiting
      expect(result.current.status).toBe('loading');

      // Resolve the promise
      await act(async () => {
        resolvePromise!({
          ok: true,
          json: () => Promise.resolve(mockSuccessResults),
        });
        await searchPromise;
      });

      expect(result.current.status).toBe('success');
    });
  });

  // ===========================================================================
  // Partial Results Tests
  // ===========================================================================

  describe('Partial Results', () => {
    it('should handle partial results correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockPartialResults),
      });

      const { result } = renderHook(() => usePriceSearch());

      await act(async () => {
        await result.current.searchPrices(mockSearchRequest);
      });

      expect(result.current.status).toBe('partial');
      expect(result.current.results).toEqual(mockPartialResults);
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('Error Handling', () => {
    it('should handle API error results', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockErrorResults),
      });

      const { result } = renderHook(() => usePriceSearch());

      await act(async () => {
        await result.current.searchPrices(mockSearchRequest);
      });

      expect(result.current.status).toBe('error');
      expect(result.current.results).toEqual(mockErrorResults);
    });

    it('should handle HTTP error response', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        statusText: 'Internal Server Error',
      });

      const { result } = renderHook(() => usePriceSearch());

      // Catch inside act to let React flush state updates
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.searchPrices(mockSearchRequest);
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Search failed: Internal Server Error');
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('Search failed: Internal Server Error');
    });

    it('should handle network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => usePriceSearch());

      // Catch inside act to let React flush state updates
      let thrownError: Error | undefined;
      await act(async () => {
        try {
          await result.current.searchPrices(mockSearchRequest);
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError?.message).toBe('Network error');
      expect(result.current.status).toBe('error');
      expect(result.current.error?.message).toBe('Network error');
    });

    it('should clear error before new search', async () => {
      // First search fails
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      });

      const { result } = renderHook(() => usePriceSearch());

      // Catch inside act to let React flush state updates
      await act(async () => {
        try {
          await result.current.searchPrices(mockSearchRequest);
        } catch {
          // Expected error
        }
      });

      expect(result.current.error).not.toBeNull();

      // Second search succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockSuccessResults),
      });

      await act(async () => {
        await result.current.searchPrices(mockSearchRequest);
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // State Machine Tests
  // ===========================================================================

  describe('State Machine', () => {
    it('should transition from idle to loading to success', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResults),
      });

      const { result } = renderHook(() => usePriceSearch());

      // Initial state
      expect(result.current.status).toBe('idle');

      // During search
      let searchPromise: Promise<void>;
      act(() => {
        searchPromise = result.current.searchPrices(mockSearchRequest);
      });

      expect(result.current.status).toBe('loading');

      // After search
      await act(async () => {
        await searchPromise;
      });

      expect(result.current.status).toBe('success');
    });

    it('should transition from idle to loading to error', async () => {
      mockFetch.mockRejectedValue(new Error('Failed'));

      const { result } = renderHook(() => usePriceSearch());

      expect(result.current.status).toBe('idle');

      // Catch inside act to let React flush state updates
      await act(async () => {
        try {
          await result.current.searchPrices(mockSearchRequest);
        } catch {
          // Expected error
        }
      });

      expect(result.current.status).toBe('error');
    });

    it('should allow multiple searches', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockSuccessResults),
      });

      const { result } = renderHook(() => usePriceSearch());

      // First search
      await act(async () => {
        await result.current.searchPrices({ ...mockSearchRequest, query: 'first' });
      });

      expect(result.current.status).toBe('success');

      // Second search
      await act(async () => {
        await result.current.searchPrices({ ...mockSearchRequest, query: 'second' });
      });

      expect(result.current.status).toBe('success');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});
