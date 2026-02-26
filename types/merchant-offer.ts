/**
 * Merchant Offer Types
 * Feature: 053-merchant-integration
 *
 * Types for personalized offers from merchants to users based on wishlist matching.
 */

import { z } from 'zod';
import type { MerchantSummary } from './merchant';

// ============================================================================
// Enums
// ============================================================================

export type OfferStatus =
  | 'pending'
  | 'viewed'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'converted';

/**
 * Valid state transitions for offers
 * - pending → viewed (user opens offer)
 * - pending → expired (auto, offer not viewed before expiration)
 * - viewed → accepted (user accepts)
 * - viewed → declined (user declines)
 * - viewed → expired (auto, offer not responded before expiration)
 * - accepted → converted (user marks purchase)
 * - accepted → expired (auto, purchase not marked within attribution window)
 */
export const VALID_OFFER_TRANSITIONS: Record<OfferStatus, OfferStatus[]> = {
  pending: ['viewed', 'expired'],
  viewed: ['accepted', 'declined', 'expired'],
  accepted: ['converted', 'expired'],
  declined: [], // terminal state
  expired: [], // terminal state
  converted: [], // terminal state
};

export type ProximityBucket = '5km' | '10km' | '25km' | '50km' | '100km+';

export type OfferReportReason = 'spam' | 'misleading' | 'inappropriate' | 'other';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Merchant offer - personalized discount sent to user
 */
export interface MerchantOffer {
  id: string;
  merchantId: string;
  userId: string;
  catalogItemId: string;
  wishlistItemId: string | null;
  regularPrice: number;
  offerPrice: number;
  message: string | null;
  status: OfferStatus;
  expiresAt: string;
  viewedAt: string | null;
  respondedAt: string | null;
  offerFeeCharged: number;
  createdAt: string;
}

/**
 * Offer report from user
 */
export interface OfferReport {
  id: string;
  offerId: string;
  userId: string;
  reason: OfferReportReason;
  details: string | null;
  createdAt: string;
}

// ============================================================================
// Wishlist Insights (Merchant View)
// ============================================================================

/**
 * Aggregate wishlist demand for a product
 */
export interface WishlistInsight {
  catalogItemId: string;
  catalogItemName: string;
  catalogItemBrand: string | null;
  userCount: number;
  proximityBreakdown: {
    within5km: number;
    within10km: number;
    within25km: number;
    within50km: number;
    beyond50km: number;
  };
  recentAddCount: number; // Added in last 7 days
}

/**
 * Detailed view of users with item on wishlist (anonymized)
 */
export interface WishlistInsightDetail {
  catalogItem: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    imageUrl: string | null;
  };
  users: Array<{
    anonymousId: string; // e.g., "User A", "User B"
    proximityBucket: ProximityBucket;
    addedDaysAgo: number;
    canSendOffer: boolean; // false if blocked or recent offer exists
  }>;
}

// ============================================================================
// User-Facing Offer Views
// ============================================================================

/**
 * Offer as seen by user (simplified)
 */
export interface UserOffer {
  id: string;
  merchant: MerchantSummary;
  productName: string;
  productBrand: string | null;
  productImageUrl: string | null;
  regularPrice: number;
  offerPrice: number;
  discountPercent: number;
  status: Exclude<OfferStatus, 'converted'>; // user doesn't see 'converted'
  expiresAt: string;
  createdAt: string;
}

/**
 * Detailed offer view for user
 */
export interface UserOfferDetail extends UserOffer {
  message: string | null;
  nearestLocation: {
    name: string;
    distanceKm: number;
    address: string;
  } | null;
  wishlistItemId: string | null;
  expiresIn: string; // Human-readable, e.g., "12 days"
}

// ============================================================================
// Merchant-Facing Offer Views
// ============================================================================

/**
 * Offer as seen by merchant
 */
export interface MerchantOfferView extends MerchantOffer {
  catalogItem: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    imageUrl: string | null;
  };
  discountPercent: number;
}

/**
 * Detailed merchant offer with analytics
 */
