/**
 * Zod validation schemas for Catalog Sync API
 * Feature: 042-catalog-sync-api
 */

import { z } from 'zod';

// ============================================================================
// BRAND SCHEMAS
// ============================================================================

/**
 * Schema for a single brand payload in sync requests
 */
export const brandPayloadSchema = z.object({
  external_id: z.string().min(1, 'external_id is required'),
  name: z.string().min(1).max(200, 'name must be 1-200 characters'),
  logo_url: z.string().url('logo_url must be a valid URL').nullable().optional(),
  website_url: z.string().url('website_url must be a valid URL').nullable().optional(),
});

/**
 * Schema for brand sync request (single or batch)
 */
export const brandSyncRequestSchema = z.union([
  brandPayloadSchema,
  z.object({
    brands: z.array(brandPayloadSchema).max(1000, 'Maximum 1000 brands per request'),
  }),
]);

// ============================================================================
// ITEM SCHEMAS
// ============================================================================

/**
 * Schema for a single item payload in sync requests
 */
export const itemPayloadSchema = z.object({
  external_id: z.string().min(1, 'external_id is required'),
  name: z.string().min(1).max(500, 'name must be 1-500 characters'),
  brand_external_id: z.string().nullable().optional(),
  category: z.string().max(100, 'category must be max 100 characters').nullable().optional(),
  description: z.string().max(5000, 'description must be max 5000 characters').nullable().optional(),
  specs_summary: z.string().max(1000, 'specs_summary must be max 1000 characters').nullable().optional(),
  embedding: z
    .array(z.number())
    .length(1536, 'embedding must have exactly 1536 dimensions')
    .nullable()
    .optional(),
});

/**
 * Schema for item sync request (single or batch)
 */
export const itemSyncRequestSchema = z.union([
  itemPayloadSchema,
  z.object({
    items: z.array(itemPayloadSchema).max(1000, 'Maximum 1000 items per request'),
  }),
]);

// ============================================================================
// SEARCH SCHEMAS
// ============================================================================

/**
 * Schema for brand search query parameters
 */
export const brandSearchParamsSchema = z.object({
  q: z.string().min(1, "Query parameter 'q' is required"),
  limit: z.coerce.number().min(1).max(20).default(5),
});

/**
 * Schema for item search query parameters
 */
export const itemSearchParamsSchema = z.object({
  q: z.string().optional(),
  embedding: z.string().optional(),
  mode: z.enum(['fuzzy', 'semantic', 'hybrid']).default('fuzzy'),
  weight_text: z.coerce.number().min(0).max(1).default(0.7),
  brand_id: z.string().uuid().optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(20).default(5),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BrandPayload = z.infer<typeof brandPayloadSchema>;
export type BrandSyncRequest = z.infer<typeof brandSyncRequestSchema>;
export type ItemPayload = z.infer<typeof itemPayloadSchema>;
export type ItemSyncRequest = z.infer<typeof itemSyncRequestSchema>;
export type BrandSearchParams = z.infer<typeof brandSearchParamsSchema>;
export type ItemSearchParams = z.infer<typeof itemSearchParamsSchema>;
