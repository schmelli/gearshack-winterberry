/**
 * Wishlist Zod Validation Schemas
 *
 * Feature: 049-wishlist-view
 * Constitution: Zod for runtime validation with TypeScript inference
 */

import { z } from 'zod';
import { gearItemFormSchema } from './gear-schema';

// =============================================================================
// Wishlist Item Schema
// =============================================================================

/**
 * Schema for adding item to wishlist
 * Extends gearItemFormSchema but enforces status='wishlist'
 */
export const addToWishlistSchema = gearItemFormSchema.extend({
  status: z.literal('wishlist'),
});

/**
 * Infer TypeScript type from schema
 */
export type AddToWishlistFormData = z.infer<typeof addToWishlistSchema>;

// =============================================================================
// Community Availability Schema
// =============================================================================

/**
 * Schema for community availability match from database
 * Validates data returned from find_community_availability RPC function
 */
export const communityAvailabilityMatchSchema = z.object({
  matchedItemId: z.string().uuid('Invalid matched item ID'),
  ownerId: z.string().uuid('Invalid owner ID'),
  ownerDisplayName: z.string().min(1, 'Owner display name is required'),
  ownerAvatarUrl: z.string().url('Invalid avatar URL').nullable(),
  itemName: z.string().min(1, 'Item name is required'),
  itemBrand: z.string().nullable(),
  forSale: z.boolean(),
  lendable: z.boolean(),
  tradeable: z.boolean(),
  similarityScore: z
    .number()
    .min(0, 'Similarity score must be >= 0')
    .max(1, 'Similarity score must be <= 1'),
  primaryImageUrl: z.string().url('Invalid image URL').nullable(),
});

/**
 * Infer TypeScript type from schema
 */
export type CommunityAvailabilityMatch = z.infer<typeof communityAvailabilityMatchSchema>;

/**
 * Schema for array of community availability matches
 */
export const communityAvailabilityMatchesSchema = z.array(communityAvailabilityMatchSchema);

// =============================================================================
// Duplicate Detection Schema
// =============================================================================

/**
 * Schema for checking wishlist duplicates
 * Both brand and model are optional (nullable) but used together for matching
 */
export const checkDuplicateSchema = z.object({
  brand: z.string().nullable(),
  modelNumber: z.string().nullable(),
});

/**
 * Infer TypeScript type from schema
 */
export type CheckDuplicateParams = z.infer<typeof checkDuplicateSchema>;

// =============================================================================
// View Mode Schema
// =============================================================================

/**
 * Schema for inventory view mode
 * Used for URL search params validation
 */
export const inventoryViewModeSchema = z.enum(['inventory', 'wishlist']);

/**
 * Infer TypeScript type from schema
 */
export type InventoryViewMode = z.infer<typeof inventoryViewModeSchema>;

// =============================================================================
// Sort Options Schema
// =============================================================================

/**
 * Schema for wishlist sort options
 */
export const wishlistSortOptionSchema = z.enum([
  'dateAdded',
  'dateAddedOldest',
  'name',
  'nameDesc',
  'category',
  'weight',
]);

/**
 * Infer TypeScript type from schema
 */
export type WishlistSortOption = z.infer<typeof wishlistSortOptionSchema>;
