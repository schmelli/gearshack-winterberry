/**
 * useAuth Hook
 *
 * Feature: 008-auth-and-profile
 * FR-003: Persists auth state across page refreshes via onAuthStateChanged
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithEmail as firebaseSignInWithEmail,
  registerWithEmail as firebaseRegisterWithEmail,
  sendPasswordReset as firebaseSendPasswordReset,
  signOutUser,
} from '@/lib/firebase/auth';
import type { AuthUser } from '@/types/auth';

// =============================================================================
// Types
// =============================================================================

export interface UseAuthReturn {
  /** Current Firebase Auth user */
  user: AuthUser | null;
  /** Loading state for initial auth check */
  loading: boolean;
  /** Error from last auth operation */
  error: string | null;
  /** Sign in with Google OAuth */
  signInWithGoogle: () => Promise<void>;
  /** Sign in with email and password */
  signInWithEmail: (email: string, password: string) => Promise<void>;
  /** Register with email and password */
  registerWithEmail: (email: string, password: string) => Promise<void>;
  /** Send password reset email */
  sendPasswordReset: (email: string) => Promise<void>;
  /** Sign out current user */
  signOut: () => Promise<void>;
  /** Clear error state */
  clearError: () => void;
}

// =============================================================================
// Constants
// =============================================================================

/** Feature 022: Auth timeout failsafe - 3 seconds (FR-006) */
const AUTH_TIMEOUT_MS = 3000;

// =============================================================================
// Helper Functions
// =============================================================================

function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    photoURL: user.photoURL,
    emailVerified: user.emailVerified,
  };
}

// =============================================================================
// Hook Implementation
// =============================================================================

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Listen for auth state changes with timeout failsafe (Feature 022)
  useEffect(() => {
    // T002-T003: Force loading to false after timeout if Firebase is slow
    const timeout = setTimeout(() => {
      setLoading(false);
    }, AUTH_TIMEOUT_MS);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // T004: Clear timeout when auth responds before timeout
      clearTimeout(timeout);
      if (firebaseUser) {
        setUser(mapFirebaseUser(firebaseUser));
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // T005: Clear timeout in cleanup to prevent memory leaks
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    setError(null);
    try {
      await firebaseSignInWithGoogle();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(message);
      throw err;
    }
  }, []);

  // Sign in with email/password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await firebaseSignInWithEmail(email, password);
    } catch (err) {
      // Generic error message to prevent email enumeration (FR-005)
      setError('Invalid email or password');
      throw err;
    }
  }, []);

  // Register with email/password
  const registerWithEmail = useCallback(async (email: string, password: string) => {
    setError(null);
    try {
      await firebaseRegisterWithEmail(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create account';
      setError(message);
      throw err;
    }
  }, []);

  // Send password reset email
  const sendPasswordReset = useCallback(async (email: string) => {
    setError(null);
    try {
      await firebaseSendPasswordReset(email);
    } catch (err) {
      // Don't reveal if email exists (security)
      // Always show success message to prevent enumeration
      console.error('Password reset error:', err);
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    setError(null);
    try {
      await signOutUser();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sign out';
      setError(message);
      throw err;
    }
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    user,
    loading,
    error,
    signInWithGoogle,
    signInWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signOut,
    clearError,
  };
}
