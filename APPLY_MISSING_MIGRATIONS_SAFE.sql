-- =====================================================
-- COMBINED MIGRATIONS FOR SUPABASE (IDEMPOTENT VERSION)
-- =====================================================
-- This file combines all missing migrations with IF NOT EXISTS checks
-- Safe to run multiple times without errors
--
-- Features:
-- - Price Tracking Feature (Feature 050)
-- - AI Assistant action_results column
--
-- Run this in your Supabase SQL Editor
-- Date: 2025-12-18
-- =====================================================

-- =====================================================
-- Migration 1: Enable Extensions
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- Migration 2: Price Tracking Tables
-- =====================================================

-- Create price_tracking table
CREATE TABLE IF NOT EXISTS price_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gear_item_id uuid NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  confirmed_product_id text,
  manual_product_url text,
  match_confidence decimal(3,2),
  enabled boolean DEFAULT true,
  alerts_enabled boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_checked_at timestamptz,
  UNIQUE(user_id, gear_item_id)
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
  price decimal(10,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  source text NOT NULL,
  product_url text,
  availability_status text,
  checked_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb
);

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tracking_id uuid REFERENCES price_tracking(id) ON DELETE CASCADE,
  offer_id uuid,
  alert_type text NOT NULL CHECK (alert_type IN ('price_drop', 'back_in_stock', 'personal_offer')),
  title text NOT NULL,
  message text NOT NULL,
  price_data jsonb,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  valid_until timestamptz
);

-- Create indexes
CREATE INDEX IF NOT EXISTS price_tracking_user_id_idx ON price_tracking(user_id);
CREATE INDEX IF NOT EXISTS price_tracking_gear_item_id_idx ON price_tracking(gear_item_id);
CREATE INDEX IF NOT EXISTS price_tracking_enabled_idx ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS price_history_tracking_id_checked_at_idx ON price_history(tracking_id, checked_at DESC);
CREATE INDEX IF NOT EXISTS price_alerts_user_id_dismissed_idx ON price_alerts(user_id, dismissed) WHERE dismissed = false;

-- =====================================================
-- Migration 3: Partner Retailers
-- =====================================================

CREATE TABLE IF NOT EXISTS partner_retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_key text UNIQUE NOT NULL,
  contact_email text NOT NULL,
  webhook_url text,
  is_active boolean DEFAULT true,
  rate_limit_per_hour integer DEFAULT 100,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS partner_retailers_api_key_idx ON partner_retailers(api_key);
CREATE INDEX IF NOT EXISTS partner_retailers_is_active_idx ON partner_retailers(is_active) WHERE is_active = true;

-- =====================================================
-- Migration 4: Alerts Tables
-- =====================================================

