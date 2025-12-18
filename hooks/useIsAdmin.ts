/**
 * useIsAdmin Hook
 *
 * Feature: Admin Panel with Category Management
 * Provides admin status check for the current user
 */

'use client';

import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

export function useIsAdmin() {
  const { profile, loading } = useAuthContext();

  // Debug: Log isAdmin status
  console.log('[useIsAdmin] isAdmin:', profile.mergedUser?.isAdmin, 'loading:', loading);

  return {
    isAdmin: profile.mergedUser?.isAdmin ?? false,
    isLoading: loading,
    isAuthenticated: !!profile.mergedUser,
  };
}
