/**
 * Auth Types
 *
 * Feature: 008-auth-and-profile, 040-supabase-migration
 * Type definitions for authentication and user profiles
 */

/**
 * Auth User (compatible with both Firebase and Supabase)
 */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
}

/**
 * User Profile stored in database
 */
export interface UserProfile {
  // Core fields
  avatarUrl?: string | null;
  displayName: string;
  trailName?: string;
  bio?: string;
  location?: string;
  // Feature 041: Location with coordinates
  locationName?: string | null;
  latitude?: number | null;
  longitude?: number | null;

  // Social links
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;

  // System fields (read-only, preserved during updates)
  isVIP?: boolean;
  isAdmin?: boolean;
  first_launch?: Date;
}

/**
 * Merged User - combined Auth + Profile for UI consumption
 * Priority: Profile fields > Auth fields
 */
export interface MergedUser {
  uid: string;
  email: string | null;
  displayName: string;
  /** Custom avatar URL (takes precedence over provider avatar) - Feature 041 */
  avatarUrl: string | null;
  /** Provider avatar URL (Google, etc.) for fallback - Feature 041 */
  providerAvatarUrl: string | null;
  trailName: string | null;
  bio: string | null;
  /** Legacy location field (text only) */
  location: string | null;
  /** Human-readable location (e.g., "Berlin, Germany") - Feature 041 */
  locationName: string | null;
  /** Geographic latitude (-90 to 90) - Feature 041 */
  latitude: number | null;
  /** Geographic longitude (-180 to 180) - Feature 041 */
  longitude: number | null;
  instagram: string | null;
  facebook: string | null;
  youtube: string | null;
  website: string | null;
  isVIP: boolean;
  isAdmin: boolean;
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
