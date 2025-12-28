-- =====================================================
-- COMBINED MIGRATIONS FOR SUPABASE (FIXED VERSION)
-- =====================================================
-- This version uses the EXACT schema from original migrations
-- Safe to run - will skip existing objects
--
-- Date: 2025-12-18
-- =====================================================

-- =====================================================
-- Enable Extensions
-- =====================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- Price Tracking Core Tables (from 20251217000011)
-- =====================================================

-- price_tracking table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS price_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT true,
    alerts_enabled BOOLEAN NOT NULL DEFAULT true,
    confirmed_product_id TEXT,
    match_confidence DECIMAL(3,2),
    manual_product_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_checked_at TIMESTAMPTZ,
    UNIQUE(user_id, gear_item_id)
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_tracking_user ON price_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_price_tracking_last_checked ON price_tracking(last_checked_at);

-- price_results table  
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS price_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL CHECK (source_type IN ('google_shopping', 'ebay', 'retailer', 'local_shop')),
    source_name TEXT NOT NULL,
    source_url TEXT NOT NULL,
    price_amount DECIMAL(10,2) NOT NULL,
    price_currency TEXT NOT NULL DEFAULT 'EUR',
    shipping_cost DECIMAL(10,2),
    shipping_currency TEXT DEFAULT 'EUR',
    total_price DECIMAL(10,2) GENERATED ALWAYS AS (price_amount + COALESCE(shipping_cost, 0)) STORED,
    product_name TEXT NOT NULL,
    product_image_url TEXT,
    product_condition TEXT,
    is_local BOOLEAN NOT NULL DEFAULT false,
    shop_latitude DECIMAL(9,6),
    shop_longitude DECIMAL(9,6),
    distance_km DECIMAL(6,2),
    fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours'),
    CHECK (
      (is_local = false) OR
      (is_local = true AND shop_latitude IS NOT NULL AND shop_longitude IS NOT NULL)
    )
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_results_tracking ON price_results(tracking_id);
CREATE INDEX IF NOT EXISTS idx_price_results_expires ON price_results(expires_at);
CREATE INDEX IF NOT EXISTS idx_price_results_source_type ON price_results(source_type);

-- price_history table
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
    lowest_price DECIMAL(10,2) NOT NULL,
    highest_price DECIMAL(10,2) NOT NULL,
    average_price DECIMAL(10,2) NOT NULL,
    num_sources INTEGER NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (lowest_price <= highest_price)
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_history_tracking ON price_history(tracking_id, recorded_at DESC);

-- =====================================================
-- Partner Retailers (from 20251217000012)
-- =====================================================

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS partner_retailers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    api_key TEXT UNIQUE NOT NULL,
    contact_email TEXT NOT NULL,
    webhook_url TEXT,
    is_active BOOLEAN DEFAULT true,
    rate_limit_per_hour INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_partner_retailers_api_key ON partner_retailers(api_key);
CREATE INDEX IF NOT EXISTS idx_partner_retailers_active ON partner_retailers(is_active) WHERE is_active = true;

