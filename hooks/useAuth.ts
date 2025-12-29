/**
 * useAuth Hook
 *
 * Convenience wrapper around useSupabaseAuth for simpler access patterns.
 * This provides a simplified interface matching the common { user, isLoading } pattern.
 */

'use client';

import { useSupabaseAuth } from './useSupabaseAuth';
import type { User } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

export interface UseAuthReturn {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// =============================================================================
// Hook
// =============================================================================

export function useAuth(): UseAuthReturn {
  const { user, isLoading } = useSupabaseAuth();

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}

export default useAuth;
