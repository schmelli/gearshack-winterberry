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
 */
export type InsightType =
  | 'seasonality'
  | 'weight_class'
  | 'compatibility'
  | 'category'
  | 'use_case';

/**
 * Represents a single insight from the GearGraph knowledge base.
 */
export interface GearInsight {
  /** Type of insight */
  type: InsightType;
  /** Human-readable label (e.g., "Winter Suitable", "Ultralight") */
  label: string;
  /** Confidence score 0-1 (optional, for ranked display) */
  confidence?: number;
  /** Related item IDs for compatibility insights */
  relatedIds?: string[];
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
  'seasonality',
  'weight_class',
  'compatibility',
  'category',
  'use_case',
]);

/**
 * Schema for validating a single gear insight.
 */
export const gearInsightSchema = z.object({
  type: insightTypeSchema,
  label: z.string().max(100),
  confidence: z.number().min(0).max(1).optional(),
  relatedIds: z.array(z.string()).optional(),
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