CREATE TABLE IF NOT EXISTS personal_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_retailer_id uuid NOT NULL REFERENCES partner_retailers(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_url text NOT NULL,
  product_image_url text,
  offer_price decimal(10,2) NOT NULL,
  original_price decimal(10,2),
  currency text NOT NULL DEFAULT 'USD',
  description text,
  valid_until timestamptz NOT NULL,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  price_drop_threshold decimal(5,2) DEFAULT 10.00,
  enable_email_alerts boolean DEFAULT true,
  enable_push_alerts boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  max_alerts_per_day integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS personal_offers_user_id_dismissed_idx ON personal_offers(user_id, dismissed) WHERE dismissed = false;
CREATE INDEX IF NOT EXISTS personal_offers_partner_retailer_id_idx ON personal_offers(partner_retailer_id);
CREATE INDEX IF NOT EXISTS personal_offers_valid_until_idx ON personal_offers(valid_until);

-- =====================================================
-- Migration 5: Views and Functions
-- =====================================================

-- Create or replace community_availability view
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

-- Create or replace record_price_snapshot function
CREATE OR REPLACE FUNCTION record_price_snapshot(
  p_tracking_id uuid,
  p_price decimal(10,2),
  p_currency text,
  p_source text,
  p_product_url text DEFAULT NULL,
  p_availability_status text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_snapshot_id uuid;
BEGIN
  INSERT INTO price_history (
    tracking_id,
    price,
    currency,
    source,
    product_url,
    availability_status,
    metadata,
    checked_at
  ) VALUES (
    p_tracking_id,
    p_price,
    p_currency,
    p_source,
    p_product_url,
    p_availability_status,
    p_metadata,
    NOW()
  )
  RETURNING id INTO v_snapshot_id;

  UPDATE price_tracking
  SET last_checked_at = NOW()
  WHERE id = p_tracking_id;

  RETURN v_snapshot_id;
END;
$$;

-- Create or replace create_price_alert function
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
-- Migration 6: RLS Policies
-- =====================================================

ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can insert own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can update own price tracking" ON price_tracking;
DROP POLICY IF EXISTS "Users can delete own price tracking" ON price_tracking;

DROP POLICY IF EXISTS "Users can view own price history" ON price_history;
DROP POLICY IF EXISTS "Service role can insert price history" ON price_history;

DROP POLICY IF EXISTS "Users can view own price alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own price alerts" ON price_alerts;
DROP POLICY IF EXISTS "Service role can insert price alerts" ON price_alerts;

DROP POLICY IF EXISTS "Service role can manage partner retailers" ON partner_retailers;

DROP POLICY IF EXISTS "Users can view own personal offers" ON personal_offers;
DROP POLICY IF EXISTS "Users can update own personal offers" ON personal_offers;
DROP POLICY IF EXISTS "Service role can insert personal offers" ON personal_offers;

DROP POLICY IF EXISTS "Users can manage own alert preferences" ON alert_preferences;

-- Create policies
CREATE POLICY "Users can view own price tracking"
  ON price_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price tracking"
  ON price_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price tracking"
  ON price_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price tracking"
  ON price_tracking FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own price history"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking
      WHERE price_tracking.id = price_history.tracking_id
      AND price_tracking.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert price history"
  ON price_history FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view own price alerts"
  ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own price alerts"
  ON price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert price alerts"
  ON price_alerts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can manage partner retailers"
  ON partner_retailers FOR ALL
  USING (true);

CREATE POLICY "Users can view own personal offers"
  ON personal_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own personal offers"
  ON personal_offers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert personal offers"
  ON personal_offers FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can manage own alert preferences"
  ON alert_preferences FOR ALL
  USING (auth.uid() = user_id);

-- =====================================================
-- Migration 7: Fix Personal Offers Schema
-- =====================================================

-- Add missing columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_offers' AND column_name = 'product_id'
  ) THEN
    ALTER TABLE personal_offers ADD COLUMN product_id text NOT NULL DEFAULT '';
  END IF;
END $$;

-- =====================================================
-- Migration 8: Transaction Support
-- =====================================================

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
    status,
    created_at
  ) VALUES (
    p_user_id,
    p_alert_id,
    p_alert_type,
    p_delivery_method,
    'pending',
    NOW()
  )
  RETURNING id INTO v_task_id;

  RETURN v_task_id;
END;
$$;

-- =====================================================
-- Migration 9: Alert Delivery Queue
-- =====================================================

CREATE TABLE IF NOT EXISTS alert_delivery_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alert_id uuid NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
  alert_type text NOT NULL,
  delivery_method text NOT NULL DEFAULT 'in_app',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts integer DEFAULT 0,
  last_attempt_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS alert_delivery_queue_status_idx ON alert_delivery_queue(status, created_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS alert_delivery_queue_user_id_idx ON alert_delivery_queue(user_id);

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

-- =====================================================
-- Migration 10: Add Action Results Column
-- =====================================================

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_messages' AND column_name = 'action_results'
  ) THEN
    ALTER TABLE ai_messages ADD COLUMN action_results jsonb;
    
    COMMENT ON COLUMN ai_messages.action_results IS
      'Stores execution results for AI tool calls/actions. Format: { [actionId]: { status, executed_at, result?, error? } }';
  END IF;
END $$;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- After running this file:
-- 1. Regenerate types: npx supabase gen types typescript --project-id pxtvbgilzzppnbienmot > types/supabase.ts
-- 2. Remove @ts-nocheck from price tracking files
-- 3. Re-enable updateActionResult function
-- 4. Run: npm run build
-- =====================================================
