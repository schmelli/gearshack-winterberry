/**
 * Auth Schema Contracts
 *
 * Feature: 008-auth-and-profile
 * Defines types for authentication state and user data
 */

import { z } from 'zod';

// =============================================================================
// Firebase Auth User (from SDK)
// =============================================================================

/**
 * Subset of Firebase Auth User relevant to this feature
 */
export const authUserSchema = z.object({
  uid: z.string(),
  email: z.string().email().nullable(),
  displayName: z.string().nullable(),
  photoURL: z.string().url().nullable(),
  emailVerified: z.boolean(),
});

export type AuthUser = z.infer<typeof authUserSchema>;

// =============================================================================
// Firestore User Profile
// =============================================================================

/**
 * User profile stored in Firestore at userBase/{uid}
 */
export const userProfileSchema = z.object({
  // Core fields
  avatarUrl: z.string().url().optional(),
  displayName: z.string().min(2).max(50),
  trailName: z.string().min(2).max(30).optional(),
  bio: z.string().max(500).optional(),
  location: z.string().max(100).optional(),

  // Social links
  instagram: z.string().url().optional(),
  facebook: z.string().url().optional(),
  youtube: z.string().url().optional(),
  website: z.string().url().optional(),

  // System fields (read-only, never overwritten by user)
  isVIP: z.boolean().optional(),
  first_launch: z.any().optional(), // Firebase Timestamp
});

export type UserProfile = z.infer<typeof userProfileSchema>;

// =============================================================================
// Merged User (Auth + Profile)
// =============================================================================

/**
 * Combined view of Auth + Profile data for UI consumption
 */
export const mergedUserSchema = z.object({
  // From Auth
  uid: z.string(),
  email: z.string().email().nullable(),

  // Merged (Profile > Auth)
  displayName: z.string(),
  avatarUrl: z.string().url().nullable(),

  // From Profile
  trailName: z.string().nullable(),
  bio: z.string().nullable(),
  location: z.string().nullable(),
  instagram: z.string().nullable(),
  facebook: z.string().nullable(),
  youtube: z.string().nullable(),
  website: z.string().nullable(),
  isVIP: z.boolean(),
});

export type MergedUser = z.infer<typeof mergedUserSchema>;

// =============================================================================
// Auth Context State
// =============================================================================

export interface AuthState {
  /** Current authenticated user (null if not authenticated) */
  user: AuthUser | null;
  /** Merged user with profile data (null if not authenticated or profile not loaded) */
  mergedUser: MergedUser | null;
  /** Loading state for initial auth check */
  loading: boolean;
  /** Error from last auth operation */
  error: string | null;
}

// =============================================================================
// Auth Actions
// =============================================================================

export interface AuthActions {
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
}
