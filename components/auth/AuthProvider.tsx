/**
 * AuthProvider Component
 *
 * Feature: 008-auth-and-profile
 * T012: Wraps children with auth context providing authentication state
 */

'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useAuth, type UseAuthReturn } from '@/hooks/useAuth';
import { useProfile, type UseProfileReturn } from '@/hooks/useProfile';

// =============================================================================
// Context Types
// =============================================================================

interface AuthContextValue extends UseAuthReturn {
  /** Profile data and operations */
  profile: UseProfileReturn;
}

// =============================================================================
// Context
// =============================================================================

const AuthContext = createContext<AuthContextValue | null>(null);

// =============================================================================
// Provider Component
// =============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const auth = useAuth();
  const profile = useProfile(auth.user);

  const value = useMemo<AuthContextValue>(
    () => ({
      ...auth,
      profile,
    }),
    [auth, profile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Access auth context values
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }

  return context;
}
