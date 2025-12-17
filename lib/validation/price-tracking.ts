/**
 * Zod validation schemas for price tracking API routes
 * Feature: 050-price-tracking (Review fix #11)
 * Date: 2025-12-17
 */

import { z } from 'zod';

/**
 * POST /api/price-tracking/track
 */
export const enableTrackingSchema = z.object({
  gear_item_id: z.string().uuid('Invalid gear item ID'),
  alerts_enabled: z.boolean().optional().default(true),
});

export type EnableTrackingRequest = z.infer<typeof enableTrackingSchema>;

/**
 * POST /api/price-tracking/untrack
 */
export const disableTrackingSchema = z.object({
  tracking_id: z.string().uuid('Invalid tracking ID'),
});

export type DisableTrackingRequest = z.infer<typeof disableTrackingSchema>;

/**
 * GET /api/price-tracking/search
 */
export const searchPricesSchema = z.object({
  tracking_id: z.string().uuid('Invalid tracking ID'),
  force_refresh: z
    .string()
    .optional()
    .transform((val) => val === 'true')
    .pipe(z.boolean()),
});

export type SearchPricesQuery = z.infer<typeof searchPricesSchema>;

/**
 * POST /api/price-tracking/search/confirm-match
 */
export const confirmMatchSchema = z.object({
  tracking_id: z.string().uuid('Invalid tracking ID'),
  result_id: z.string().uuid('Invalid result ID'),
});

export type ConfirmMatchRequest = z.infer<typeof confirmMatchSchema>;

/**
 * POST /api/partner-offers
 */
export const partnerOfferSchema = z.object({
  product_id: z.string().min(1, 'Product ID is required'),
  product_name: z.string().min(1, 'Product name is required'),
  product_url: z.string().url('Invalid product URL'),
  offer_price: z.number().positive('Offer price must be positive'),
  original_price: z.number().positive('Original price must be positive').optional(),
  currency: z.string().length(3, 'Currency must be 3-letter ISO code').default('EUR'),
  valid_until: z.string().datetime('Invalid timestamp format'),
  description: z.string().max(500, 'Description too long').optional(),
  terms: z.string().max(1000, 'Terms too long').optional(),
});

export type PartnerOfferRequest = z.infer<typeof partnerOfferSchema>;

/**
 * GET /api/alerts/preferences
 * No body validation needed (GET request)
 */

/**
 * POST /api/alerts/preferences
 */
export const alertPreferencesSchema = z.object({
  price_drop_enabled: z.boolean().optional(),
  local_shop_enabled: z.boolean().optional(),
  community_enabled: z.boolean().optional(),
  personal_offer_enabled: z.boolean().optional(),
  push_enabled: z.boolean().optional(),
  email_enabled: z.boolean().optional(),
  quiet_hours_start: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .optional()
    .nullable(),
  quiet_hours_end: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)')
    .optional()
    .nullable(),
});

export type AlertPreferencesRequest = z.infer<typeof alertPreferencesSchema>;

/**
 * Utility: Validate request body with Zod schema
 */
export async function validateRequestBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: string }> {
  try {
    const body = await request.json();
    const data = schema.parse(body);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { data: null, error: `Validation error: ${errors}` };
    }
    return { data: null, error: 'Invalid request body' };
  }
}

/**
 * Utility: Validate query parameters with Zod schema
 */
export function validateQueryParams<T>(
  searchParams: URLSearchParams,
  schema: z.ZodSchema<T>
): { data: T; error: null } | { data: null; error: string } {
  try {
    const params = Object.fromEntries(searchParams.entries());
    const data = schema.parse(params);
    return { data, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const zodError = error as z.ZodError;
      const errors = zodError.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { data: null, error: `Validation error: ${errors}` };
    }
    return { data: null, error: 'Invalid query parameters' };
  }
}
