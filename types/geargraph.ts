/**
 * GearGraph API Types
 *
 * Feature: 045-gear-detail-modal
 * Task: T002
 *
 * Types for GearGraph knowledge base API responses used in the gear detail modal
 * to display intelligent gear insights (seasonality, compatibility, weight class).
 */

import { z } from 'zod';

// =============================================================================
// Core Types
// =============================================================================

/**
 * Types of insights available from the GearGraph knowledge base.
 * Updated to match real GearGraph API response types.
 */
export type InsightType =
  | 'tip'
  | 'comparison'
  | 'warning'
  | 'recommendation';

/**
 * Represents a single insight from the GearGraph knowledge base.
 * Updated to match real GearGraph API response structure.
 */
export interface GearInsight {
  /** Type of insight: tip, comparison, warning, recommendation */
  type: InsightType;
  /** The insight content/text */
  content: string;
  /** Optional source URL for the insight */
  sourceUrl?: string;
  /** Confidence score 0-1 (optional, for ranked display) */
  confidence?: number;
}

/**
 * Response from the GearGraph insights API route.
 */
export interface GearInsightsResponse {
  /** Array of insights for the queried item */
  insights: GearInsight[];
  /** Product type ID that was queried */
  productTypeId: string | null;
  /** Whether this response came from cache */
  cached: boolean;
  /** When the cache entry expires (ISO 8601) */
  expiresAt: string;
}

/**
 * Error response from the GearGraph insights API route.
 */
export interface GearInsightsError {
  error: 'MISSING_PARAMS' | 'SERVICE_UNAVAILABLE';
  message: string;
}

// =============================================================================
// Zod Schemas (for validation)
// =============================================================================

/**
 * Schema for validating GearGraph insights request parameters.
 * At least one of productTypeId, categoryId, or (brand + name) must be provided.
 */
export const gearInsightsParamsSchema = z
  .object({
    productTypeId: z.string().optional(),
    categoryId: z.string().optional(),
    brand: z.string().max(100).optional(),
    name: z.string().max(200).optional(),
  })
  .refine(
    (data) =>
      data.productTypeId || data.categoryId || (data.brand && data.name),
    { message: 'At least one identifier required' }
  );

export type GearInsightsParams = z.infer<typeof gearInsightsParamsSchema>;

/**
 * Schema for validating insight types.
 */
export const insightTypeSchema = z.enum([
  'tip',
  'comparison',
  'warning',
  'recommendation',
]);

/**
 * Schema for validating a single gear insight.
 */
export const gearInsightSchema = z.object({
  type: insightTypeSchema,
  content: z.string(),
  sourceUrl: z.string().url().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/**
 * Schema for validating the full GearGraph insights response.
 */
export const gearInsightsResponseSchema = z.object({
  insights: z.array(gearInsightSchema),
  productTypeId: z.string().nullable(),
  cached: z.boolean(),
  expiresAt: z.string(),
});
