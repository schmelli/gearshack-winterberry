/**
 * Profile Schema Contracts
 *
 * Feature: 008-auth-and-profile
 * Defines types for profile editing and validation
 */

import { z } from 'zod';

// =============================================================================
// Profile Edit Form
// =============================================================================

/**
 * Schema for profile edit form validation
 * FR-020a: displayName 2-50 chars required
 * FR-020b: trailName 2-30 chars optional
 * FR-020c: bio max 500 chars optional
 * FR-020d: URLs validated for proper format
 */
export const profileFormSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Display name must be at least 2 characters')
    .max(50, 'Display name must be at most 50 characters'),
  trailName: z
    .string()
    .min(2, 'Trail name must be at least 2 characters')
    .max(30, 'Trail name must be at most 30 characters')
    .optional()
    .or(z.literal('')),
  bio: z
    .string()
    .max(500, 'Bio must be at most 500 characters')
    .optional()
    .or(z.literal('')),
  location: z
    .string()
    .max(100, 'Location must be at most 100 characters')
    .optional()
    .or(z.literal('')),
  avatarUrl: z
    .string()
    .url('Please enter a valid URL')
    .optional()
    .or(z.literal('')),
  instagram: z
    .string()
    .url('Please enter a valid Instagram URL')
    .optional()
    .or(z.literal('')),
  facebook: z
    .string()
    .url('Please enter a valid Facebook URL')
    .optional()
    .or(z.literal('')),
  youtube: z
    .string()
    .url('Please enter a valid YouTube URL')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileFormSchema>;

// =============================================================================
// Login Form
// =============================================================================

/**
 * Schema for email/password login form
 */
export const loginFormSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// =============================================================================
// Registration Form
// =============================================================================

/**
 * Schema for email/password registration form
 */
export const registrationFormSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegistrationFormData = z.infer<typeof registrationFormSchema>;

// =============================================================================
// Password Reset Form
// =============================================================================

/**
 * Schema for password reset request form
 */
export const passwordResetFormSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export type PasswordResetFormData = z.infer<typeof passwordResetFormSchema>;

// =============================================================================
// Profile Update Payload
// =============================================================================

/**
 * Payload for updating profile in Firestore
 * Excludes system fields (isVIP, first_launch) which are preserved
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
// Profile Hook Return Type
// =============================================================================

export interface UseProfileReturn {
  /** User profile from Firestore (null if not loaded) */
  profile: ProfileFormData | null;
  /** Loading state for profile fetch */
  loading: boolean;
  /** Error from last profile operation */
  error: string | null;
  /** Update profile with new data */
  updateProfile: (data: ProfileUpdatePayload) => Promise<void>;
  /** Refresh profile from Firestore */
  refreshProfile: () => Promise<void>;
}
