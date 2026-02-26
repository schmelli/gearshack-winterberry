/**
 * useAuth Hook Tests
 *
 * Tests the simplified authentication wrapper hook that provides
 * a convenient { user, isLoading, isAuthenticated } interface.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAuth } from '@/hooks/useAuth';
import type { User, Session } from '@supabase/supabase-js';

// =============================================================================
// Mock Setup
// =============================================================================

const mockUser: Partial<User> = {
  id: 'user-123-uuid',
  email: 'hiker@gearshack.com',
  user_metadata: {
    full_name: 'Mountain Hiker',
  },
  created_at: '2024-01-01T00:00:00Z',
};

const mockSession: Partial<Session> = {
  access_token: 'mock-access-token',
  user: mockUser as User,
};

// Mock useSupabaseAuth hook
const mockUseSupabaseAuth = vi.fn();

vi.mock('@/hooks/useSupabaseAuth', () => ({
  useSupabaseAuth: () => mockUseSupabaseAuth(),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('useAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ===========================================================================
  // Basic State Tests
  // ===========================================================================

  describe('Basic State', () => {
    it('should return loading state initially', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        session: null,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('should return authenticated state when user is present', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user?.id).toBe('user-123-uuid');
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('should return unauthenticated state when user is null', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        session: null,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(false);
      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ===========================================================================
  // isAuthenticated Derivation Tests
  // ===========================================================================

  describe('isAuthenticated Derivation', () => {
    it('should derive isAuthenticated from user presence', () => {
      // User present -> authenticated
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: null,
      });

      const { result: authResult } = renderHook(() => useAuth());
      expect(authResult.current.isAuthenticated).toBe(true);

      // User absent -> not authenticated
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        session: null,
        error: null,
      });

      const { result: unauthResult } = renderHook(() => useAuth());
      expect(unauthResult.current.isAuthenticated).toBe(false);
    });

    it('should handle undefined user as unauthenticated', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: undefined,
        isLoading: false,
        session: null,
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      expect(result.current.isAuthenticated).toBe(false);
    });
  });

  // ===========================================================================
  // Return Interface Tests
  // ===========================================================================

  describe('Return Interface', () => {
    it('should return exactly three properties', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: null,
      });

      const { result } = renderHook(() => useAuth());
      const keys = Object.keys(result.current);

      expect(keys).toHaveLength(3);
      expect(keys).toContain('user');
      expect(keys).toContain('isLoading');
      expect(keys).toContain('isAuthenticated');
    });

    it('should not expose session or error from underlying hook', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: { message: 'Some error' },
      });

      const { result } = renderHook(() => useAuth());

      // These should not be in the simplified interface
      expect('session' in result.current).toBe(false);
      expect('error' in result.current).toBe(false);
    });
  });

  // ===========================================================================
  // State Transitions Tests
  // ===========================================================================

  describe('State Transitions', () => {
    it('should update when underlying auth state changes', async () => {
      // Start unauthenticated
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: true,
        session: null,
        error: null,
      });

      const { result, rerender } = renderHook(() => useAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.isAuthenticated).toBe(false);

      // User signs in
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: null,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.user?.email).toBe('hiker@gearshack.com');
      });
    });

    it('should reflect sign out correctly', async () => {
      // Start authenticated
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser,
        isLoading: false,
        session: mockSession,
        error: null,
      });

      const { result, rerender } = renderHook(() => useAuth());

      expect(result.current.isAuthenticated).toBe(true);

      // User signs out
      mockUseSupabaseAuth.mockReturnValue({
        user: null,
        isLoading: false,
        session: null,
        error: null,
      });

      rerender();

      await waitFor(() => {
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.user).toBeNull();
      });
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle loading state with partial user data', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: { id: 'partial-user' } as User,
        isLoading: true, // Still loading but have partial user
        session: null,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      // User exists, so should be "authenticated" even if loading
      expect(result.current.isAuthenticated).toBe(true);
      expect(result.current.isLoading).toBe(true);
    });

    it('should preserve user reference identity', () => {
      mockUseSupabaseAuth.mockReturnValue({
        user: mockUser as User,
        isLoading: false,
        session: mockSession as Session,
        error: null,
      });

      const { result } = renderHook(() => useAuth());

      // The user object should be the same reference as what useSupabaseAuth returns
      expect(result.current.user).toBe(mockUser);
    });
  });
});
