/**
 * Weight Report Validation Schema
 * Feature: community-verified-weights
 */

import { z } from 'zod';

export const weightReportSchema = z.object({
  reportedWeightGrams: z
    .string()
    .min(1, 'errors.required')
    .refine((val) => !isNaN(Number(val)) && Number.isInteger(Number(val)), {
      message: 'errors.mustBeInteger',
    })
    .refine((val) => Number(val) >= 1, {
      message: 'errors.tooLight',
    })
    .refine((val) => Number(val) <= 99999, {
      message: 'errors.tooHeavy',
    }),
  measurementContext: z
    .string()
    .max(500, 'errors.contextTooLong')
    .optional()
    .or(z.literal('')),
});

export type WeightReportFormData = z.infer<typeof weightReportSchema>;
