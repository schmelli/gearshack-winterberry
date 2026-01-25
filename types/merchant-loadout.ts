/**
 * Merchant Loadout Types
 * Feature: 053-merchant-integration
 *
 * Types for merchant-curated gear packages with bundle pricing.
 */

import { z } from 'zod';
import type { MerchantCatalogItem, MerchantSummary } from './merchant';

// ============================================================================
// Enums
// ============================================================================

export type LoadoutStatus = 'draft' | 'pending_review' | 'published' | 'archived';

/**
 * Valid state transitions for merchant loadouts
 * - draft → pending_review (merchant submits)
 * - pending_review → published (admin approves)
 * - pending_review → draft (admin requests changes)
 * - published → archived (merchant unpublishes)
 * - archived → draft (merchant wants to re-edit)
 */
export const VALID_LOADOUT_TRANSITIONS: Record<LoadoutStatus, LoadoutStatus[]> = {
  draft: ['pending_review'],
  pending_review: ['published', 'draft'],
  published: ['archived'],
  archived: ['draft'],
};

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Merchant loadout - curated gear package
 */
export interface MerchantLoadout {
  id: string;
  merchantId: string;
  name: string;
  slug: string;
  description: string | null;
  tripType: string | null;
  season: string[] | null;
  status: LoadoutStatus;
  discountPercent: number;
  isFeatured: boolean;
  featuredUntil: string | null;
  heroImageUrl: string | null;
  viewCount: number;
  wishlistAddCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Item within a merchant loadout
 */
export interface MerchantLoadoutItem {
  id: string;
  loadoutId: string;
  catalogItemId: string;
  quantity: number;
  expertNote: string | null;
  sortOrder: number;
  createdAt: string;
}

/**
 * Loadout item with catalog details (joined)
 */
export interface LoadoutItemWithDetails extends MerchantLoadoutItem {
  catalogItem: MerchantCatalogItem;
}

/**
 * Store availability for a loadout
 */
export interface LoadoutAvailability {
  id: string;
  loadoutId: string;
  locationId: string;
  locationName?: string;
  isInStock: boolean;
  stockNote: string | null;
  updatedAt: string;
}

// ============================================================================
// Pricing
// ============================================================================

/**
 * Calculated bundle pricing for a loadout
 */
export interface LoadoutPricing {
  individualTotal: number;
  discountPercent: number;
  discountAmount: number;
  bundlePrice: number;
  totalWeightGrams: number;
}

/**
 * Calculate bundle pricing from items and discount
 */
export function calculateLoadoutPricing(
  items: Array<{ price: number; quantity: number; weightGrams: number | null }>,
  discountPercent: number
): LoadoutPricing {
  const individualTotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const discountAmount = individualTotal * (discountPercent / 100);
  const totalWeightGrams = items.reduce(
    (sum, item) => sum + (item.weightGrams ?? 0) * item.quantity,
    0
  );

  return {
    individualTotal,
    discountPercent,
    discountAmount,
    bundlePrice: individualTotal - discountAmount,
    totalWeightGrams,
  };
}

// ============================================================================
// View Types (for UI)
// ============================================================================

/**
 * Full loadout detail with items and merchant info
 */
export interface MerchantLoadoutDetail extends MerchantLoadout {
  merchant: MerchantSummary;
  items: LoadoutItemWithDetails[];
  availability: LoadoutAvailability[];
  pricing: LoadoutPricing;
}

/**
 * Public loadout with nearest location info
 */
export interface MerchantLoadoutPublic extends MerchantLoadoutDetail {
  nearestLocation: {
    name: string;
    distanceKm: number;
    isInStock: boolean;
  } | null;
}

/**
 * Card view for loadout in grid
 */
export interface MerchantLoadoutCard {
  id: string;
  slug: string;
  name: string;
  merchant: MerchantSummary;
  heroImageUrl: string | null;
  bundlePrice: number;
  savingsPercent: number;
  itemCount: number;
  totalWeightGrams: number;
  isFeatured: boolean;
  nearestLocationKm: number | null;
}

/**
 * Loadout comparison item
 */
export interface LoadoutComparisonItem {
  id: string;
  name: string;
  ownerName: string;
  isMerchant: boolean;
  totalWeightGrams: number;
  bundlePrice: number | null;
  itemCount: number;
}

/**
 * Side-by-side loadout comparison
 */
export interface LoadoutComparison {
  merchantLoadout: LoadoutComparisonItem;
  compareLoadout: LoadoutComparisonItem;
  differences: Array<{
    category: string;
    merchantItem: string | null;
    compareItem: string | null;
    priceDiff: number | null;
    weightDiff: number | null;
  }>;
}

// ============================================================================
// API Input Types
// ============================================================================

export interface MerchantLoadoutInput {
  name: string;
  description?: string;
  tripType?: string;
  season?: string[];
  discountPercent?: number;
}

export interface LoadoutItemInput {
  catalogItemId: string;
  quantity?: number;
  expertNote?: string;
  sortOrder?: number;
}

export interface LoadoutAvailabilityInput {
  locationId: string;
  isInStock: boolean;
  stockNote?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface MerchantLoadoutFilters {
  tripType?: string;
  season?: string;
  minPrice?: number;
  maxPrice?: number;
  merchantId?: string;
  featured?: boolean;
}

export interface MerchantLoadoutSort {
  field: 'name' | 'bundlePrice' | 'createdAt' | 'viewCount' | 'distance';
  direction: 'asc' | 'desc';
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const merchantLoadoutSchema = z.object({
  name: z.string().min(3, 'Loadout name must be at least 3 characters'),
  description: z.string().max(2000).optional(),
  tripType: z.string().optional(),
  season: z.array(z.string()).optional(),
  discountPercent: z.number().finite().min(0).max(100).default(0),
});

export const loadoutItemSchema = z.object({
  catalogItemId: z.string().uuid('Invalid catalog item ID'),
  quantity: z.number().finite().int().positive().default(1),
  expertNote: z.string().max(500).optional(),
  sortOrder: z.number().finite().int().min(0).optional(),
});

export const loadoutAvailabilitySchema = z.object({
  locationId: z.string().uuid('Invalid location ID'),
  isInStock: z.boolean(),
  stockNote: z.string().max(200).optional(),
});

// ============================================================================
// Type Guards and Helpers
// ============================================================================

export function isLoadoutPublished(loadout: MerchantLoadout): boolean {
  return loadout.status === 'published';
}

export function isLoadoutFeatured(loadout: MerchantLoadout): boolean {
  if (!loadout.isFeatured) return false;
  if (!loadout.featuredUntil) return true;
  return new Date(loadout.featuredUntil) > new Date();
}

export function canTransitionTo(
  currentStatus: LoadoutStatus,
  newStatus: LoadoutStatus
): boolean {
  return VALID_LOADOUT_TRANSITIONS[currentStatus].includes(newStatus);
}

export function generateLoadoutSlug(name: string, merchantId: string): string {
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const suffix = merchantId.slice(0, 8);
  return `${baseSlug}-${suffix}`;
}
