/**
 * Conversion and Billing Types
 * Feature: 053-merchant-integration
 *
 * Types for conversion tracking, merchant billing, and transaction management.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export type ConversionStatus = 'pending' | 'confirmed' | 'disputed' | 'refunded';

export type TransactionType = 'listing_fee' | 'offer_fee' | 'commission' | 'adjustment';

export type TransactionStatus = 'pending' | 'invoiced' | 'paid' | 'disputed';

export type BillingCycleStatus = 'pending' | 'invoiced' | 'paid' | 'overdue';

export type DisputeReason = 'never_purchased' | 'wrong_price' | 'wrong_item' | 'other';

export type FraudFlagType =
  | 'late_attribution'
  | 'high_value'
  | 'velocity_anomaly'
  | 'disputed';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Conversion - record of wishlist item purchased via merchant offer
 */
export interface Conversion {
  id: string;
  offerId: string;
  userId: string;
  merchantId: string;
  catalogItemId: string;
  gearItemId: string | null; // Created inventory item
  salePrice: number;
  commissionPercent: number;
  commissionAmount: number;
  isLocalPickup: boolean;
  pickupLocationId: string | null;
  status: ConversionStatus;
  requiresReview: boolean;
  reviewReason: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  conversionDate: string;
  createdAt: string;
}

/**
 * Conversion detail with related entities
 */
export interface ConversionDetail extends Conversion {
  offer: {
    id: string;
    regularPrice: number;
    offerPrice: number;
    acceptedAt: string | null;
  };
  catalogItem: {
    id: string;
    name: string;
    brand: string | null;
    price: number;
    imageUrl: string | null;
  };
  attributionDays: number; // Days between offer acceptance and conversion
  isLateAttribution: boolean; // > 30 days
  flags: FraudFlagType[];
  userRating: number | null;
  userFeedback: string | null;
}

/**
 * Merchant transaction - billing record for fees and commissions
 */
export interface MerchantTransaction {
  id: string;
  merchantId: string;
  type: TransactionType;
  amount: number;
  description: string | null;
  referenceId: string | null; // Related loadout, offer, or conversion ID
  referenceType: 'loadout' | 'offer' | 'conversion' | null;
  billingCycleStart: string;
  billingCycleEnd: string;
  status: TransactionStatus;
  invoiceNumber: string | null;
  createdAt: string;
}

/**
 * Billing cycle - monthly aggregation of transactions
 */
export interface BillingCycle {
  id: string;
  merchantId: string;
  cycleStart: string;
  cycleEnd: string;
  listingFees: number;
  offerFees: number;
  commissions: number;
  totalDue: number;
  status: BillingCycleStatus;
  invoiceUrl: string | null;
  dueDate: string;
  paidAt: string | null;
  createdAt: string;
}

/**
 * Billing cycle with detailed line items
 */
export interface BillingCycleDetail extends BillingCycle {
  lineItems: BillingLineItem[];
  paymentHistory: Array<{
    date: string;
    amount: number;
    reference: string | null;
  }>;
}

/**
 * Individual line item in a billing cycle
 */
export interface BillingLineItem {
  id: string;
  type: TransactionType;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  relatedEntityId: string | null;
  date: string;
}

// ============================================================================
// Analytics Types
// ============================================================================

/**
 * Merchant billing summary
 */
export interface BillingSummary {
  periodMonths: number;
  totalListingFees: number;
  totalOfferFees: number;
  totalCommissions: number;
  totalPaid: number;
  totalOutstanding: number;
  monthlyBreakdown: Array<{
    month: string;
    listingFees: number;
    offerFees: number;
    commissions: number;
    total: number;
  }>;
}

/**
 * Conversion analytics for merchants
 */
export interface ConversionAnalytics {
  periodDays: number;
  totalConversions: number;
  confirmedConversions: number;
  disputedConversions: number;
  totalRevenue: number;
  totalCommissions: number;
  conversionRate: number;
  averageOrderValue: number;
  localPickupPercent: number;
  byProduct: Array<{
    catalogItemId: string;
    catalogItemName: string;
    conversions: number;
    revenue: number;
  }>;
  trend: Array<{
    date: string;
    conversions: number;
    revenue: number;
  }>;
}

// ============================================================================
// Flagged Conversions (Admin)
// ============================================================================

/**
 * Flagged conversion for admin review
 */
