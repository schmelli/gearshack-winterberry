/**
 * useOfferBlocking Hook Tests
 *
 * Tests for merchant blocking functionality.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useOfferBlocking } from '@/hooks/offers/useOfferBlocking';
import { toast } from 'sonner';

// =============================================================================
// Mocks
// =============================================================================

const mockUser = { id: 'user-123' };
const mockUseAuth = vi.fn(() => ({ user: mockUser }));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Supabase mock chain
const mockSelectChain = vi.fn();
const mockInsertChain = vi.fn();
const mockDeleteChain = vi.fn();

const mockSupabase = {
  from: vi.fn((table: string) => {
    if (table === 'merchant_blocks') {
      return {
        select: mockSelectChain,
        insert: mockInsertChain,
        delete: mockDeleteChain,
      };
    }
    if (table === 'merchants') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { business_name: 'Test Merchant', logo_url: 'logo.png' },
              error: null,
            }),
          }),
        }),
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

const mockBlockedData = [
  {
    id: 'block-1',
    merchant_id: 'merchant-1',
    reason: 'Poor service',
    created_at: '2024-01-01T00:00:00Z',
    merchant: {
      business_name: 'Bad Merchant',
      logo_url: 'logo1.png',
    },
  },
  {
    id: 'block-2',
    merchant_id: 'merchant-2',
    reason: null,
    created_at: '2024-01-02T00:00:00Z',
    merchant: {
      business_name: 'Another Merchant',
      logo_url: null,
    },
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('useOfferBlocking', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: mockUser });

    // Default mock implementations
    mockSelectChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    });

    mockInsertChain.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'new-block', created_at: new Date().toISOString() },
          error: null,
        }),
      }),
    });

    mockDeleteChain.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should return empty blocked list initially', async () => {
      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.blockedMerchants).toEqual([]);
      expect(result.current.isProcessing).toBe(false);
    });

    it('should start with isLoading true', () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue(new Promise(() => {})), // Never resolves
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      expect(result.current.isLoading).toBe(true);
    });

    it('should return empty list when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.blockedMerchants).toEqual([]);
      expect(mockSupabase.from).not.toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Fetch Blocked Merchants Tests
  // ===========================================================================

  describe('Fetch Blocked Merchants', () => {
    it('should fetch blocked merchants for logged in user', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockSupabase.from).toHaveBeenCalledWith('merchant_blocks');
      expect(result.current.blockedMerchants).toHaveLength(2);
    });

    it('should transform blocked data correctly', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.blockedMerchants[0]).toEqual({
        id: 'block-1',
        merchantId: 'merchant-1',
        merchantName: 'Bad Merchant',
        merchantLogo: 'logo1.png',
        reason: 'Poor service',
        blockedAt: '2024-01-01T00:00:00Z',
      });
    });

    it('should handle null merchant logo', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.blockedMerchants[1].merchantLogo).toBeNull();
    });
  });

  // ===========================================================================
  // isMerchantBlocked Tests
  // ===========================================================================

  describe('isMerchantBlocked', () => {
    it('should return true for blocked merchant', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isMerchantBlocked('merchant-1')).toBe(true);
    });

    it('should return false for non-blocked merchant', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isMerchantBlocked('merchant-999')).toBe(false);
    });
  });

  // ===========================================================================
  // Block Merchant Tests
  // ===========================================================================

  describe('blockMerchant', () => {
    it('should block a merchant successfully', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.blockMerchant('merchant-new', 'Spam');
      });

      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalled();
    });

    it('should not block when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.blockMerchant('merchant-1');
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Please sign in to block merchants');
    });

    it('should not block already blocked merchant', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.blockMerchant('merchant-1');
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Merchant is already blocked');
    });

    it('should set isProcessing during block operation', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isProcessing).toBe(false);

      await act(async () => {
        await result.current.blockMerchant('merchant-new');
      });

      // After operation completes, isProcessing should be false
      expect(result.current.isProcessing).toBe(false);
    });

    it('should handle block error', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      mockInsertChain.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.blockMerchant('merchant-new');
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to block merchant');
    });
  });

  // ===========================================================================
  // Unblock Merchant Tests
  // ===========================================================================

  describe('unblockMerchant', () => {
    it('should unblock a merchant successfully', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = false;
      await act(async () => {
        success = await result.current.unblockMerchant('merchant-1');
      });

      expect(success).toBe(true);
      expect(toast.success).toHaveBeenCalled();
    });

    it('should not unblock when user is not logged in', async () => {
      mockUseAuth.mockReturnValue({ user: null });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.unblockMerchant('merchant-1');
      });

      expect(success).toBe(false);
    });

    it('should not unblock non-blocked merchant', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.unblockMerchant('merchant-999');
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Merchant is not blocked');
    });

    it('should update local state after unblock', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.blockedMerchants).toHaveLength(2);
      });

      await act(async () => {
        await result.current.unblockMerchant('merchant-1');
      });

      expect(result.current.blockedMerchants).toHaveLength(1);
      expect(result.current.isMerchantBlocked('merchant-1')).toBe(false);
    });

    it('should handle unblock error', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: mockBlockedData, error: null }),
        }),
      });

      mockDeleteChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let success: boolean = true;
      await act(async () => {
        success = await result.current.unblockMerchant('merchant-1');
      });

      expect(success).toBe(false);
      expect(toast.error).toHaveBeenCalledWith('Failed to unblock merchant');
    });
  });

  // ===========================================================================
  // Refresh Tests
  // ===========================================================================

  describe('refresh', () => {
    it('should refetch blocked merchants', async () => {
      mockSelectChain.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const { result } = renderHook(() => useOfferBlocking());

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
