/**
 * Supabase-specific Types
 *
 * Feature: 040-supabase-migration
 * Task: T019
 *
 * Types for Supabase auth, session, and user objects.
 */

import type { User, Session, AuthError } from '@supabase/supabase-js';

// Re-export Supabase auth types for convenience
export type { User, Session, AuthError };

// =============================================================================
// Auth State Types
// =============================================================================

/** Current authentication state */
export interface AuthState {
  /** The authenticated user, or null if not authenticated */
  user: User | null;
  /** The current session, or null if not authenticated */
  session: Session | null;
  /** Whether the auth state is being loaded */
  isLoading: boolean;
  /** Any error that occurred during auth operations */
  error: AuthError | null;
}

/** Result of a sign-in or sign-up operation */
export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

/** Result of a sign-out operation */
export interface SignOutResult {
  error: AuthError | null;
}

// =============================================================================
// Auth Method Types
// =============================================================================

/** Credentials for email/password authentication */
export interface EmailPasswordCredentials {
  email: string;
  password: string;
}

/** Options for email/password sign-up */
export interface SignUpOptions {
  email: string;
  password: string;
  options?: {
    data?: {
      display_name?: string;
    };
    /** URL to redirect to after email confirmation */
    emailRedirectTo?: string;
  };
}

/** Options for magic link sign-in */
export interface MagicLinkOptions {
  email: string;
  options: {
    /** URL to redirect to after clicking the magic link */
    emailRedirectTo: string;
  };
}

// =============================================================================
// Profile Types
// =============================================================================

/** User profile data from the profiles table */
export interface Profile {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Trail name (2-30 chars) - Feature 041 */
  trailName: string | null;
  /** Bio (max 500 chars) - Feature 041 */
  bio: string | null;
  /** Human-readable location (e.g., "Berlin, Germany") - Feature 041 */
  locationName: string | null;
  /** Geographic latitude (-90 to 90) - Feature 041 */
  latitude: number | null;
  /** Geographic longitude (-180 to 180) - Feature 041 */
  longitude: number | null;
  /** Instagram username or URL - Feature 041 */
  instagram: string | null;
  /** Facebook username or URL - Feature 041 */
  facebook: string | null;
  /** YouTube channel URL - Feature 041 */
  youtube: string | null;
  /** Website URL - Feature 041 */
  website: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Data for updating a user profile */
export interface ProfileUpdate {
  displayName?: string;
  avatarUrl?: string | null;
  trailName?: string | null;
  bio?: string | null;
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  instagram?: string | null;
  facebook?: string | null;
  youtube?: string | null;
  website?: string | null;
}

// =============================================================================
// Auth Hook Return Type
// =============================================================================

/** Return type for useSupabaseAuth hook */
export interface UseSupabaseAuthReturn {
  /** Current auth state */
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;

  /** Auth methods */
  signUp: (options: SignUpOptions) => Promise<AuthResult>;
  signIn: (credentials: EmailPasswordCredentials) => Promise<AuthResult>;
  signInWithOtp: (options: MagicLinkOptions) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<SignOutResult>;

  /** Clear any auth errors */
  clearError: () => void;
}