export interface FlaggedConversion extends ConversionDetail {
  flagReason: FraudFlagType;
  flaggedAt: string;
  reviewNotes: string | null;
  merchant: {
    id: string;
    businessName: string;
  };
}

// ============================================================================
// API Input Types
// ============================================================================

export interface LogConversionInput {
  offerId: string;
  salePrice: number;
  isLocalPickup?: boolean;
  receiptReference?: string;
}

export interface ConversionConfirmInput {
  rating?: number; // 1-5
  feedback?: string;
}

export interface ConversionDisputeInput {
  reason: DisputeReason;
  details?: string;
}

export interface MarkPaidInput {
  paymentReference?: string;
  paymentDate?: string;
}

// ============================================================================
// Filter Types
// ============================================================================

export interface ConversionFilters {
  status?: ConversionStatus;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface TransactionFilters {
  type?: TransactionType;
  fromDate?: string;
  toDate?: string;
  page?: number;
  limit?: number;
}

export interface BillingCycleFilters {
  status?: BillingCycleStatus;
  year?: number;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const logConversionSchema = z.object({
  offerId: z.string().uuid('Invalid offer ID'),
  salePrice: z.number().positive('Sale price must be positive'),
  isLocalPickup: z.boolean().default(false),
  receiptReference: z.string().max(100).optional(),
});

export const conversionConfirmSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  feedback: z.string().max(500).optional(),
});

export const conversionDisputeSchema = z.object({
  reason: z.enum(['never_purchased', 'wrong_price', 'wrong_item', 'other']),
  details: z.string().max(1000).optional(),
});

// ============================================================================
// Constants
// ============================================================================

/** Default commission rate for conversions */
export const DEFAULT_COMMISSION_PERCENT = 5.0;

/** Attribution window in days */
export const ATTRIBUTION_WINDOW_DAYS = 30;

/** Fee per offer sent (EUR) */
export const OFFER_FEE_EUR = 0.50;

/** Monthly listing fee per published loadout (EUR) */
export const LISTING_FEE_EUR = 9.99;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate commission amount from sale price
 */
export function calculateCommission(
  salePrice: number,
  commissionPercent: number = DEFAULT_COMMISSION_PERCENT
): number {
  return Math.round(salePrice * (commissionPercent / 100) * 100) / 100;
}

/**
 * Check if conversion is within attribution window
 */
export function isWithinAttributionWindow(
  offerAcceptedAt: string,
  conversionDate: string,
  windowDays: number = ATTRIBUTION_WINDOW_DAYS
): boolean {
  const accepted = new Date(offerAcceptedAt);
  const converted = new Date(conversionDate);
  const diffDays =
    (converted.getTime() - accepted.getTime()) / (1000 * 60 * 60 * 24);
  return diffDays <= windowDays;
}

/**
 * Calculate days between offer acceptance and conversion
 */
export function getAttributionDays(
  offerAcceptedAt: string,
  conversionDate: string
): number {
  const accepted = new Date(offerAcceptedAt);
  const converted = new Date(conversionDate);
  return Math.floor(
    (converted.getTime() - accepted.getTime()) / (1000 * 60 * 60 * 24)
  );
}

/**
 * Detect potential fraud indicators
 */
export function detectFraudFlags(
  conversion: Conversion,
  offerAcceptedAt: string | null,
  averagePrice: number
): FraudFlagType[] {
  const flags: FraudFlagType[] = [];

  // Late attribution (> 30 days)
  if (offerAcceptedAt) {
    const days = getAttributionDays(offerAcceptedAt, conversion.conversionDate);
    if (days > ATTRIBUTION_WINDOW_DAYS) {
      flags.push('late_attribution');
    }
  }

  // High value (> 3x average) - only check if averagePrice is valid
  if (Number.isFinite(averagePrice) &&
      averagePrice > 0 &&
      Number.isFinite(conversion.salePrice) &&
      conversion.salePrice > averagePrice * 3) {
    flags.push('high_value');
  }

  // Status-based
  if (conversion.status === 'disputed') {
    flags.push('disputed');
  }

  return flags;
}

/**
 * Get billing cycle dates for a given date
 */
export function getBillingCycleDates(date: Date = new Date()): {
  start: string;
  end: string;
} {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

/**
 * Calculate total due for a billing cycle
 */
export function calculateBillingTotal(
  listingFees: number,
  offerFees: number,
  commissions: number
): number {
  return Math.round((listingFees + offerFees + commissions) * 100) / 100;
}
