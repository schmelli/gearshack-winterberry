/**
 * VIP Loadouts Types and Interfaces
 *
 * Feature: 052-vip-loadouts
 * Constitution: Types MUST be defined in @/types directory
 */

import { z } from 'zod';

// =============================================================================
// Enumerations
// =============================================================================

export type VipStatus = 'curated' | 'claimed';

export type VipLoadoutStatus = 'draft' | 'published';

export type ClaimInvitationStatus = 'pending' | 'verified' | 'claimed' | 'expired';

// =============================================================================
// UI Labels for Enumerations
// =============================================================================

export const VIP_STATUS_LABELS: Record<VipStatus, string> = {
  curated: 'Curated Account',
  claimed: 'Verified VIP',
};

export const VIP_LOADOUT_STATUS_LABELS: Record<VipLoadoutStatus, string> = {
  draft: 'Draft',
  published: 'Published',
};

export const CLAIM_INVITATION_STATUS_LABELS: Record<ClaimInvitationStatus, string> = {
  pending: 'Pending',
  verified: 'Verified',
  claimed: 'Claimed',
  expired: 'Expired',
};

// =============================================================================
// Zod Schemas for Validation
// =============================================================================

/**
 * Social links schema - at least one link required
 */
export const socialLinksSchema = z.object({
  youtube: z.string().url().optional().or(z.literal('')),
  instagram: z.string().url().optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  twitter: z.string().url().optional().or(z.literal('')),
}).refine(
  (data) => data.youtube || data.instagram || data.website,
  { message: 'At least one social link (YouTube, Instagram, or Website) is required' }
);

/**
 * VIP account creation/update schema
 */
export const vipAccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name must be 100 characters or less'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only').min(2).max(100),
  bio: z.string().min(1, 'Bio is required'),
  avatarUrl: z.string().url('Avatar must be a valid URL'),
  socialLinks: socialLinksSchema,
  status: z.enum(['curated', 'claimed']),
  isFeatured: z.boolean(),
  claimedByUserId: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  archivedAt: z.string().datetime().nullable().optional(),
  archiveReason: z.string().nullable().optional(),
});

/**
 * VIP account creation request schema (subset of full schema)
 */
export const createVipRequestSchema = z.object({
  name: z.string().min(2).max(100),
  bio: z.string().min(1),
  avatarUrl: z.string().url(),
  socialLinks: socialLinksSchema,
  isFeatured: z.boolean().default(false),
});

/**
 * VIP account update request schema
 */
export const updateVipRequestSchema = createVipRequestSchema.partial();

/**
 * VIP loadout schema
 */
export const vipLoadoutSchema = z.object({
  id: z.string().uuid(),
  vipId: z.string().uuid(),
  name: z.string().min(2, 'Name must be at least 2 characters').max(200),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  sourceUrl: z.string().url('Source URL must be a valid URL'),
  description: z.string().optional().nullable(),
  tripType: z.string().optional().nullable(),
  dateRange: z.string().optional().nullable(),
  status: z.enum(['draft', 'published']),
  isSourceAvailable: z.boolean(),
  sourceCheckedAt: z.string().datetime().nullable().optional(),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable().optional(),
});

/**
 * VIP loadout item schema
 */
