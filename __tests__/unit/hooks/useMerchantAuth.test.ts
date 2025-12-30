/**
 * useMerchantAuth Hook Tests
 *
 * Tests the merchant authentication and authorization hook that provides:
 * - Merchant profile state
 * - Combined auth + merchant status
 * - Access flags (hasAccess, isVerified)
 * - Route guard helper
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import {
  useMerchantAuth,
  useMerchantAuthGuard,
  type MerchantAuthStatus,
} from '@/hooks/merchant/useMerchantAuth';
import type { Merchant, MerchantStatus } from '@/types/merchant';
import type { User } from '@supabase/supabase-js';

// =============================================================================
// Mock Setup
// =============================================================================

const mockUser: Partial<User> = {
  id: 'user-merchant-123',
  email: 'outfitter@gearshack.com',
  user_metadata: { full_name: 'Trail Outfitters' },
  created_at: '2024-01-01T00:00:00Z',
};

const mockMerchantApproved: Merchant = {
  id: 'merchant-001',
  userId: 'user-merchant-123',
  businessName: 'Trail Outfitters',
  businessType: 'local',
  status: 'approved',
  verifiedAt: '2024-06-01T00:00:00Z',
  verifiedBy: 'admin-user-id',
  contactEmail: 'outfitter@gearshack.com',
  contactPhone: '+1-555-0100',
  website: 'https://trailoutfitters.example.com',
  logoUrl: 'https://example.com/logo.png',
  description: 'Your local outdoor gear experts',
  taxId: null,
  createdAt: '2024-01-15T00:00:00Z',
  updatedAt: '2024-06-01T00:00:00Z',
};

const mockMerchantPending: Merchant = {
  ...mockMerchantApproved,
  id: 'merchant-002',
  status: 'pending',
  verifiedAt: null,
  verifiedBy: null,
};

const mockMerchantSuspended: Merchant = {
  ...mockMerchantApproved,
  id: 'merchant-003',
  status: 'suspended',
};

const mockMerchantRejected: Merchant = {
  ...mockMerchantApproved,
  id: 'merchant-004',
  status: 'rejected',
  verifiedAt: null,
  verifiedBy: null,
};

// Mocks
const mockUseSupabaseAuth = vi.fn();
const mockFetchMerchantByUserId = vi.fn();

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockUseSupabaseAuth(),
}));

vi.mock('@/lib/supabase/merchant-queries', () => ({
  fetchMerchantByUserId: (...args: unknown[]) => mockFetchMerchantByUserId(...args),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('useMerchantAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Loading States
  // ===========================================================================

  describe('Loading States', () => {
    it('should return loading status when auth is loading', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: true,
      });

      const { result } = renderHook(() => useMerchantAuth());

      expect(result.current.status).toBe('loading');
      expect(result.current.isLoading).toBe(true);
    });

    it('should return loading status when fetching merchant data', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      const { result } = renderHook(() => useMerchantAuth());

      expect(result.current.status).toBe('loading');
      expect(result.current.isLoading).toBe(true);
    });
  });

  // ===========================================================================
  // Unauthenticated User
  // ===========================================================================

  describe('Unauthenticated User', () => {
    it('should return unauthenticated status when no user', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('unauthenticated');
      expect(result.current.merchant).toBeNull();
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.isVerified).toBe(false);
    });

    it('should not call fetchMerchantByUserId when unauthenticated', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(mockFetchMerchantByUserId).not.toHaveBeenCalled();
      });
    });
  });

  // ===========================================================================
  // Non-Merchant User
  // ===========================================================================

  describe('Non-Merchant User', () => {
    it('should return not_merchant status when user has no merchant profile', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(null);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('not_merchant');
      expect(result.current.merchant).toBeNull();
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.isVerified).toBe(false);
    });
  });

  // ===========================================================================
  // Merchant Status Mapping
  // ===========================================================================

  describe('Merchant Status Mapping', () => {
    it('should map approved merchant status correctly', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantApproved);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('approved');
      expect(result.current.merchant).toEqual(mockMerchantApproved);
      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isVerified).toBe(true);
    });

    it('should map pending merchant status correctly', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantPending);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('pending_approval');
      expect(result.current.hasAccess).toBe(false);
      expect(result.current.isVerified).toBe(false);
    });

    it('should map suspended merchant status correctly', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantSuspended);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('suspended');
      expect(result.current.hasAccess).toBe(false);
    });

    it('should map rejected merchant status correctly', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantRejected);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('rejected');
      expect(result.current.hasAccess).toBe(false);
    });
  });

  // ===========================================================================
  // isVerified Flag
  // ===========================================================================

  describe('isVerified Flag', () => {
    it('should be true when approved and verifiedAt is set', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantApproved);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isVerified).toBe(true);
    });

    it('should be false when approved but verifiedAt is null', async () => {
      const approvedButNotVerified: Merchant = {
        ...mockMerchantApproved,
        verifiedAt: null,
      };
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(approvedButNotVerified);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.hasAccess).toBe(true);
      expect(result.current.isVerified).toBe(false);
    });

    it('should be false when not approved regardless of verifiedAt', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantPending);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isVerified).toBe(false);
    });
  });

  // ===========================================================================
  // Error Handling
  // ===========================================================================

  describe('Error Handling', () => {
    it('should set error when fetchMerchantByUserId fails', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Database connection failed');
      expect(result.current.merchant).toBeNull();
    });

    it('should handle non-Error exceptions', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockRejectedValue('Unknown error');

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to load merchant profile');
    });
  });

  // ===========================================================================
  // refreshMerchant
  // ===========================================================================

  describe('refreshMerchant', () => {
    it('should refetch merchant data when called', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValueOnce(mockMerchantPending);

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.status).toBe('pending_approval');
      expect(mockFetchMerchantByUserId).toHaveBeenCalledTimes(1);

      // Merchant gets approved
      mockFetchMerchantByUserId.mockResolvedValueOnce(mockMerchantApproved);

      await act(async () => {
        await result.current.refreshMerchant();
      });

      await waitFor(() => {
        expect(result.current.status).toBe('approved');
      });
      expect(mockFetchMerchantByUserId).toHaveBeenCalledTimes(2);
    });

    it('should clear error on successful refresh', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.error).toBe('Network error');
      });

      // Successful retry
      mockFetchMerchantByUserId.mockResolvedValueOnce(mockMerchantApproved);

      await act(async () => {
        await result.current.refreshMerchant();
      });

      await waitFor(() => {
        expect(result.current.error).toBeNull();
      });
      expect(result.current.merchant).toEqual(mockMerchantApproved);
    });
  });

  // ===========================================================================
  // User Changes
  // ===========================================================================

  describe('User Changes', () => {
    it('should refetch merchant when user changes', async () => {
      const user1 = { ...mockUser, id: 'user-1' };
      const user2 = { ...mockUser, id: 'user-2' };

      mockUseSupabaseAuth.mockReturnValue({
        user: user1,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantApproved);

      const { result, rerender } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockFetchMerchantByUserId).toHaveBeenCalledWith('user-1');

      // User changes
      mockUseSupabaseAuth.mockReturnValue({
        user: user2,
        isLoading: false,
      });

      rerender();

      await waitFor(() => {
        expect(mockFetchMerchantByUserId).toHaveBeenCalledWith('user-2');
      });
    });

    it('should clear merchant when user signs out', async () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
      });
      mockFetchMerchantByUserId.mockResolvedValue(mockMerchantApproved);

      const { result, rerender } = renderHook(() => useMerchantAuth());

      await waitFor(() => {
        expect(result.current.status).toBe('approved');
      });

      // User signs out
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.status).toBe('unauthenticated');
        expect(result.current.merchant).toBeNull();
      });
    });
  });
});

// =============================================================================
// useMerchantAuthGuard Tests
// =============================================================================

describe('useMerchantAuthGuard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return loading state with no redirect path', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: null,
      isLoading: true,
    });

    const { result } = renderHook(() => useMerchantAuthGuard());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.redirectPath).toBeNull();
    expect(result.current.isAuthorized).toBe(false);
  });

  it('should redirect unauthenticated users to login', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: null,
      isLoading: false,
    });

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.redirectPath).toBe('/login?redirect=/merchant');
  });

  it('should redirect non-merchants to apply page', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockFetchMerchantByUserId.mockResolvedValue(null);

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.redirectPath).toBe('/merchant/apply');
  });

  it('should redirect pending merchants to pending page', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockFetchMerchantByUserId.mockResolvedValue(mockMerchantPending);

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.redirectPath).toBe('/merchant/pending');
  });

  it('should redirect suspended merchants to suspended page', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockFetchMerchantByUserId.mockResolvedValue(mockMerchantSuspended);

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.redirectPath).toBe('/merchant/suspended');
  });

  it('should redirect rejected merchants to rejected page', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockFetchMerchantByUserId.mockResolvedValue(mockMerchantRejected);

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(false);
    expect(result.current.redirectPath).toBe('/merchant/rejected');
  });

  it('should authorize approved merchants with no redirect', async () => {
    mockUseSupabaseAuth.mockReturnValue({
      user: mockUser,
      isLoading: false,
    });
    mockFetchMerchantByUserId.mockResolvedValue(mockMerchantApproved);

    const { result } = renderHook(() => useMerchantAuthGuard());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isAuthorized).toBe(true);
    expect(result.current.redirectPath).toBeNull();
  });
});
