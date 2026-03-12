/**
 * Lighterpack Import Validation Schemas
 *
 * Feature: Lighterpack packlist import
 * Provides Zod runtime validation for API request and response bodies.
 */

import { z } from 'zod';

// =============================================================================
// Shared sub-schemas
// =============================================================================

const lighterpackResolutionTypeSchema = z.enum([
  'link_inventory',
  'create_from_geargraph',
  'create_temporary',
  'unresolved',
]);

const parsedItemSchema = z.object({
  name: z.string(),
  weightGrams: z.number().nullable(),
  quantity: z.number(),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  worn: z.boolean().optional(),
  consumable: z.boolean().optional(),
  notes: z.string().optional(),
  sourceItemId: z.string().optional(),
});

const inventoryMatchCandidateSchema = z.object({
  inventoryItemId: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  weightGrams: z.number().nullable(),
  score: z.number(),
  weightDeltaPercent: z.number().nullable(),
});

const gearGraphMatchCandidateSchema = z.object({
  catalogProductId: z.string(),
  name: z.string(),
  brand: z.string().nullable(),
  description: z.string().nullable(),
  productTypeId: z.string().nullable(),
  weightGrams: z.number().nullable(),
  priceUsd: z.number().nullable(),
  score: z.number(),
});

const externalResearchResultSchema = z.object({
  query: z.string(),
  sourceUrl: z.string().nullable(),
  sourceDomain: z.string().nullable(),
  brand: z.string().nullable(),
  model: z.string().nullable(),
  category: z.string().nullable(),
  weightGrams: z.number().nullable(),
  typicalPrice: z.number().nullable(),
  currency: z.string().nullable(),
  keyFeatures: z.array(z.string()),
  confidence: z.number(),
});

const lighterpackPreviewItemSchema = z.object({
  index: z.number().int().nonnegative(),
  parsedItem: parsedItemSchema,
  inventoryCandidates: z.array(inventoryMatchCandidateSchema),
  gearGraphMatch: gearGraphMatchCandidateSchema.nullable(),
  externalResearch: externalResearchResultSchema.nullable(),
  suggestedResolution: lighterpackResolutionTypeSchema,
  warnings: z.array(z.string()),
});

const lighterpackFinalizeItemInputSchema = lighterpackPreviewItemSchema.extend({
  selectedResolution: lighterpackResolutionTypeSchema.optional(),
  selectedInventoryItemId: z.string().nullable().optional(),
});

const lighterpackPreviewSummarySchema = z.object({
  totalItems: z.number().int().nonnegative(),
  matchedInventory: z.number().int().nonnegative(),
  matchedGearGraph: z.number().int().nonnegative(),
  externalResearched: z.number().int().nonnegative(),
  unresolved: z.number().int().nonnegative(),
});

const lighterpackFinalizeSummarySchema = z.object({
  totalItems: z.number().int().nonnegative(),
  matchedInventory: z.number().int().nonnegative(),
  matchedGearGraph: z.number().int().nonnegative(),
  addedToWishlist: z.number().int().nonnegative(),
  unresolved: z.number().int().nonnegative(),
  warnings: z.array(z.string()),
  loadoutId: z.string().uuid(),
  loadoutName: z.string(),
});

const lighterpackErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

// =============================================================================
// Request body schemas
// =============================================================================

export const lighterpackPreviewRequestSchema = z.object({
  mode: z.literal('preview'),
  url: z.string().min(1, 'URL is required'),
});

export const lighterpackFinalizeRequestSchema = z.object({
  mode: z.literal('finalize'),
  sourceUrl: z.string().min(1, 'sourceUrl is required'),
  listName: z.string().min(1, 'listName is required'),
  loadoutName: z.string().optional(),
  items: z.array(lighterpackFinalizeItemInputSchema).min(1, 'items must not be empty'),
});

export const lighterpackRequestSchema = z.discriminatedUnion('mode', [
  lighterpackPreviewRequestSchema,
  lighterpackFinalizeRequestSchema,
]);

export const lighterpackPreviewResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: z.object({
      sourceUrl: z.string().url(),
      listName: z.string(),
      items: z.array(lighterpackPreviewItemSchema),
      summary: lighterpackPreviewSummarySchema,
    }),
  }),
  lighterpackErrorResponseSchema,
]);

export const lighterpackFinalizeResponseSchema = z.union([
  z.object({
    success: z.literal(true),
    data: lighterpackFinalizeSummarySchema,
  }),
  lighterpackErrorResponseSchema,
]);

export type LighterpackPreviewRequestSchema = z.infer<typeof lighterpackPreviewRequestSchema>;
export type LighterpackFinalizeRequestSchema = z.infer<typeof lighterpackFinalizeRequestSchema>;
export type LighterpackPreviewResponseSchema = z.infer<typeof lighterpackPreviewResponseSchema>;
export type LighterpackFinalizeResponseSchema = z.infer<typeof lighterpackFinalizeResponseSchema>;
