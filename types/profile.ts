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
