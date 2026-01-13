/**
 * Reseller Validation Schemas
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Zod schemas for validating reseller API inputs
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export const ResellerTypeSchema = z.enum(['local', 'online', 'chain']);
export const ResellerStatusSchema = z.enum(['standard', 'vip', 'partner', 'suspended']);

// =============================================================================
// Create Reseller Schema
// =============================================================================

export const CreateResellerSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters'),
  websiteUrl: z.string().url('Website URL must be valid'),
  logoUrl: z.string().url('Logo URL must be valid').optional().nullable(),
  resellerType: ResellerTypeSchema,
  status: ResellerStatusSchema.optional(),
  countriesServed: z.array(z.string().length(2, 'Country code must be 2 characters')).min(1, 'At least one country is required'),
  searchUrlTemplate: z.string().url('Search URL template must be valid').optional().nullable(),
  affiliateTag: z.string().max(50, 'Affiliate tag must be at most 50 characters').optional().nullable(),
  latitude: z.number().min(-90, 'Latitude must be between -90 and 90').max(90, 'Latitude must be between -90 and 90').optional().nullable(),
  longitude: z.number().min(-180, 'Longitude must be between -180 and 180').max(180, 'Longitude must be between -180 and 180').optional().nullable(),
  addressLine1: z.string().max(200, 'Address line 1 must be at most 200 characters').optional().nullable(),
  addressLine2: z.string().max(200, 'Address line 2 must be at most 200 characters').optional().nullable(),
  addressCity: z.string().max(100, 'City must be at most 100 characters').optional().nullable(),
  addressPostalCode: z.string().max(20, 'Postal code must be at most 20 characters').optional().nullable(),
  addressCountry: z.string().length(2, 'Country code must be 2 characters').optional().nullable(),
  isActive: z.boolean().optional(),
  priority: z.number().int('Priority must be an integer').min(0, 'Priority must be non-negative').max(100, 'Priority must be at most 100').optional(),
});

// =============================================================================
// Update Reseller Schema (all fields optional)
// =============================================================================

export const UpdateResellerSchema = CreateResellerSchema.partial();

// =============================================================================
// Type exports
// =============================================================================

export type CreateResellerInput = z.infer<typeof CreateResellerSchema>;
export type UpdateResellerInput = z.infer<typeof UpdateResellerSchema>;
