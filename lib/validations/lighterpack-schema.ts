/**
 * Lighterpack Import API Response Zod Schemas
 *
 * Feature: Lighterpack packlist import
 * Runtime validation for API responses from /api/loadouts/import-lighterpack
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shared building blocks
// ---------------------------------------------------------------------------

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
  index: z.number(),
  parsedItem: parsedItemSchema,
  inventoryCandidates: z.array(inventoryMatchCandidateSchema),
  gearGraphMatch: gearGraphMatchCandidateSchema.nullable(),
  externalResearch: externalResearchResultSchema.nullable(),
  suggestedResolution: lighterpackResolutionTypeSchema,
  warnings: z.array(z.string()),
});

const lighterpackPreviewSummarySchema = z.object({
  totalItems: z.number(),
  matchedInventory: z.number(),
  matchedGearGraph: z.number(),
  externalResearched: z.number(),
  unresolved: z.number(),
});

const lighterpackPreviewDataSchema = z.object({
  sourceUrl: z.string(),
  listName: z.string(),
  items: z.array(lighterpackPreviewItemSchema),
  summary: lighterpackPreviewSummarySchema,
});

const lighterpackFinalizeSummarySchema = z.object({
  totalItems: z.number(),
  matchedInventory: z.number(),
  matchedGearGraph: z.number(),
  addedToWishlist: z.number(),
  unresolved: z.number(),
  warnings: z.array(z.string()),
  loadoutId: z.string(),
  loadoutName: z.string(),
});

// ---------------------------------------------------------------------------
// API response envelope schemas (discriminated union on `success`)
// ---------------------------------------------------------------------------

const errorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
});

export const lighterpackPreviewResponseSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: lighterpackPreviewDataSchema }),
  errorResponseSchema,
]);

export const lighterpackFinalizeResponseSchema = z.discriminatedUnion('success', [
  z.object({ success: z.literal(true), data: lighterpackFinalizeSummarySchema }),
  errorResponseSchema,
]);

export type LighterpackPreviewResponse = z.infer<typeof lighterpackPreviewResponseSchema>;
export type LighterpackFinalizeResponse = z.infer<typeof lighterpackFinalizeResponseSchema>;
