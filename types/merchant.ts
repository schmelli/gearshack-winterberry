/**
 * Merchant Integration Types
 * Feature: 053-merchant-integration
 *
 * Types for merchant accounts, locations, and catalog management.
 */

import { z } from 'zod';

// ============================================================================
// Enums
// ============================================================================

export type MerchantStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

export type MerchantBusinessType = 'local' | 'chain' | 'online';

export type LocationGranularity = 'city' | 'neighborhood' | 'none';

// ============================================================================
// Core Entities
// ============================================================================

/**
 * Merchant account - verified business with portal access
 */
export interface Merchant {
  id: string;
  userId: string;
  businessName: string;
  businessType: MerchantBusinessType;
  status: MerchantStatus;
  verifiedAt: string | null;
  verifiedBy: string | null;
  contactEmail: string;
  contactPhone: string | null;
  website: string | null;
  logoUrl: string | null;
  description: string | null;
  taxId: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Physical store location for merchants
 */
export interface MerchantLocation {
  id: string;
  merchantId: string;
  name: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postalCode: string;
  country: string;
  latitude: number;
  longitude: number;
  phone: string | null;
  hours: MerchantHours | null;
  isPrimary: boolean;
  createdAt: string;
}

/**
 * Operating hours for a location
 */
export interface MerchantHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string; // HH:mm format
  close: string; // HH:mm format
  closed?: boolean;
}

/**
 * Product in merchant's catalog
 */
export interface MerchantCatalogItem {
  id: string;
  merchantId: string;
  sku: string;
  name: string;
  brand: string | null;
  description: string | null;
  price: number;
  weightGrams: number | null;
  categoryId: string | null;
  imageUrl: string | null;
  externalUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// User Location Sharing
// ============================================================================

/**
 * Per-merchant location sharing consent
 */
export interface UserLocationShare {
  id: string;
  userId: string;
  merchantId: string;
  granularity: LocationGranularity;
  city: string | null;
  neighborhood: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Merchant Block
// ============================================================================

/**
 * User blocks merchant from sending offers
 */
export interface MerchantBlock {
  id: string;
  userId: string;
  merchantId: string;
  reason: string | null;
  createdAt: string;
}

// ============================================================================
// API Input Types
// ============================================================================

export interface MerchantApplicationInput {
  businessName: string;
  businessType: MerchantBusinessType;
  contactEmail: string;
  contactPhone?: string;
  website?: string;
  description?: string;
  taxId?: string;
}

export interface MerchantUpdateInput {
  businessName?: string;
  contactEmail?: string;
  contactPhone?: string;
  website?: string;
  description?: string;
}

export interface MerchantLocationInput {
  name: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  country?: string;
  latitude: number;
  longitude: number;
  phone?: string;
  hours?: MerchantHours;
  isPrimary?: boolean;
}

export interface CatalogItemInput {
  sku: string;
  name: string;
  brand?: string;
  description?: string;
  price: number;
  weightGrams?: number;
  categoryId?: string;
  externalUrl?: string;
}

// ============================================================================
// View Types (for UI)
// ============================================================================

/**
 * Summary view of merchant for display
 */
export interface MerchantSummary {
  id: string;
  businessName: string;
  businessType: MerchantBusinessType;
  logoUrl: string | null;
  isVerified: boolean;
}

/**
 * Merchant with distance calculation
 */
export interface MerchantWithDistance extends MerchantSummary {
  nearestLocationKm: number | null;
  nearestLocationName: string | null;
}

// ============================================================================
// Zod Schemas (for validation)
// ============================================================================

export const merchantApplicationSchema = z.object({
  businessName: z.string().min(2, 'Business name must be at least 2 characters'),
  businessType: z.enum(['local', 'chain', 'online']),
  contactEmail: z.string().email('Invalid email address'),
  contactPhone: z.string().optional(),
  website: z.string().url('Invalid URL').optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  taxId: z.string().optional(),
});

export const merchantUpdateSchema = z.object({
  businessName: z.string().min(2).optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
});

export const merchantLocationSchema = z.object({
  name: z.string().min(1, 'Location name is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('DE'),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  phone: z.string().optional(),
  hours: z.record(z.string(), z.object({
    open: z.string(),
    close: z.string(),
    closed: z.boolean().optional(),
  })).optional(),
  isPrimary: z.boolean().default(false),
});

export const catalogItemSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  name: z.string().min(1, 'Name is required'),
  brand: z.string().optional(),
  description: z.string().optional(),
  price: z.number().finite().positive('Price must be positive'),
  weightGrams: z.number().finite().int().positive().optional(),
  categoryId: z.string().uuid().optional(),
  externalUrl: z.string().url().optional().or(z.literal('')),
});

// ============================================================================
// Type Guards
// ============================================================================

export function isMerchantApproved(merchant: Merchant): boolean {
  return merchant.status === 'approved';
}

export function isMerchantVerified(merchant: Merchant): boolean {
  return merchant.status === 'approved' && merchant.verifiedAt !== null;
}

export function isOnlineMerchant(merchant: Merchant): boolean {
  return merchant.businessType === 'online';
}
