/**
 * Reseller Validation Schemas
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Zod schemas for reseller CRUD validation
 *
 * NOTE: Validation messages are now internationalized via schema factory
 */

import { z } from 'zod';

// =============================================================================
// Schema Factory (for i18n)
// =============================================================================

/**
 * Creates a reseller validation schema with internationalized messages
 * @param t - Translation function from useTranslations('Common')
 */
export function createResellerSchema(t: (key: string, values?: Record<string, string | number>) => string) {
  return z.object({
    name: z.string().min(1, t('validation.required')),
    websiteUrl: z.string().url(t('validation.invalidUrl')),
    logoUrl: z.string().url(t('validation.invalidUrl')).optional().or(z.literal('')),
    resellerType: z.enum(['local', 'online', 'chain']),
    status: z.enum(['standard', 'vip', 'partner', 'suspended']),
    countriesServed: z.array(z.string()).min(1, t('validation.minLength', { min: '1' })),
    searchUrlTemplate: z.string().optional().or(z.literal('')),
    affiliateTag: z.string().optional().or(z.literal('')),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    addressLine1: z.string().optional().or(z.literal('')),
    addressLine2: z.string().optional().or(z.literal('')),
    addressCity: z.string().optional().or(z.literal('')),
    addressPostalCode: z.string().optional().or(z.literal('')),
    addressCountry: z.string().optional().or(z.literal('')),
    isActive: z.boolean(),
    priority: z.number().min(0).max(100),
  });
}

// =============================================================================
// API Validation Schemas (without i18n - for server-side)
// =============================================================================

/**
 * Server-side validation schema for create/update operations
 * Uses English messages (acceptable for API layer)
 */
export const CreateResellerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  websiteUrl: z.string().url('Invalid website URL'),
  logoUrl: z.string().url('Invalid logo URL').nullable().optional(),
  resellerType: z.enum(['local', 'online', 'chain']),
  status: z.enum(['standard', 'vip', 'partner', 'suspended']),
  countriesServed: z.array(z.string().length(2, 'Country codes must be 2 characters')).min(1, 'At least one country required'),
  searchUrlTemplate: z.string().nullable().optional(),
  affiliateTag: z.string().nullable().optional(),
  latitude: z.number().min(-90, 'Invalid latitude').max(90, 'Invalid latitude').nullable().optional(),
  longitude: z.number().min(-180, 'Invalid longitude').max(180, 'Invalid longitude').nullable().optional(),
  addressLine1: z.string().nullable().optional(),
  addressLine2: z.string().nullable().optional(),
  addressCity: z.string().nullable().optional(),
  addressPostalCode: z.string().nullable().optional(),
  addressCountry: z.string().nullable().optional(),
  isActive: z.boolean().optional().default(true),
  priority: z.number().min(0).max(100).optional().default(50),
});

export const UpdateResellerSchema = CreateResellerSchema.partial();

export type CreateResellerInput = z.infer<typeof CreateResellerSchema>;
export type UpdateResellerInput = z.infer<typeof UpdateResellerSchema>;
