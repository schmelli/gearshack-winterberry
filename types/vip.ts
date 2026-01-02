/**
 * VIP Account Types and Interfaces
 *
 * Feature: 052-vip-loadouts
 * Constitution: Types MUST be defined in @/types directory
 *
 * NOTE: VIP loadouts now use regular loadouts table with is_vip_loadout flag.
 * Old VipLoadout and VipLoadoutItem types removed - use regular Loadout types instead.
 */

import { z } from 'zod';

// =============================================================================
// Enumerations
// =============================================================================

export type VipStatus = 'curated' | 'claimed';

export type ClaimInvitationStatus = 'pending' | 'verified' | 'claimed' | 'expired';

// =============================================================================
// UI Labels for Enumerations
// =============================================================================

export const VIP_STATUS_LABELS: Record<VipStatus, string> = {
  curated: 'Curated Account',
  claimed: 'Verified VIP',
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
 * VIP list response for paginated queries
 */
export interface VipListResponse {
  vips: VipWithStats[];
  total: number;
  hasMore: boolean;
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
// Temporary Types (for existing user-facing features - will be updated in future tasks)
// =============================================================================

/**
 * DEPRECATED: VIP loadouts now use regular loadouts table with is_vip_loadout flag.
 * This type is kept temporarily for backward compatibility with user-facing components.
 * TODO: Update user-facing VIP components to use regular Loadout types.
 */
export interface VipLoadoutSummary {
  id: string;
  name: string;
  slug: string;
  sourceUrl: string;
  description: string | null;
  totalWeightGrams: number;
  itemCount: number;
  isBookmarked?: boolean;
  vipId?: string;
}

/**
 * DEPRECATED: VIP loadouts now use regular loadouts table.
 * This type is kept temporarily for backward compatibility.
 * TODO: Update to use regular Loadout types with items.
 */
export interface VipLoadoutWithItems extends VipLoadoutSummary {
  vip: VipWithStats;
  items: Array<{
    id: string;
    name: string;
    brand: string | null;
    weightGrams: number;
    quantity: number;
    category: string;
  }>;
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
 * DEPRECATED: VIP profile with loadouts.
 * This type is kept temporarily for backward compatibility.
 * TODO: Update to use VipWithStats + separate loadouts query.
 */
export interface VipProfile extends VipWithStats {
  loadouts: VipLoadoutSummary[];
}

// =============================================================================
// Comparison Types (for future loadout comparison features)
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
