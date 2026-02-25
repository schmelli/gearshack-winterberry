/**
 * LoadoutItemState Schema
 *
 * Feature: 007-grand-polish-sprint
 * Defines the per-loadout item state for worn/consumable tracking
 */

import { z } from 'zod';

// =============================================================================
// LoadoutItemState Schema
// =============================================================================

export const loadoutItemStateSchema = z.object({
  /** Reference to GearItem.id - must exist in loadout's itemIds */
  itemId: z.string().uuid(),

  /** Item is worn on body (clothing, shoes, watch) - excluded from Base Weight */
  isWorn: z.boolean().default(false),

  /** Item is consumable (food, fuel, water) - excluded from Base Weight */
  isConsumable: z.boolean().default(false),
});

export type LoadoutItemState = z.infer<typeof loadoutItemStateSchema>;

// =============================================================================
// Loadout Extension Schema
// =============================================================================

export const loadoutExtensionSchema = z.object({
  /** Optional description for loadout context/notes */
  description: z.string().nullable().default(null),

  /** Per-item state for worn/consumable tracking */
  itemStates: z.array(loadoutItemStateSchema).default([]),
});

export type LoadoutExtension = z.infer<typeof loadoutExtensionSchema>;

// =============================================================================
// Weight Summary Schema
// =============================================================================

export const weightSummarySchema = z.object({
  /** Sum of all item weights in grams */
  totalWeight: z.number().nonnegative(),

  /** Total minus worn and consumable items */
  baseWeight: z.number().nonnegative(),

  /** Weight of worn items only */
  wornWeight: z.number().nonnegative(),

  /** Weight of consumable items only */
  consumableWeight: z.number().nonnegative(),
});

export type WeightSummary = z.infer<typeof weightSummarySchema>;

// =============================================================================
// Store Action Schemas
// =============================================================================

export const setItemWornActionSchema = z.object({
  loadoutId: z.string().uuid(),
  itemId: z.string().uuid(),
  isWorn: z.boolean(),
});

export const setItemConsumableActionSchema = z.object({
  loadoutId: z.string().uuid(),
  itemId: z.string().uuid(),
  isConsumable: z.boolean(),
});

export const updateLoadoutMetadataSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  tripDate: z.date().nullable().optional(),
  description: z.string().max(500).nullable().optional(),
});