-- =====================================================
-- Alerts Tables (from 20251217000013)
-- =====================================================

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS price_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tracking_id UUID REFERENCES price_tracking(id) ON DELETE CASCADE,
    offer_id UUID,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock', 'personal_offer')),
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    price_data JSONB,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    valid_until TIMESTAMPTZ
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_price_alerts_user_dismissed ON price_alerts(user_id, dismissed) WHERE dismissed = false;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS personal_offers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_retailer_id UUID NOT NULL REFERENCES partner_retailers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_url TEXT NOT NULL,
    product_image_url TEXT,
    offer_price DECIMAL(10,2) NOT NULL,
    original_price DECIMAL(10,2),
    currency TEXT NOT NULL DEFAULT 'USD',
    description TEXT,
    valid_until TIMESTAMPTZ NOT NULL,
    dismissed BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_personal_offers_user ON personal_offers(user_id, dismissed) WHERE dismissed = false;

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS alert_preferences (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    price_drop_threshold DECIMAL(5,2) DEFAULT 10.00,
    enable_email_alerts BOOLEAN DEFAULT true,
    enable_push_alerts BOOLEAN DEFAULT true,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    max_alerts_per_day INTEGER DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

-- =====================================================
-- Views and Functions (from 20251217000014)
-- =====================================================

CREATE OR REPLACE VIEW community_availability AS
SELECT 
  gi.id AS gear_item_id,
  gi.item_name,
  COUNT(DISTINCT gi.user_id) AS user_count,
  MIN(gi.price_paid) AS min_price,
  MAX(gi.price_paid) AS max_price,
  AVG(gi.price_paid) AS avg_price
FROM gear_items gi
WHERE gi.status = 'own'
  AND gi.item_name IS NOT NULL
  AND gi.item_brand IS NOT NULL
GROUP BY gi.id, gi.item_name;

CREATE OR REPLACE FUNCTION record_price_snapshot(
  p_tracking_id uuid,
  p_lowest_price decimal(10,2),
  p_highest_price decimal(10,2),
  p_average_price decimal(10,2),
  p_num_sources integer
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
BEGIN
  INSERT INTO price_history (
    tracking_id,
    lowest_price,
    highest_price,
    average_price,
    num_sources,
    recorded_at
  ) VALUES (
    p_tracking_id,
    p_lowest_price,
    p_highest_price,
    p_average_price,
    p_num_sources,
    NOW()
  )
  RETURNING id INTO v_snapshot_id;

  UPDATE price_tracking
  SET last_checked_at = NOW()
  WHERE id = p_tracking_id;

  RETURN v_snapshot_id;
END;
$$;

CREATE OR REPLACE FUNCTION create_price_alert(
  p_user_id uuid,
  p_tracking_id uuid,
  p_alert_type text,
  p_title text,
  p_message text,
  p_price_data jsonb DEFAULT NULL,
  p_valid_until timestamptz DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id uuid;
BEGIN
  INSERT INTO price_alerts (
    user_id,
    tracking_id,
    alert_type,
    title,
    message,
    price_data,
    valid_until
  ) VALUES (
    p_user_id,
    p_tracking_id,
    p_alert_type,
    p_title,
    p_message,
    p_price_data,
    COALESCE(p_valid_until, NOW() + INTERVAL '7 days')
  )
  RETURNING id INTO v_alert_id;

  RETURN v_alert_id;
END;
$$;

-- =====================================================
-- RLS Policies (from 20251217000015)
-- =====================================================

ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view own price tracking" ON price_tracking;
  CREATE POLICY "Users can view own price tracking"
    ON price_tracking FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can insert own price tracking" ON price_tracking;
  CREATE POLICY "Users can insert own price tracking"
    ON price_tracking FOR INSERT
    WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can update own price tracking" ON price_tracking;
  CREATE POLICY "Users can update own price tracking"
    ON price_tracking FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can delete own price tracking" ON price_tracking;
  CREATE POLICY "Users can delete own price tracking"
    ON price_tracking FOR DELETE
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Additional policies for other tables...
DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role full access" ON price_results;
  CREATE POLICY "Service role full access"
    ON price_results FOR ALL
    USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own price history" ON price_history;
  CREATE POLICY "Users view own price history"
    ON price_history FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM price_tracking pt
        WHERE pt.id = price_history.tracking_id
        AND pt.user_id = auth.uid()
      )
    );
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Service role manage alerts" ON price_alerts;
  CREATE POLICY "Service role manage alerts"
    ON price_alerts FOR ALL
    USING (true);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users view own alerts" ON price_alerts;
  CREATE POLICY "Users view own alerts"
    ON price_alerts FOR SELECT
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users update own alerts" ON price_alerts;
  CREATE POLICY "Users update own alerts"
    ON price_alerts FOR UPDATE
    USING (auth.uid() = user_id);
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- =====================================================
-- Alert Delivery Queue (from 20251217000018)
-- =====================================================

DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS alert_delivery_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    delivery_method TEXT NOT NULL DEFAULT 'in_app',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
  );
EXCEPTION WHEN duplicate_table THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_alert_delivery_status ON alert_delivery_queue(status, created_at) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION get_next_delivery_batch(p_batch_size integer DEFAULT 10)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  alert_id uuid,
  alert_type text,
  delivery_method text
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  UPDATE alert_delivery_queue
  SET status = 'processing',
      last_attempt_at = NOW(),
      attempts = attempts + 1
  WHERE alert_delivery_queue.id IN (
    SELECT alert_delivery_queue.id
    FROM alert_delivery_queue
    WHERE status = 'pending'
    AND attempts < 3
    ORDER BY created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  )
  RETURNING 
    alert_delivery_queue.id,
    alert_delivery_queue.user_id,
    alert_delivery_queue.alert_id,
    alert_delivery_queue.alert_type,
    alert_delivery_queue.delivery_method;
END;
$$;

CREATE OR REPLACE FUNCTION cleanup_delivery_queue()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_deleted_count integer;
BEGIN
  DELETE FROM alert_delivery_queue
  WHERE status = 'completed'
  AND completed_at < NOW() - INTERVAL '7 days';
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

CREATE OR REPLACE FUNCTION enqueue_alert_delivery(
  p_user_id uuid,
  p_alert_id uuid,
  p_alert_type text,
  p_delivery_method text DEFAULT 'in_app'
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_task_id uuid;
BEGIN
  INSERT INTO alert_delivery_queue (
    user_id,
    alert_id,
    alert_type,
    delivery_method,
    status
  ) VALUES (
    p_user_id,
    p_alert_id,
    p_alert_type,
    p_delivery_method,
    'pending'
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

-- =====================================================
-- AI Assistant: Add action_results column
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_messages' AND column_name = 'action_results'
  ) THEN
    ALTER TABLE ai_messages ADD COLUMN action_results jsonb;
  END IF;
END $$;

-- =====================================================
-- COMPLETE!
-- =====================================================
