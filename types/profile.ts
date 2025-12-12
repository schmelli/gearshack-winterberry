/**
 * Profile Types
 *
 * Feature: 008-auth-and-profile
 * Type definitions for profile forms and updates
 */

/**
 * Profile form data for editing
 */
export interface ProfileFormData {
  displayName: string;
  trailName: string;
  bio: string;
  location: string;
  avatarUrl: string;
  instagram: string;
  facebook: string;
  youtube: string;
  website: string;
}

/**
 * Login form data
 */
export interface LoginFormData {
  email: string;
  password: string;
}

/**
 * Registration form data
 */
export interface RegistrationFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Password reset form data
 */
export interface PasswordResetFormData {
  email: string;
}

/**
 * Profile update payload (excludes system fields)
 */
export interface ProfileUpdatePayload {
  displayName: string;
  trailName?: string;
  bio?: string;
  location?: string;
  avatarUrl?: string;
  instagram?: string;
  facebook?: string;
  youtube?: string;
  website?: string;
}

// =============================================================================
// Location Autocomplete Types (Feature 041)
// =============================================================================

/**
 * Location selection from autocomplete
 * Used by the LocationAutocomplete component
 */
export interface LocationSelection {
  /** Human-readable place name */
  name: string;
  /** Full formatted address */
  formattedAddress: string;
  /** Geographic latitude */
  latitude: number;
  /** Geographic longitude */
  longitude: number;
  /** Google Place ID for future reference */
  placeId?: string;
}

/**
 * Location suggestion from autocomplete search
 */
export interface LocationSuggestion {
  /** Google Place ID */
  placeId: string;
  /** Full description (e.g., "Berlin, Germany") */
  description: string;
  /** Main text (e.g., "Berlin") */
  mainText: string;
  /** Secondary text (e.g., "Germany") */
  secondaryText: string;
}

/**
 * Options for the useLocationAutocomplete hook
 */
export interface LocationAutocompleteOptions {
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Minimum characters before search triggers (default: 3) */
  minChars?: number;
}

/**
 * Return type for the useLocationAutocomplete hook
 */
export interface UseLocationAutocompleteReturn {
  /** Current suggestions from search */
  suggestions: LocationSuggestion[];
  /** Whether a search is in progress */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Trigger a search with the given query */
  search: (query: string) => void;
  /** Select a place by its ID and get full details */
  selectPlace: (placeId: string) => Promise<LocationSelection | null>;
  /** Clear suggestions and reset state */
  clear: () => void;
}