export interface MerchantOfferDetail extends MerchantOfferView {
  userProximityBucket: ProximityBucket | null;
  conversion: {
    id: string;
    salePrice: number;
    commissionAmount: number;
    isLocalPickup: boolean;
    conversionDate: string;
  } | null;
}

/**
 * Offer analytics summary
 */
export interface OfferAnalytics {
  periodDays: number;
  offersSent: number;
  offersViewed: number;
  offersAccepted: number;
  offersDeclined: number;
  offersExpired: number;
  conversions: number;
  viewRate: number;
  acceptanceRate: number;
  conversionRate: number;
  totalOfferFees: number;
  totalCommissions: number;
  averageDiscountPercent: number;
}

// ============================================================================
// API Input Types
// ============================================================================

export interface CreateOffersInput {
  catalogItemId: string;
  regularPrice?: number; // Defaults to catalog item price
  offerPrice: number;
  message?: string;
  expiresInDays?: number; // Default 14, max 30
  userIds: string[]; // Anonymous user IDs from wishlist insights
}

export interface OfferReportInput {
  reason: OfferReportReason;
  details?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface UserOfferFilters {
  status?: OfferStatus;
  includeExpired?: boolean;
}

export interface MerchantOfferFilters {
  status?: OfferStatus;
  catalogItemId?: string;
  page?: number;
  limit?: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const createOffersSchema = z.object({
  catalogItemId: z.string().uuid('Invalid catalog item ID'),
  regularPrice: z.number().finite().positive().optional(),
  offerPrice: z.number().finite().positive('Offer price must be positive'),
  message: z.string().max(500, 'Message cannot exceed 500 characters').optional(),
  expiresInDays: z.number().finite().int().min(1).max(30).default(14),
  userIds: z.array(z.string()).min(1, 'At least one user must be selected'),
}).refine(
  (data) => !data.regularPrice || data.offerPrice < data.regularPrice,
  { message: 'Offer price must be less than regular price', path: ['offerPrice'] }
);

export const offerReportSchema = z.object({
  reason: z.enum(['spam', 'misleading', 'inappropriate', 'other']),
  details: z.string().max(1000).optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate discount percentage from prices
 */
export function calculateDiscountPercent(
  regularPrice: number,
  offerPrice: number
): number {
  if (!Number.isFinite(regularPrice) || !Number.isFinite(offerPrice)) return 0;
  if (regularPrice <= 0) return 0;
  return Math.round(((regularPrice - offerPrice) / regularPrice) * 100);
}

/**
 * Get human-readable time until expiration
 */
export function getExpiresIn(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  if (hours > 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return 'Less than an hour';
}

/**
 * Check if offer can transition to new status
 */
export function canOfferTransitionTo(
  currentStatus: OfferStatus,
  newStatus: OfferStatus
): boolean {
  return VALID_OFFER_TRANSITIONS[currentStatus].includes(newStatus);
}

/**
 * Check if offer is still actionable (not expired/declined/converted)
 */
export function isOfferActionable(offer: MerchantOffer): boolean {
  if (['declined', 'expired', 'converted'].includes(offer.status)) {
    return false;
  }
  return new Date(offer.expiresAt) > new Date();
}

/**
 * Get proximity bucket from distance in meters
 */
export function getProximityBucket(distanceMeters: number): ProximityBucket {
  if (distanceMeters <= 5000) return '5km';
  if (distanceMeters <= 10000) return '10km';
  if (distanceMeters <= 25000) return '25km';
  if (distanceMeters <= 50000) return '50km';
  return '100km+';
}

/**
 * Check if merchant can send offer to user (rate limiting)
 * - Max 1 offer per product per user per 30 days
 */
export function canSendOffer(
  existingOffers: MerchantOffer[],
  catalogItemId: string,
  userId: string,
  cooldownDays: number = 30
): boolean {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - cooldownDays);

  return !existingOffers.some(
    (offer) =>
      offer.catalogItemId === catalogItemId &&
      offer.userId === userId &&
      new Date(offer.createdAt) > cutoffDate
  );
}
