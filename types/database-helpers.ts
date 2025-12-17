/**
 * Database Query Result Type Helpers
 * Feature: 050-price-tracking (Review fix #3, #13)
 * Date: 2025-12-17
 *
 * Explicit type definitions for database queries with joins
 * to replace unsafe `any` type assertions throughout the codebase.
 */

import type { Database } from './supabase';

// Base table types
type GearItem = Database['public']['Tables']['gear_items']['Row'];
type PartnerRetailer = Database['public']['Tables']['partner_retailers']['Row'];

/**
 * Price Tracking with Gear Item join
 */
export interface PriceTrackingWithGearItem {
  id: string;
  user_id: string;
  gear_item_id: string;
  enabled: boolean;
  alerts_enabled: boolean;
  confirmed_product_id: string | null;
  match_confidence: number | null;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
  gear_items: {
    name: string;
  };
}

/**
 * Personal Offer with Partner Retailer join
 */
export interface PersonalOfferWithPartner {
  id: string;
  partner_retailer_id: string;
  user_id: string;
  tracking_id: string;
  product_id: string;
  product_name: string;
  product_url: string;
  offer_price: number;
  original_price: number | null;
  currency: string;
  valid_until: string;
  description: string | null;
  terms: string | null;
  dismissed: boolean;
  notified_at: string | null;
  created_at: string;
  partner_retailers: {
    name: string;
    logo_url: string | null;
    website_url: string | null;
  };
}

/**
 * Fuzzy Search Result (from RPC function)
 */
export interface FuzzySearchResult {
  gear_item_id: string;
  name: string;
  similarity_score: number;
}
