/**
 * TypeScript types for Price Discovery & Monitoring feature
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

// ==================== Core Tracking ====================

export interface PriceTracking {
  id: string;
  user_id: string;
  gear_item_id: string;
  enabled: boolean;
  alerts_enabled: boolean;
  confirmed_product_id: string | null;
  match_confidence: number | null; // 0.00-1.00
  manual_product_url: string | null;
  created_at: string;
  updated_at: string;
  last_checked_at: string | null;
}

export interface PriceResult {
  id: string;
  tracking_id: string;
  source_type: 'google_shopping' | 'ebay' | 'retailer' | 'local_shop';
  source_name: string;
  source_url: string;
  price_amount: number;
  price_currency: string;
  shipping_cost: number | null;
  shipping_currency: string;
  total_price: number;
  product_name: string;
  product_image_url: string | null;
  product_condition: 'new' | 'used' | 'refurbished' | 'open_box' | null;
  is_local: boolean;
  shop_latitude: number | null;
  shop_longitude: number | null;
  distance_km: number | null;
  fetched_at: string;
  expires_at: string;
}

export interface PriceHistoryEntry {
  id: string;
  tracking_id: string;
  lowest_price: number;
  highest_price: number;
  average_price: number;
  num_sources: number;
  recorded_at: string;
}

// ==================== Search Results ====================

export type PriceSearchStatus = 'idle' | 'loading' | 'success' | 'partial' | 'error';

export interface FuzzyMatch {
  product_name: string;
  similarity: number; // 0-1
  source_name: string;
  source_url: string;
  price_amount: number;
}

export interface FailedSource {
  source_name: string;
  error: string;
}

export interface PriceSearchResults {
  tracking_id: string;
  status: 'success' | 'partial' | 'error';
  results: PriceResult[];
  failed_sources: FailedSource[];
  fuzzy_matches: FuzzyMatch[];
  searched_at: string;
}

// ==================== Partner Offers ====================

export interface PartnerRetailer {
  id: string;
  name: string;
  website_url: string;
  logo_url: string | null;
  api_key: string;
  api_secret_hash: string;
  status: 'active' | 'suspended' | 'inactive';
  rate_limit_per_hour: number;
  rate_limit_per_day: number;
  created_at: string;
  updated_at: string;
}

export interface PersonalOffer {
  id: string;
  partner_retailer_id: string;
  user_id: string;
  tracking_id: string;
  original_price: number;
  offer_price: number;
  offer_currency: string;
  savings_amount: number;
  savings_percent: number;
  product_name: string;
  product_url: string;
  product_image_url: string | null;
  expires_at: string;
  is_active: boolean;
  created_at: string;
  viewed_at: string | null;
  clicked_at: string | null;
  converted_at: string | null;
}

export interface CreatePersonalOfferRequest {
  user_id: string;
  tracking_id: string;
  original_price: number;
  offer_price: number;
  product_name: string;
  product_url: string;
  product_image_url?: string;
  expires_at: string;
}

// ==================== Alerts ====================

export type AlertType =
  | 'price_drop'
  | 'local_shop_available'
  | 'community_member_available'
  | 'personal_offer';

export interface PriceAlert {
  id: string;
  user_id: string;
  tracking_id: string | null;
  offer_id: string | null;
  alert_type: AlertType;
  title: string;
  message: string;
  link_url: string | null;
  sent_via_push: boolean;
  sent_via_email: boolean;
  push_sent_at: string | null;
  email_sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  created_at: string;
}

export interface AlertPreferences {
  user_id: string;
  push_enabled: boolean;
  email_enabled: boolean;
  price_drop_enabled: boolean;
  local_shop_enabled: boolean;
  community_enabled: boolean;
  personal_offer_enabled: boolean;
  quiet_hours_start: string | null; // HH:MM format
  quiet_hours_end: string | null; // HH:MM format
  created_at: string;
  updated_at: string;
}

// ==================== Community ====================

export interface CommunityAvailability {
  gear_item_id: string;
  item_name: string;
  user_count: number;
  min_price: number | null;
  max_price: number | null;
  avg_price: number | null;
}

// ==================== API Request/Response Types ====================

export interface EnableTrackingRequest {
  gear_item_id: string;
  alerts_enabled?: boolean;
}

export interface DisableTrackingRequest {
  gear_item_id: string;
}

export interface SearchPricesRequest {
  gear_item_id: string;
  item_name?: string;
  user_location?: {
    latitude: number;
    longitude: number;
  };
}

export interface ConfirmMatchRequest {
  tracking_id: string;
  selected_product_id: string;
  confidence: number;
}

export interface PriceHistoryRequest {
  tracking_id: string;
  days?: number; // 1-90, default 30
}

export interface UpdateAlertPreferencesRequest {
  push_enabled?: boolean;
  email_enabled?: boolean;
  price_drop_enabled?: boolean;
  local_shop_enabled?: boolean;
  community_enabled?: boolean;
  personal_offer_enabled?: boolean;
  quiet_hours_start?: string;
  quiet_hours_end?: string;
}
