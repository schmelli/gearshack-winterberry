/**
 * useSupabaseAuth Hook
 *
 * Feature: 040-supabase-migration
 * Tasks: T020, T021
 *
 * Provides authentication state and methods using Supabase Auth.
 * Replaces the Firebase-based useAuth hook.
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';

// =============================================================================
// Types
// =============================================================================

export interface AuthResult {
  user?: User | null;
  session?: Session | null;
  error: AuthError | null;
}

export interface SignOutResult {
  error: AuthError | null;
}

export interface SignUpOptions {
  email: string;
  password: string;
  options?: {
    data?: Record<string, unknown>;
    emailRedirectTo?: string;
  };
}

export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

export interface MagicLinkOptions {
  email: string;
  options?: {
    emailRedirectTo?: string;
  };
}

export interface UseSupabaseAuthReturn {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
  signUp: (options: SignUpOptions) => Promise<AuthResult>;
  signIn: (credentials: EmailPasswordCredentials) => Promise<AuthResult>;
  signInWithOtp: (options: MagicLinkOptions) => Promise<AuthResult>;
  signOut: () => Promise<SignOutResult>;
  clearError: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Auth timeout failsafe - 3 seconds (matching existing behavior) */
const AUTH_TIMEOUT_MS = 3000;

// =============================================================================
// Hook Implementation
// =============================================================================

export function useSupabaseAuth(): UseSupabaseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  // Memoize supabase client to prevent recreation on every render
  const supabase = useMemo(() => createClient(), []);

  // T021: Listen for auth state changes
  useEffect(() => {
    // Timeout failsafe (matching existing Firebase behavior)
    const timeout = setTimeout(() => {
      setIsLoading(false);
    }, AUTH_TIMEOUT_MS);

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error('Error getting session:', sessionError);
          setError(sessionError);
        } else {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);
        }
      } catch (err) {
        console.error('Unexpected error getting session:', err);
      } finally {
        clearTimeout(timeout);
        setIsLoading(false);
      }
    };

    getInitialSession();

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        clearTimeout(timeout);
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [supabase.auth]);

  // T020: Sign up with email and password (FR-001)
  const signUp = useCallback(
    async (options: SignUpOptions): Promise<AuthResult> => {
      setError(null);
      try {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: options.email,
          password: options.password,
          options: options.options,
        });

        if (signUpError) {
          setError(signUpError);
          return { user: null, session: null, error: signUpError };
        }

        return {
          user: data.user,
          session: data.session,
          error: null,
        };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { user: null, session: null, error: authError };
      }
    },
    [supabase.auth]
  );

  // T020: Sign in with email and password (FR-002)
  const signIn = useCallback(
    async (credentials: EmailPasswordCredentials): Promise<AuthResult> => {
      setError(null);
      try {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (signInError) {
          setError(signInError);
          return { user: null, session: null, error: signInError };
        }

        return {
          user: data.user,
          session: data.session,
          error: null,
        };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { user: null, session: null, error: authError };
      }
    },
    [supabase.auth]
  );

  // T020: Sign in with magic link (FR-003)
  const signInWithOtp = useCallback(
    async (options: MagicLinkOptions): Promise<{ error: AuthError | null }> => {
      setError(null);
      try {
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email: options.email,
          options: options.options ? {
            emailRedirectTo: options.options.emailRedirectTo,
          } : undefined,
        });

        if (otpError) {
          setError(otpError);
          return { error: otpError };
        }

        return { error: null };
      } catch (err) {
        const authError = err as AuthError;
        setError(authError);
        return { error: authError };
      }
    },
    [supabase.auth]
  );

  // T020: Sign out (FR-005)
  const signOut = useCallback(async (): Promise<SignOutResult> => {
    setError(null);
    try {
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        setError(signOutError);
        return { error: signOutError };
      }

      return { error: null };
    } catch (err) {
      const authError = err as AuthError;
      setError(authError);
      return { error: authError };
    }
  }, [supabase.auth]);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    session,
    isLoading,
    error,
    signUp,
    signIn,
    signInWithOtp,
    signOut,
    clearError,
  };
}
