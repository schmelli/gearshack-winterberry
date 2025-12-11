/**
 * Profile Validation Schemas
 *
 * Feature: 008-auth-and-profile
 * Zod schemas for profile and auth form validation
 */

import { z } from 'zod';

/**
 * Profile edit form validation
 * FR-020a: displayName 2-50 chars required
 * FR-020b: trailName 2-30 chars optional
 * FR-020c: bio max 500 chars optional
 * FR-020d: URLs validated for proper format
 * Feature 041: avatarUrl, locationName, latitude, longitude
 */
export const profileSchema = z.object({
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
    .or(z.literal(''))
    .nullable(),
  // Feature 041: Location with coordinates
  locationName: z
    .string()
    .max(200, 'Location name must be at most 200 characters')
    .optional()
    .or(z.literal(''))
    .nullable(),
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
  instagram: z
    .string()
    .max(200, 'Instagram must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  facebook: z
    .string()
    .max(200, 'Facebook must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  youtube: z
    .string()
    .max(200, 'YouTube must be at most 200 characters')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .max(200, 'Website must be at most 200 characters')
    .optional()
    .or(z.literal('')),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

/**
 * Login form validation
 */
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form validation
 */
export const registrationSchema = z
  .object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegistrationFormData = z.infer<typeof registrationSchema>;

/**
 * Password reset form validation
 */
export const passwordResetSchema = z.object({
  email: z.string().email('Please enter a valid email'),
});

export type PasswordResetFormData = z.infer<typeof passwordResetSchema>;
