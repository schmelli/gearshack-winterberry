/**
 * Loadout Form Validation Schema
 *
 * Feature: 005-loadout-management, 047-loadout-creation-form
 * Zod schema for loadout form validation
 */

import { z } from 'zod';

// =============================================================================
// Loadout Form Schema (Legacy - for basic form)
// =============================================================================

export const loadoutFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),

  tripDate: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? new Date(val) : null))
    .refine((val) => val === null || !isNaN(val.getTime()), {
      message: 'Invalid date',
    }),
});

// =============================================================================
// Loadout Creation Form Schema (Feature: 047-loadout-creation-form)
// Enhanced form with description, seasons, and activity types
// =============================================================================

const seasonValues = ['spring', 'summer', 'fall', 'winter'] as const;
const activityTypeValues = ['hiking', 'camping', 'climbing', 'skiing', 'backpacking'] as const;

export const loadoutCreationFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be 100 characters or less')
    .transform((val) => val.trim()),

  tripDate: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? new Date(val) : null))
    .refine((val) => val === null || !isNaN(val.getTime()), {
      message: 'Invalid date',
    }),

  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional()
    .default(''),

  seasons: z.array(z.enum(seasonValues)).optional().default([]),

  activityTypes: z.array(z.enum(activityTypeValues)).optional().default([]),
});

// =============================================================================
// Type Exports
// =============================================================================

export type LoadoutFormInput = z.input<typeof loadoutFormSchema>;
export type LoadoutFormOutput = z.output<typeof loadoutFormSchema>;

export type LoadoutCreationFormInput = z.input<typeof loadoutCreationFormSchema>;
export type LoadoutCreationFormOutput = z.output<typeof loadoutCreationFormSchema>;
