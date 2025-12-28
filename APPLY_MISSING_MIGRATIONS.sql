-- =====================================================
-- COMBINED MIGRATIONS FOR SUPABASE
-- =====================================================
-- This file combines all missing migrations for:
-- - Price Tracking Feature (Feature 050)
-- - AI Assistant action_results column
--
-- Run this in your Supabase SQL Editor
-- Date: 2025-12-18
-- =====================================================


-- =====================================================
-- Migration 1: Enable Extensions
-- File: 20251217000010_enable_extensions.sql
-- =====================================================

-- Migration: Enable PostgreSQL extensions for price tracking
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Enable pg_trgm extension for fuzzy text matching

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Verify extension is enabled
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'
  ) THEN
    RAISE EXCEPTION 'pg_trgm extension failed to install';
  END IF;
END
$$;


-- =====================================================
-- Migration 2: Price Tracking Tables
-- File: 20251217000011_price_tracking_tables.sql
-- =====================================================

-- Migration: Create price tracking tables
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Core tables for price tracking, results, and history

-- ==================== price_tracking table ====================
-- Tracks which wishlist items have price tracking enabled
CREATE TABLE price_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,

  -- Tracking status
  enabled BOOLEAN NOT NULL DEFAULT true,
  alerts_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Product matching
  confirmed_product_id TEXT, -- External product ID after fuzzy match confirmation
  match_confidence DECIMAL(3,2), -- 0.00-1.00 from fuzzy matching
  manual_product_url TEXT, -- User-provided product URL if fuzzy match failed

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_checked_at TIMESTAMPTZ,

  -- Constraints
  UNIQUE(user_id, gear_item_id)
);

-- Indexes
CREATE INDEX idx_price_tracking_user ON price_tracking(user_id);
CREATE INDEX idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX idx_price_tracking_last_checked ON price_tracking(last_checked_at);

