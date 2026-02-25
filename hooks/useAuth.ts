/**
 * useAuth Hook
 *
 * Convenience wrapper around useSupabaseAuth for simpler access patterns.
 * This provides a simplified interface matching the common { user, isLoading } pattern.
 */

'use client';

import { useSupabaseAuth } from './useSupabaseAuth';
import type { User } from '@supabase/supabase-js';
import type { SignOutResult } from './useSupabaseAuth';

// =============================================================================
// Types
// =============================================================================

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<SignOutResult>;
}

// =============================================================================
// Hook
// =============================================================================

export function useAuth(): UseAuthReturn {
  const { user, isLoading, signOut } = useSupabaseAuth();

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signOut,
  };
}

export default useAuth;
