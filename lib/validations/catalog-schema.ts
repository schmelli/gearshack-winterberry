/**
 * Zod validation schemas for Catalog Sync API
 * Feature: 042-catalog-sync-api
 *
 * Note: Uses catalog_products table schema (not catalog_items)
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
// PRODUCT SCHEMAS (formerly ITEM SCHEMAS)
// ============================================================================

/**
 * Schema for a single product payload in sync requests
 * Matches catalog_products table structure
 * Note: category_main and subcategory are no longer stored - use product_type_id FK instead
 */
export const productPayloadSchema = z.object({
  external_id: z.string().min(1, 'external_id is required'),
  name: z.string().min(1).max(500, 'name must be 1-500 characters'),
  brand_external_id: z.string().nullable().optional(),
  product_type: z.string().max(100, 'product_type must be max 100 characters').nullable().optional(),
  product_type_id: z.string().uuid('product_type_id must be a valid UUID').nullable().optional(),
  description: z.string().max(5000, 'description must be max 5000 characters').nullable().optional(),
  price_usd: z.number().min(0).nullable().optional(),
  // Weight must be > 0 if provided (0g is invalid for outdoor gear, use null for unknown weight)
  weight_grams: z.number().positive('weight_grams must be greater than 0 (use null for unknown)').nullable().optional(),
});

/**
 * Schema for product sync request (single or batch)
 */
export const productSyncRequestSchema = z.union([
  productPayloadSchema,
  z.object({
    items: z.array(productPayloadSchema).max(1000, 'Maximum 1000 products per request'),
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
 * Schema for product search query parameters
 * Note: category_main filter removed - use product_type_id to filter by category
 */
export const productSearchParamsSchema = z.object({
  q: z.string().optional(),
  mode: z.enum(['fuzzy']).default('fuzzy'),
  brand_id: z.string().uuid().optional(),
  product_type_id: z.string().uuid().optional(),
  limit: z.coerce.number().min(1).max(20).default(5),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type BrandPayload = z.infer<typeof brandPayloadSchema>;
export type BrandSyncRequest = z.infer<typeof brandSyncRequestSchema>;
export type ProductPayload = z.infer<typeof productPayloadSchema>;
export type ProductSyncRequest = z.infer<typeof productSyncRequestSchema>;
export type BrandSearchParams = z.infer<typeof brandSearchParamsSchema>;
export type ProductSearchParams = z.infer<typeof productSearchParamsSchema>;

// Legacy aliases for backwards compatibility
export type ItemPayload = ProductPayload;
export type ItemSyncRequest = ProductSyncRequest;
export type ItemSearchParams = ProductSearchParams;
export const itemPayloadSchema = productPayloadSchema;
export const itemSyncRequestSchema = productSyncRequestSchema;
export const itemSearchParamsSchema = productSearchParamsSchema;
