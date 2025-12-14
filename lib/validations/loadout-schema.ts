/**
 * Loadout Form Validation Schema
 *
 * Feature: 005-loadout-management
 * Feature: 031-search-save-i18n-fix
 * Zod schema for loadout form validation
 */

import { z } from 'zod';

// =============================================================================
// Enum Validators (aligned with database enums and TypeScript types)
// =============================================================================

/** Activity type enum validator - matches database activity_type enum */
export const activityTypeSchema = z.enum(['hiking', 'camping', 'climbing', 'skiing', 'backpacking']);

/** Season enum validator - matches database season enum */
export const seasonSchema = z.enum(['spring', 'summer', 'fall', 'winter']);

// =============================================================================
// Loadout Form Schema
// =============================================================================

export const loadoutFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),

  description: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? val.trim() : '')),

  tripDate: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? new Date(val) : null))
    .refine((val) => val === null || !isNaN(val.getTime()), {
      message: 'Invalid date',
    }),

  activityTypes: z.array(activityTypeSchema).optional().default([]),

  seasons: z.array(seasonSchema).optional().default([]),
});

// =============================================================================
// Type Exports
// =============================================================================

export type LoadoutFormInput = z.input<typeof loadoutFormSchema>;
export type LoadoutFormOutput = z.output<typeof loadoutFormSchema>;