-- ==================== price_results table ====================
-- Current price data from external sources
CREATE TABLE price_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Source information
  source_type TEXT NOT NULL CHECK (source_type IN ('google_shopping', 'ebay', 'retailer', 'local_shop')),
  source_name TEXT NOT NULL, -- e.g., 'Bergfreunde.de', 'eBay Germany'
  source_url TEXT NOT NULL, -- Direct link to product page

  -- Pricing
  price_amount DECIMAL(10,2) NOT NULL,
  price_currency TEXT NOT NULL DEFAULT 'EUR',
  shipping_cost DECIMAL(10,2),
  shipping_currency TEXT DEFAULT 'EUR',
  total_price DECIMAL(10,2) GENERATED ALWAYS AS (price_amount + COALESCE(shipping_cost, 0)) STORED,

  -- Product details
  product_name TEXT NOT NULL,
  product_image_url TEXT,
  product_condition TEXT, -- 'new', 'used', 'refurbished'

  -- Local shop specific
  is_local BOOLEAN NOT NULL DEFAULT false,
  shop_latitude DECIMAL(9,6),
  shop_longitude DECIMAL(9,6),
  distance_km DECIMAL(6,2), -- Calculated at query time, stored for sorting

  -- Metadata
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'), -- Cache TTL

  -- Constraints
  CHECK (
    (is_local = false) OR
    (is_local = true AND shop_latitude IS NOT NULL AND shop_longitude IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_price_results_tracking ON price_results(tracking_id);
CREATE INDEX idx_price_results_expires ON price_results(expires_at);
CREATE INDEX idx_price_results_source_type ON price_results(source_type);

-- ==================== price_history table ====================
-- Historical price data for trend analysis (90-day retention)
CREATE TABLE price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,

  -- Historical data point
  lowest_price DECIMAL(10,2) NOT NULL,
  highest_price DECIMAL(10,2) NOT NULL,
  average_price DECIMAL(10,2) NOT NULL,
  num_sources INTEGER NOT NULL, -- How many sources returned data

  -- Snapshot metadata
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CHECK (lowest_price <= highest_price)
);

-- Indexes
CREATE INDEX idx_price_history_tracking ON price_history(tracking_id);
CREATE INDEX idx_price_history_recorded_at ON price_history(recorded_at);

-- ==================== Automatic cleanup function ====================
-- Purge price history older than 90 days
CREATE OR REPLACE FUNCTION purge_old_price_history()
RETURNS void AS $$
BEGIN
  DELETE FROM price_history
  WHERE recorded_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- ==================== Update timestamp trigger ====================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_price_tracking_updated_at
  BEFORE UPDATE ON price_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration 3: Partner Retailers
-- File: 20251217000012_partner_retailers.sql
-- =====================================================

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


-- =====================================================
-- Migration 4: Alerts Tables
-- File: 20251217000013_alerts.sql
-- =====================================================

-- Migration: Create price alerts and alert preferences tables
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Alert history, delivery tracking, and user preferences

-- ==================== price_alerts table ====================
-- Alert history and delivery tracking
CREATE TABLE price_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_id UUID REFERENCES price_tracking(id) ON DELETE CASCADE,
  offer_id UUID REFERENCES personal_offers(id) ON DELETE SET NULL,

  -- Alert type
  alert_type TEXT NOT NULL CHECK (alert_type IN (
    'price_drop',
    'local_shop_available',
    'community_member_available',
    'personal_offer'
  )),

  -- Alert content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- Deep link to relevant page

  -- Delivery status
  sent_via_push BOOLEAN NOT NULL DEFAULT false,
  sent_via_email BOOLEAN NOT NULL DEFAULT false,
  push_sent_at TIMESTAMPTZ,
  email_sent_at TIMESTAMPTZ,

  -- Engagement tracking
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_created ON price_alerts(created_at DESC);
CREATE INDEX idx_price_alerts_tracking ON price_alerts(tracking_id);

-- ==================== alert_preferences table ====================
-- User notification channel preferences
CREATE TABLE alert_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Channel preferences
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT false,

  -- Alert type preferences (granular control)
  price_drop_enabled BOOLEAN NOT NULL DEFAULT true,
  local_shop_enabled BOOLEAN NOT NULL DEFAULT true,
  community_enabled BOOLEAN NOT NULL DEFAULT true,
  personal_offer_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Quiet hours (optional)
  quiet_hours_start TIME,
  quiet_hours_end TIME,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== Update timestamp trigger ====================
CREATE TRIGGER update_alert_preferences_updated_at
  BEFORE UPDATE ON alert_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();


-- =====================================================
-- Migration 5: Views and Functions
-- File: 20251217000014_views_functions.sql
-- =====================================================

-- Migration: Create views and functions for price tracking
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Community availability view and fuzzy search function

-- ==================== community_availability view ====================
-- Aggregate count of users with same item in inventory
CREATE OR REPLACE VIEW community_availability AS
SELECT
  gi.id AS gear_item_id,
  gi.name AS item_name,
  COUNT(DISTINCT gi2.user_id) AS user_count,
  MIN(gi2.price_paid) AS min_price,
  MAX(gi2.price_paid) AS max_price,
  AVG(gi2.price_paid) AS avg_price
FROM gear_items gi
LEFT JOIN gear_items gi2 ON
  gi2.name = gi.name AND
  gi2.status = 'own' AND
  gi2.user_id != gi.user_id
WHERE gi.status = 'wishlist'
GROUP BY gi.id, gi.name;

-- ==================== fuzzy_search_products function ====================
-- Fuzzy match wishlist item names to price result product names
CREATE OR REPLACE FUNCTION fuzzy_search_products(
  search_term TEXT,
  threshold DECIMAL DEFAULT 0.3
)
RETURNS TABLE (
  product_name TEXT,
  similarity DECIMAL,
  source_name TEXT,
  source_url TEXT,
  price_amount DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pr.product_name,
    SIMILARITY(pr.product_name, search_term) AS similarity,
    pr.source_name,
    pr.source_url,
    pr.price_amount
  FROM price_results pr
  WHERE SIMILARITY(pr.product_name, search_term) > threshold
  ORDER BY similarity DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql STABLE;


-- =====================================================
-- Migration 6: RLS Policies
-- File: 20251217000015_rls_policies.sql
-- =====================================================

-- Migration: Enable RLS and create policies for all tables
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- Purpose: Row-Level Security policies for data access control

-- ==================== price_tracking RLS ====================
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_tracking_select ON price_tracking
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY price_tracking_insert ON price_tracking
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND
    (SELECT COUNT(*) FROM price_tracking WHERE user_id = auth.uid() AND enabled = true) < 50
  );

CREATE POLICY price_tracking_update ON price_tracking
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY price_tracking_delete ON price_tracking
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ==================== price_results RLS ====================
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_results_select ON price_results
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_results.tracking_id
      AND pt.user_id = auth.uid()
    )
  );