export const vipLoadoutItemSchema = z.object({
  id: z.string().uuid(),
  vipLoadoutId: z.string().uuid(),
  gearItemId: z.string().uuid().nullable().optional(),
  name: z.string().min(1),
  brand: z.string().nullable().optional(),
  weightGrams: z.number().int().positive('Weight must be positive'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  notes: z.string().nullable().optional(),
  category: z.string().min(1),
  sortOrder: z.number().int().default(0),
  createdAt: z.string().datetime(),
});

/**
 * Create loadout item request schema
 */
export const createLoadoutItemRequestSchema = z.object({
  gearItemId: z.string().uuid().optional(),
  name: z.string().min(1),
  brand: z.string().optional(),
  weightGrams: z.number().int().positive(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional(),
  category: z.string().min(1),
});

/**
 * Create VIP loadout request schema
 */
export const createVipLoadoutRequestSchema = z.object({
  name: z.string().min(2).max(200),
  sourceUrl: z.string().url(),
  description: z.string().optional(),
  tripType: z.string().optional(),
  dateRange: z.string().optional(),
  items: z.array(createLoadoutItemRequestSchema).min(1, 'At least one item is required'),
  status: z.enum(['draft', 'published']).default('draft'),
});

/**
 * Update VIP loadout request schema
 */
export const updateVipLoadoutRequestSchema = createVipLoadoutRequestSchema.partial();

/**
 * Claim invitation schema
 */
export const claimInvitationSchema = z.object({
  id: z.string().uuid(),
  vipId: z.string().uuid(),
  email: z.string().email(),
  token: z.string().min(64).max(100),
  status: z.enum(['pending', 'verified', 'claimed', 'expired']),
  createdBy: z.string().uuid().nullable().optional(),
  createdAt: z.string().datetime(),
  expiresAt: z.string().datetime(),
  verifiedAt: z.string().datetime().nullable().optional(),
  claimedAt: z.string().datetime().nullable().optional(),
});

// =============================================================================
// TypeScript Types (derived from Zod schemas)
// =============================================================================

export type SocialLinks = z.infer<typeof socialLinksSchema>;
export type VipAccount = z.infer<typeof vipAccountSchema>;
export type CreateVipRequest = z.infer<typeof createVipRequestSchema>;
export type UpdateVipRequest = z.infer<typeof updateVipRequestSchema>;
export type VipLoadout = z.infer<typeof vipLoadoutSchema>;
export type VipLoadoutItem = z.infer<typeof vipLoadoutItemSchema>;
export type CreateLoadoutItemRequest = z.infer<typeof createLoadoutItemRequestSchema>;
export type CreateVipLoadoutRequest = z.infer<typeof createVipLoadoutRequestSchema>;
export type UpdateVipLoadoutRequest = z.infer<typeof updateVipLoadoutRequestSchema>;
export type ClaimInvitation = z.infer<typeof claimInvitationSchema>;

// =============================================================================
// Extended Types (with computed fields)
// =============================================================================

/**
 * VIP account with follower and loadout counts
 */
export interface VipWithStats extends VipAccount {
  followerCount: number;
  loadoutCount: number;
  isFollowing?: boolean;
}

/**
 * VIP loadout summary for list views
 */
export interface VipLoadoutSummary extends VipLoadout {
  totalWeightGrams: number;
  itemCount: number;
  isBookmarked?: boolean;
}

/**
 * VIP loadout with all items and VIP info
 */
export interface VipLoadoutWithItems extends VipLoadoutSummary {
  vip: VipWithStats;
  items: VipLoadoutItem[];
  categoryBreakdown: CategoryBreakdown[];
}

/**
 * Category breakdown for loadout weight analysis
 */
export interface CategoryBreakdown {
  category: string;
  weightGrams: number;
  itemCount: number;
}

/**
 * VIP profile with loadouts list
 */
export interface VipProfile extends VipWithStats {
  loadouts: VipLoadoutSummary[];
}

/**
 * VIP list response for paginated queries
 */
export interface VipListResponse {
  vips: VipWithStats[];
  total: number;
  hasMore: boolean;
}

/**
 * VIP loadout list response
 */
export interface VipLoadoutListResponse {
  loadouts: VipLoadoutSummary[];
}

/**
 * Follow response
 */
export interface VipFollowResponse {
  isFollowing: boolean;
  followerCount: number;
}

/**
 * Bookmark response
 */
export interface VipBookmarkResponse {
  isBookmarked: boolean;
}

/**
 * Copy loadout response
 */
export interface CopyLoadoutResponse {
  loadoutId: string;
  loadoutName: string;
}

// =============================================================================
// Source URL Validation
// =============================================================================

/**
 * Allowed source URL patterns for VIP loadouts
 */
export const SOURCE_URL_PATTERNS = {
  youtube: /^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\//,
  vimeo: /^https?:\/\/(www\.)?vimeo\.com\//,
  instagram: /^https?:\/\/(www\.)?instagram\.com\//,
  blog: /^https?:\/\//, // Generic HTTPS for blogs
} as const;

export type SourcePlatform = keyof typeof SOURCE_URL_PATTERNS;

/**
 * Detect platform from source URL
 */
export function detectSourcePlatform(url: string): SourcePlatform | 'blog' {
  if (SOURCE_URL_PATTERNS.youtube.test(url)) return 'youtube';
  if (SOURCE_URL_PATTERNS.vimeo.test(url)) return 'vimeo';
  if (SOURCE_URL_PATTERNS.instagram.test(url)) return 'instagram';
  return 'blog';
}

// =============================================================================
// Comparison Types (for User Story 5)
// =============================================================================

/**
 * Loadout comparison result
 */
export interface LoadoutComparison {
  userLoadout: {
    id: string;
    name: string;
    totalWeightGrams: number;
  };
  vipLoadout: {
    id: string;
    name: string;
    vipName: string;
    totalWeightGrams: number;
  };
  weightDifferenceGrams: number;
  categoryComparison: CategoryComparison[];
  uniqueToUser: ComparisonItem[];
  uniqueToVip: ComparisonItem[];
  commonItems: CommonItem[];
}

/**
 * Category comparison for side-by-side view
 */
export interface CategoryComparison {
  category: string;
  userWeightGrams: number;
  vipWeightGrams: number;
  differenceGrams: number;
}

/**
 * Item unique to one loadout
 */
export interface ComparisonItem {
  name: string;
  brand: string | null;
  weightGrams: number;
  category: string;
}

/**
 * Item common to both loadouts
 */
export interface CommonItem extends ComparisonItem {
  userWeightGrams: number;
  vipWeightGrams: number;
}
