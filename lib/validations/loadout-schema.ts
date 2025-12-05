/**
 * Loadout Form Validation Schema
 *
 * Feature: 005-loadout-management
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

  tripDate: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() !== '' ? new Date(val) : null))
    .refine((val) => val === null || !isNaN(val.getTime()), {
      message: 'Invalid date',
    }),
});

// =============================================================================
// Type Exports
// =============================================================================

export type LoadoutFormInput = z.input<typeof loadoutFormSchema>;
export type LoadoutFormOutput = z.output<typeof loadoutFormSchema>;