-- Only service role can insert/update/delete price results (from background jobs)
CREATE POLICY price_results_service_only ON price_results
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== price_history RLS ====================
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_history_select ON price_history
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_history.tracking_id
      AND pt.user_id = auth.uid()
    )
  );

CREATE POLICY price_history_service_only ON price_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== personal_offers RLS ====================
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;

CREATE POLICY personal_offers_select ON personal_offers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Only service role can insert (from partner API endpoint)
CREATE POLICY personal_offers_service_only ON personal_offers
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== price_alerts RLS ====================
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY price_alerts_select ON price_alerts
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY price_alerts_service_only ON price_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== alert_preferences RLS ====================
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY alert_preferences_select ON alert_preferences
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY alert_preferences_insert ON alert_preferences
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY alert_preferences_update ON alert_preferences
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());


-- =====================================================
-- Migration 7: Fix Personal Offers Schema
-- File: 20251217000016_fix_personal_offers_schema.sql
-- =====================================================

-- Migration: Fix personal_offers schema
-- Feature: 050-price-tracking (Review fix #6)
-- Date: 2025-12-17
-- Purpose: Replace gear_item_id with tracking_id to properly reference price_tracking

-- Drop existing constraints
ALTER TABLE personal_offers DROP CONSTRAINT IF EXISTS personal_offers_gear_item_id_fkey;
ALTER TABLE personal_offers DROP CONSTRAINT IF EXISTS personal_offers_partner_retailer_id_user_id_gear_item_id_created_at_key;

-- Drop the gear_item_id column
ALTER TABLE personal_offers DROP COLUMN IF EXISTS gear_item_id;

-- Add tracking_id column with proper foreign key
ALTER TABLE personal_offers
ADD COLUMN tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE;

-- Recreate uniqueness constraint with tracking_id
ALTER TABLE personal_offers
ADD CONSTRAINT personal_offers_partner_user_tracking_unique
UNIQUE(partner_retailer_id, user_id, tracking_id, created_at);

-- Add index for tracking_id
CREATE INDEX idx_personal_offers_tracking_id ON personal_offers(tracking_id);

-- Verify the change
DO $$
BEGIN
  RAISE NOTICE '✓ Migration Complete: personal_offers now uses tracking_id';
END $$;


-- =====================================================
-- Migration 8: Transaction Support
-- File: 20251217000017_transaction_support.sql
-- =====================================================

-- =============================================================================
-- Migration: Transaction Support for Price Tracking
-- Feature: 050-price-tracking (Review fix #9)
-- Date: 2025-12-17
-- =============================================================================
-- Adds database functions for atomic multi-table operations
-- =============================================================================

-- Function: Record price snapshot atomically
-- Inserts price results and history in a single transaction
CREATE OR REPLACE FUNCTION record_price_snapshot(
  p_tracking_id UUID,
  p_results JSONB[],
  p_lowest_price NUMERIC,
  p_highest_price NUMERIC,
  p_average_price NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_history_id UUID;
  v_result JSONB;
BEGIN
  -- Insert price history snapshot
  INSERT INTO price_history (
    tracking_id,
    lowest_price,
    highest_price,
    average_price,
    num_sources
  ) VALUES (
    p_tracking_id,
    p_lowest_price,
    p_highest_price,
    p_average_price,
    array_length(p_results, 1)
  )
  RETURNING id INTO v_history_id;

  -- Insert all price results
  FOREACH v_result IN ARRAY p_results
  LOOP
    INSERT INTO price_results (
      tracking_id,
      source_type,
      source_name,
      source_url,
      price_amount,
      price_currency,
      shipping_cost,
      shipping_currency,
      total_price,
      product_name,
      product_image_url,
      product_condition,
      is_local,
      shop_latitude,
      shop_longitude,
      distance_km,
      fetched_at,
      expires_at
    ) VALUES (
      p_tracking_id,
      (v_result->>'source_type')::TEXT,
      (v_result->>'source_name')::TEXT,
      (v_result->>'source_url')::TEXT,
      (v_result->>'price_amount')::NUMERIC,
      (v_result->>'price_currency')::TEXT,
      (v_result->>'shipping_cost')::NUMERIC,
      (v_result->>'shipping_currency')::TEXT,
      (v_result->>'total_price')::NUMERIC,
      (v_result->>'product_name')::TEXT,
      (v_result->>'product_image_url')::TEXT,
      (v_result->>'product_condition')::TEXT,
      (v_result->>'is_local')::BOOLEAN,
      (v_result->>'shop_latitude')::NUMERIC,
      (v_result->>'shop_longitude')::NUMERIC,
      (v_result->>'distance_km')::NUMERIC,
      (v_result->>'fetched_at')::TIMESTAMPTZ,
      (v_result->>'expires_at')::TIMESTAMPTZ
    );
  END LOOP;

  RETURN v_history_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Create alert with delivery tracking
-- Creates alert and marks delivery channels atomically
CREATE OR REPLACE FUNCTION create_price_alert(
  p_user_id UUID,
  p_tracking_id UUID DEFAULT NULL,
  p_offer_id UUID DEFAULT NULL,
  p_alert_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_link_url TEXT DEFAULT NULL,
  p_send_push BOOLEAN DEFAULT TRUE,
  p_send_email BOOLEAN DEFAULT FALSE
) RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO price_alerts (
    user_id,
    tracking_id,
    offer_id,
    alert_type,
    title,
    message,
    link_url,
    sent_via_push,
    sent_via_email
  ) VALUES (
    p_user_id,
    p_tracking_id,
    p_offer_id,
    p_alert_type,
    p_title,
    p_message,
    p_link_url,
    p_send_push,
    p_send_email
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Batch create personal offers
-- Creates multiple offers and returns count atomically
CREATE OR REPLACE FUNCTION create_personal_offers_batch(
  p_partner_id UUID,
  p_offers JSONB[]
) RETURNS TABLE (
  created_count INTEGER,
  offer_ids UUID[]
) AS $$
DECLARE
  v_offer JSONB;
  v_offer_ids UUID[] := ARRAY[]::UUID[];
  v_offer_id UUID;
BEGIN
  FOREACH v_offer IN ARRAY p_offers
  LOOP
    INSERT INTO personal_offers (
      partner_retailer_id,
      user_id,
      tracking_id,
      product_id,
      product_name,
      product_url,
      offer_price,
      original_price,
      currency,
      valid_until,
      description,
      terms
    ) VALUES (
      p_partner_id,
      (v_offer->>'user_id')::UUID,
      (v_offer->>'tracking_id')::UUID,
      v_offer->>'product_id',
      v_offer->>'product_name',
      v_offer->>'product_url',
      (v_offer->>'offer_price')::NUMERIC,
      (v_offer->>'original_price')::NUMERIC,
      v_offer->>'currency',
      (v_offer->>'valid_until')::TIMESTAMPTZ,
      v_offer->>'description',
      v_offer->>'terms'
    )
    RETURNING id INTO v_offer_id;

    v_offer_ids := array_append(v_offer_ids, v_offer_id);
  END LOOP;

  RETURN QUERY SELECT array_length(v_offer_ids, 1), v_offer_ids;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 20251217000017 complete: Transaction support functions created';
END $$;


-- =====================================================
-- Migration 9: Alert Delivery Queue
-- File: 20251217000018_alert_delivery_queue.sql
-- =====================================================

-- =============================================================================
-- Migration: Alert Delivery Queue and Retry Logic
-- Feature: 050-price-tracking (Review fix #10)
-- Date: 2025-12-17
-- =============================================================================
-- Adds dead-letter queue for failed alert deliveries with retry support
-- =============================================================================

-- Table: Alert delivery queue for retry logic
CREATE TABLE alert_delivery_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  delivery_channel TEXT NOT NULL CHECK (delivery_channel IN ('push', 'email')),

  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  next_retry_at TIMESTAMPTZ,
  last_error TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed')),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,

  -- Indexes
  CONSTRAINT unique_alert_channel UNIQUE (alert_id, delivery_channel)
);

-- Indexes for efficient queue processing
CREATE INDEX idx_alert_delivery_queue_status ON alert_delivery_queue(status);
CREATE INDEX idx_alert_delivery_queue_next_retry ON alert_delivery_queue(next_retry_at)
  WHERE status = 'pending';
CREATE INDEX idx_alert_delivery_queue_processing ON alert_delivery_queue(alert_id)
  WHERE status = 'processing';

-- RLS Policies
ALTER TABLE alert_delivery_queue ENABLE ROW LEVEL SECURITY;

-- Service role only (this is internal queue management)
CREATE POLICY "Service role can manage delivery queue" ON alert_delivery_queue
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- Function: Enqueue alert delivery
CREATE OR REPLACE FUNCTION enqueue_alert_delivery(
  p_alert_id UUID,
  p_delivery_channel TEXT
) RETURNS UUID AS $$
DECLARE
  v_queue_id UUID;
BEGIN
  INSERT INTO alert_delivery_queue (
    alert_id,
    delivery_channel,
    next_retry_at
  ) VALUES (
    p_alert_id,
    p_delivery_channel,
    NOW()
  )
  ON CONFLICT (alert_id, delivery_channel) DO NOTHING
  RETURNING id INTO v_queue_id;

  RETURN v_queue_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get next delivery batch for processing
CREATE OR REPLACE FUNCTION get_next_delivery_batch(
  p_batch_size INTEGER DEFAULT 10
) RETURNS TABLE (
  queue_id UUID,
  alert_id UUID,
  delivery_channel TEXT,
  attempt_count INTEGER,
  alert_user_id UUID,
  alert_title TEXT,
  alert_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE alert_delivery_queue q
  SET
    status = 'processing',
    attempt_count = attempt_count + 1
  FROM (
    SELECT id
    FROM alert_delivery_queue
    WHERE status = 'pending'
      AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      AND attempt_count < max_attempts
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ) batch
  WHERE q.id = batch.id
  RETURNING
    q.id,
    q.alert_id,
    q.delivery_channel,
    q.attempt_count,
    (SELECT user_id FROM price_alerts WHERE id = q.alert_id),
    (SELECT title FROM price_alerts WHERE id = q.alert_id),
    (SELECT message FROM price_alerts WHERE id = q.alert_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark delivery as successful
CREATE OR REPLACE FUNCTION mark_delivery_success(
  p_queue_id UUID
) RETURNS VOID AS $$
BEGIN
  UPDATE alert_delivery_queue
  SET
    status = 'delivered',
    delivered_at = NOW()
  WHERE id = p_queue_id;

  -- Update alert delivery timestamp
  UPDATE price_alerts a
  SET
    push_sent_at = CASE
      WHEN (SELECT delivery_channel FROM alert_delivery_queue WHERE id = p_queue_id) = 'push'
      THEN NOW()
      ELSE push_sent_at
    END,
    email_sent_at = CASE
      WHEN (SELECT delivery_channel FROM alert_delivery_queue WHERE id = p_queue_id) = 'email'
      THEN NOW()
      ELSE email_sent_at
    END
  WHERE id = (SELECT alert_id FROM alert_delivery_queue WHERE id = p_queue_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Mark delivery as failed with retry
CREATE OR REPLACE FUNCTION mark_delivery_failed(
  p_queue_id UUID,
  p_error_message TEXT
) RETURNS VOID AS $$
DECLARE
  v_attempt_count INTEGER;
  v_max_attempts INTEGER;
BEGIN
  SELECT attempt_count, max_attempts
  INTO v_attempt_count, v_max_attempts
  FROM alert_delivery_queue
  WHERE id = p_queue_id;

  IF v_attempt_count >= v_max_attempts THEN
    -- Max retries exceeded, mark as permanently failed
    UPDATE alert_delivery_queue
    SET
      status = 'failed',
      failed_at = NOW(),
      last_error = p_error_message
    WHERE id = p_queue_id;
  ELSE
    -- Schedule retry with exponential backoff
    UPDATE alert_delivery_queue
    SET
      status = 'pending',
      last_error = p_error_message,
      next_retry_at = NOW() + (POWER(2, attempt_count) * INTERVAL '1 minute')
    WHERE id = p_queue_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Clean up old delivered/failed records (retention: 7 days)
CREATE OR REPLACE FUNCTION cleanup_delivery_queue() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM alert_delivery_queue
  WHERE
    status IN ('delivered', 'failed')
    AND (delivered_at < NOW() - INTERVAL '7 days' OR failed_at < NOW() - INTERVAL '7 days');

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 20251217000018 complete: Alert delivery queue created';
END $$;


-- =====================================================
-- Migration 10: Add Action Results Column
-- File: 20251218000001_add_action_results_column.sql
-- =====================================================

-- Add action_results column to ai_messages table
-- This column tracks the execution status and results of AI tool calls

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS action_results jsonb;

COMMENT ON COLUMN ai_messages.action_results IS
  'Stores execution results for AI tool calls/actions. Format: { [actionId]: { status, executed_at, result?, error? } }';


-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this file:
-- 1. Remove @ts-nocheck from price tracking files
-- 2. Regenerate Supabase types: npx supabase gen types typescript --project-id pxtvbgilzzppnbienmot > types/supabase.ts
-- 3. Re-enable updateActionResult function in app/[locale]/ai-assistant/actions.ts
-- =====================================================
