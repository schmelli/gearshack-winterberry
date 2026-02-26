/**
 * Community Banner Types and Interfaces
 *
 * Feature: 056-community-hub-enhancements
 * Constitution: Types MUST be defined in @/types directory
 *
 * Promotional banners displayed in the community page carousel.
 * Admin-managed with visibility windows and display ordering.
 */

import { z } from 'zod';

// =============================================================================
// Enums
// =============================================================================

export type BannerStatus = 'scheduled' | 'active' | 'expired' | 'disabled';

// =============================================================================
// UI Labels
// =============================================================================

export const BANNER_STATUS_LABELS = {
  scheduled: 'Scheduled',
  active: 'Active',
  expired: 'Expired',
  disabled: 'Disabled',
} as const satisfies Record<BannerStatus, string>;

// =============================================================================
// Schemas
// =============================================================================

export const communityBannerSchema = z.object({
  id: z.string().uuid(),
  heroImageUrl: z.string().url(),
  ctaText: z.string().min(5).max(200),
  buttonText: z.string().min(2).max(50),
  targetUrl: z.string().url(),
  visibilityStart: z.string().datetime(),
  visibilityEnd: z.string().datetime(),
  displayOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
  createdBy: z.string().uuid().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createBannerSchema = z.object({
  heroImageUrl: z.string().url('Please enter a valid image URL'),
  ctaText: z.string()
    .min(5, 'Headline must be at least 5 characters')
    .max(200, 'Headline must be 200 characters or less'),
  buttonText: z.string()
    .min(2, 'Button text must be at least 2 characters')
    .max(50, 'Button text must be 50 characters or less'),
  targetUrl: z.string().url('Please enter a valid URL'),
  visibilityStart: z.string(),
  visibilityEnd: z.string(),
  displayOrder: z.number().int(),
  isActive: z.boolean(),
}).refine(
  (data) => new Date(data.visibilityEnd) > new Date(data.visibilityStart),
  { message: 'End date must be after start date', path: ['visibilityEnd'] }
);

export const updateBannerSchema = createBannerSchema.partial();

// =============================================================================
// Types
// =============================================================================

export type CommunityBanner = z.infer<typeof communityBannerSchema>;
export type CreateBannerInput = z.infer<typeof createBannerSchema>;
export type UpdateBannerInput = z.infer<typeof updateBannerSchema>;

// =============================================================================
// Extended Types
// =============================================================================

/**
 * Banner with computed status based on current time and visibility window
 */
export interface CommunityBannerWithStatus extends CommunityBanner {
  status: BannerStatus;
}

/**
 * Response for active banners query
 */
export interface ActiveBannersResponse {
  banners: CommunityBanner[];
}

// =============================================================================
// Utility Functions
// =============================================================================

/**
 * Compute banner status based on current time and visibility window
 */
export function computeBannerStatus(banner: CommunityBanner): BannerStatus {
  if (!banner.isActive) {
    return 'disabled';
  }

  const now = new Date();
  const start = new Date(banner.visibilityStart);
  const end = new Date(banner.visibilityEnd);

  if (now < start) {
    return 'scheduled';
  }

  if (now > end) {
    return 'expired';
  }

  return 'active';
}

// =============================================================================
// Constants
// =============================================================================

export const BANNER_CONSTANTS = {
  AUTO_ROTATE_INTERVAL_MS: 6000,
  MAX_ACTIVE_BANNERS: 10,
  IMAGE_ASPECT_RATIO: 21 / 9, // Cinematic banner ratio
} as const;
