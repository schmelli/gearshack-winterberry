/**
 * Auth Types
 *
 * Feature: 008-auth-and-profile
 * Type definitions for authentication and user profiles
 */

import type { Timestamp } from 'firebase/firestore';

/**
 * Firebase Auth User (subset of Firebase User type)
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * User Profile stored in Firestore at userBase/{uid}
 */
export interface UserProfile {
  // Core fields
  avatarUrl?: string;
  displayName: string;
  trailName?: string;
  bio?: string;
  location?: string;

  // Social links
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;

  // System fields (read-only, preserved during updates)
  isVIP?: boolean;
  first_launch?: Timestamp;
}

/**
 * Merged User - combined Auth + Profile for UI consumption
 * Priority: Firestore fields > Auth fields
 */
export interface MergedUser {
  uid: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  trailName: string | null;
  bio: string | null;
  location: string | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  isVIP: boolean;
}

/**
 * Auth Context State
 */
export interface AuthState {
  user: AuthUser | null;
  mergedUser: MergedUser | null;
  loading: boolean;
  error: string | null;
}
