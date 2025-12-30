/**
 * useSupabaseAuth Hook Tests
 *
 * Tests the Supabase authentication hook for:
 * - Initial session loading
 * - Sign up flow
 * - Sign in flow
 * - Magic link (OTP) flow
 * - Sign out flow
 * - Error handling
 * - Auth state changes
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useSupabaseAuth } from '@/hooks/useSupabaseAuth';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// =============================================================================
// Mock Setup
// =============================================================================

// Mock user data
const mockUser: Partial<User> = {
  id: 'user-123-uuid',
  email: 'hiker@gearshack.com',
  user_metadata: {
    full_name: 'Trail Runner',
    avatar_url: 'https://example.com/avatar.jpg',
  },
  created_at: '2024-01-01T00:00:00Z',
};

// Mock session
const mockSession: Partial<Session> = {
  access_token: 'mock-access-token',
  refresh_token: 'mock-refresh-token',
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: mockUser as User,
};

// Auth state change callback holder
let authStateChangeCallback: ((event: string, session: Session | null) => void) | null = null;

// Mock Supabase auth methods
const mockGetSession = vi.fn();
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignInWithOtp = vi.fn();
const mockSignOut = vi.fn();
const mockOnAuthStateChange = vi.fn();

// Mock the Supabase client
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signUp: mockSignUp,
      signInWithPassword: mockSignInWithPassword,
      signInWithOtp: mockSignInWithOtp,
      signOut: mockSignOut,
      onAuthStateChange: mockOnAuthStateChange,
    },
  }),
}));

// =============================================================================
// Test Suite
// =============================================================================

describe('useSupabaseAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authStateChangeCallback = null;

    // Default: return empty session (not authenticated)
    mockGetSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });

    // Mock auth state change subscription
    mockOnAuthStateChange.mockImplementation((callback) => {
      authStateChangeCallback = callback;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  // ===========================================================================
  // Initial State Tests
  // ===========================================================================

  describe('Initial State', () => {
    it('should start with isLoading true', () => {
      const { result } = renderHook(() => useSupabaseAuth());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.user).toBeNull();
      expect(result.current.session).toBeNull();
      expect(result.current.error).toBeNull();
    });

    it('should set isLoading false after session check completes', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should load existing session on mount', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user?.id).toBe('user-123-uuid');
      expect(result.current.session?.access_token).toBe('mock-access-token');
    });

    it('should handle session error gracefully', async () => {
      const sessionError: Partial<AuthError> = {
        message: 'Session expired',
        status: 401,
      };

      mockGetSession.mockResolvedValue({
        data: { session: null },
        error: sessionError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.user).toBeNull();
    });

    it('should timeout after AUTH_TIMEOUT_MS if session check hangs', async () => {
      vi.useFakeTimers();

      // Never resolve the session check
      mockGetSession.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useSupabaseAuth());

      expect(result.current.isLoading).toBe(true);

      // Fast-forward past the 3 second timeout
      await act(async () => {
        vi.advanceTimersByTime(3100);
      });

      expect(result.current.isLoading).toBe(false);

      vi.useRealTimers();
    });
  });

  // ===========================================================================
  // Sign Up Tests
  // ===========================================================================

  describe('signUp', () => {
    it('should sign up with email and password successfully', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'newhiker@gearshack.com',
          password: 'SecurePassword123!',
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newhiker@gearshack.com',
        password: 'SecurePassword123!',
        options: undefined,
      });
      expect(signUpResult?.error).toBeNull();
      expect(signUpResult?.user?.id).toBe('user-123-uuid');
    });

    it('should pass metadata options to signUp', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signUp({
          email: 'newhiker@gearshack.com',
          password: 'SecurePassword123!',
          options: {
            data: { full_name: 'New Hiker' },
            emailRedirectTo: 'https://gearshack.com/welcome',
          },
        });
      });

      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'newhiker@gearshack.com',
        password: 'SecurePassword123!',
        options: {
          data: { full_name: 'New Hiker' },
          emailRedirectTo: 'https://gearshack.com/welcome',
        },
      });
    });

    it('should handle sign up error', async () => {
      const signUpError: Partial<AuthError> = {
        message: 'User already exists',
        status: 400,
      };

      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: signUpError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'existing@gearshack.com',
          password: 'Password123!',
        });
      });

      expect(signUpResult?.error?.message).toBe('User already exists');
      expect(result.current.error?.message).toBe('User already exists');
    });

    it('should handle network exception during sign up', async () => {
      mockSignUp.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: 'test@gearshack.com',
          password: 'Password123!',
        });
      });

      expect(signUpResult?.error).toBeTruthy();
      expect(signUpResult?.user).toBeNull();
    });

    it('should clear previous error before sign up attempt', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // First, set an error
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'First error' } as AuthError,
      });

      await act(async () => {
        await result.current.signUp({
          email: 'test@gearshack.com',
          password: 'Password123!',
        });
      });

      expect(result.current.error?.message).toBe('First error');

      // Now sign up successfully
      mockSignUp.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      await act(async () => {
        await result.current.signUp({
          email: 'test@gearshack.com',
          password: 'Password123!',
        });
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Sign In Tests
  // ===========================================================================

  describe('signIn', () => {
    it('should sign in with email and password successfully', async () => {
      mockSignInWithPassword.mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'hiker@gearshack.com',
          password: 'MyPassword123!',
        });
      });

      expect(mockSignInWithPassword).toHaveBeenCalledWith({
        email: 'hiker@gearshack.com',
        password: 'MyPassword123!',
      });
      expect(signInResult?.error).toBeNull();
      expect(signInResult?.user?.email).toBe('hiker@gearshack.com');
    });

    it('should handle invalid credentials error', async () => {
      const credentialsError: Partial<AuthError> = {
        message: 'Invalid login credentials',
        status: 400,
      };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: credentialsError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'wrong@gearshack.com',
          password: 'WrongPassword',
        });
      });

      expect(signInResult?.error?.message).toBe('Invalid login credentials');
      expect(result.current.error?.message).toBe('Invalid login credentials');
    });

    it('should handle rate limit error', async () => {
      const rateLimitError: Partial<AuthError> = {
        message: 'Too many requests',
        status: 429,
      };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: rateLimitError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signInResult;
      await act(async () => {
        signInResult = await result.current.signIn({
          email: 'hiker@gearshack.com',
          password: 'Password123!',
        });
      });

      expect(signInResult?.error?.status).toBe(429);
    });
  });

  // ===========================================================================
  // Magic Link (OTP) Tests
  // ===========================================================================

  describe('signInWithOtp', () => {
    it('should send magic link successfully', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let otpResult;
      await act(async () => {
        otpResult = await result.current.signInWithOtp({
          email: 'hiker@gearshack.com',
        });
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'hiker@gearshack.com',
        options: undefined,
      });
      expect(otpResult?.error).toBeNull();
    });

    it('should pass redirect URL to magic link', async () => {
      mockSignInWithOtp.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      await act(async () => {
        await result.current.signInWithOtp({
          email: 'hiker@gearshack.com',
          options: {
            emailRedirectTo: 'https://gearshack.com/dashboard',
          },
        });
      });

      expect(mockSignInWithOtp).toHaveBeenCalledWith({
        email: 'hiker@gearshack.com',
        options: {
          emailRedirectTo: 'https://gearshack.com/dashboard',
        },
      });
    });

    it('should handle OTP error', async () => {
      const otpError: Partial<AuthError> = {
        message: 'Email not found',
        status: 404,
      };

      mockSignInWithOtp.mockResolvedValue({ error: otpError });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let otpResult;
      await act(async () => {
        otpResult = await result.current.signInWithOtp({
          email: 'nonexistent@gearshack.com',
        });
      });

      expect(otpResult?.error?.message).toBe('Email not found');
    });
  });

  // ===========================================================================
  // Sign Out Tests
  // ===========================================================================

  describe('signOut', () => {
    it('should sign out successfully', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });
      mockSignOut.mockResolvedValue({ error: null });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(mockSignOut).toHaveBeenCalled();
      expect(signOutResult?.error).toBeNull();
    });

    it('should handle sign out error', async () => {
      const signOutError: Partial<AuthError> = {
        message: 'Sign out failed',
        status: 500,
      };

      mockSignOut.mockResolvedValue({ error: signOutError });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signOutResult;
      await act(async () => {
        signOutResult = await result.current.signOut();
      });

      expect(signOutResult?.error?.message).toBe('Sign out failed');
      expect(result.current.error?.message).toBe('Sign out failed');
    });
  });

  // ===========================================================================
  // Auth State Change Tests
  // ===========================================================================

  describe('Auth State Changes', () => {
    it('should update user when auth state changes to signed in', async () => {
      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Simulate auth state change (user signs in)
      act(() => {
        authStateChangeCallback?.('SIGNED_IN', mockSession as Session);
      });

      await waitFor(() => {
        expect(result.current.user?.id).toBe('user-123-uuid');
      });

      expect(result.current.session?.access_token).toBe('mock-access-token');
    });

    it('should clear user when auth state changes to signed out', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.user).toBeTruthy();
      });

      // Simulate auth state change (user signs out)
      act(() => {
        authStateChangeCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.session).toBeNull();
      });
    });

    it('should handle token refresh', async () => {
      mockGetSession.mockResolvedValue({
        data: { session: mockSession },
        error: null,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.session).toBeTruthy();
      });

      const newSession = {
        ...mockSession,
        access_token: 'new-access-token',
      };

      // Simulate token refresh
      act(() => {
        authStateChangeCallback?.('TOKEN_REFRESHED', newSession as Session);
      });

      await waitFor(() => {
        expect(result.current.session?.access_token).toBe('new-access-token');
      });
    });

    it('should unsubscribe from auth state changes on unmount', async () => {
      const unsubscribeMock = vi.fn();
      mockOnAuthStateChange.mockImplementation((callback) => {
        authStateChangeCallback = callback;
        return {
          data: {
            subscription: {
              unsubscribe: unsubscribeMock,
            },
          },
        };
      });

      const { unmount, result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  // ===========================================================================
  // Error Handling Tests
  // ===========================================================================

  describe('clearError', () => {
    it('should clear error state', async () => {
      const signInError: Partial<AuthError> = {
        message: 'Invalid credentials',
        status: 400,
      };

      mockSignInWithPassword.mockResolvedValue({
        data: { user: null, session: null },
        error: signInError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Create an error
      await act(async () => {
        await result.current.signIn({
          email: 'test@gearshack.com',
          password: 'wrong',
        });
      });

      expect(result.current.error).toBeTruthy();

      // Clear the error
      await act(async () => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe('Edge Cases', () => {
    it('should handle empty email gracefully', async () => {
      mockSignUp.mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Email is required' } as AuthError,
      });

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      let signUpResult;
      await act(async () => {
        signUpResult = await result.current.signUp({
          email: '',
          password: 'Password123!',
        });
      });

      expect(signUpResult?.error).toBeTruthy();
    });

    it('should handle concurrent auth operations', async () => {
      mockSignInWithPassword.mockImplementation(() =>
        Promise.resolve({
          data: { user: mockUser, session: mockSession },
          error: null,
        })
      );

      const { result } = renderHook(() => useSupabaseAuth());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Start multiple concurrent sign-in attempts
      await act(async () => {
        const promises = [
          result.current.signIn({ email: 'user1@test.com', password: 'pass1' }),
          result.current.signIn({ email: 'user2@test.com', password: 'pass2' }),
        ];
        await Promise.all(promises);
      });

      // Both should complete without crashing
      expect(mockSignInWithPassword).toHaveBeenCalledTimes(2);
    });
  });
});
