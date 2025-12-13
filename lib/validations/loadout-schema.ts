/**
 * Loadout Form Validation Schema
 *
 * Feature: 005-loadout-management
 * Feature: 031-search-save-i18n-fix
 * Zod schema for loadout form validation
 */

import { z } from 'zod';

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

  activityTypes: z.array(z.string()).optional().default([]),

  seasons: z.array(z.string()).optional().default([]),
});

// =============================================================================
// Type Exports
// =============================================================================

export type LoadoutFormInput = z.input<typeof loadoutFormSchema>;
export type LoadoutFormOutput = z.output<typeof loadoutFormSchema>;
