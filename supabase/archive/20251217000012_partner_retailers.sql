-- Migration: Create partner retailers and personal offers tables
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Partner retailer management and exclusive price offers

-- ==================== partner_retailers table ====================
-- Verified retailers authorized to send personal price offers
CREATE TABLE partner_retailers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Partner information
  name TEXT NOT NULL UNIQUE, -- e.g., 'Bergzeit.de'
  website_url TEXT NOT NULL,
  logo_url TEXT,

  -- API credentials
  api_key TEXT NOT NULL UNIQUE,
  api_secret_hash TEXT NOT NULL, -- Hashed for security

  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),

  -- Rate limiting
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 100,
  rate_limit_per_day INTEGER NOT NULL DEFAULT 1000,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_partner_retailers_api_key ON partner_retailers(api_key);
CREATE INDEX idx_partner_retailers_status ON partner_retailers(status) WHERE status = 'active';

-- ==================== personal_offers table ====================
-- Exclusive price offers from partner retailers
CREATE TABLE personal_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_retailer_id UUID NOT NULL REFERENCES partner_retailers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Offer details
  original_price DECIMAL(10,2) NOT NULL,
  offer_price DECIMAL(10,2) NOT NULL,
  offer_currency TEXT NOT NULL DEFAULT 'EUR',
  savings_amount DECIMAL(10,2) GENERATED ALWAYS AS (original_price - offer_price) STORED,
  savings_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    ROUND(((original_price - offer_price) / original_price * 100), 2)
  ) STORED,

  -- Product details
  product_name TEXT NOT NULL,
  product_url TEXT NOT NULL,
  product_image_url TEXT,

  -- Offer validity
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN GENERATED ALWAYS AS (expires_at > NOW()) STORED,

  -- Tracking
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  viewed_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  converted_at TIMESTAMPTZ, -- When user marks item as purchased

  -- Constraints
  CHECK (offer_price < original_price),
  CHECK (expires_at > created_at),
  UNIQUE(partner_retailer_id, user_id, gear_item_id, created_at) -- Prevent duplicate offers
);

-- Indexes
CREATE INDEX idx_personal_offers_user ON personal_offers(user_id);
CREATE INDEX idx_personal_offers_active ON personal_offers(is_active) WHERE is_active = true;
CREATE INDEX idx_personal_offers_expires ON personal_offers(expires_at);

-- ==================== Update timestamp trigger ====================
CREATE TRIGGER update_partner_retailers_updated_at
  BEFORE UPDATE ON partner_retailers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
