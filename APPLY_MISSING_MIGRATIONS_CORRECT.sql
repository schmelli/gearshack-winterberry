-- =====================================================
-- CORRECT MIGRATION - Fixed column names for gear_items
-- =====================================================
-- Date: 2025-12-18
-- =====================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- STEP 1: Create tables if they don't exist
-- =====================================================

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_tracking') THEN
    CREATE TABLE price_tracking (
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
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_results') THEN
    CREATE TABLE price_results (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
      source_type TEXT NOT NULL,
      source_name TEXT NOT NULL,
      source_url TEXT NOT NULL,
      price_amount DECIMAL(10,2) NOT NULL,
      price_currency TEXT NOT NULL DEFAULT 'EUR',
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '6 hours')
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_history') THEN
    CREATE TABLE price_history (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tracking_id UUID NOT NULL REFERENCES price_tracking(id) ON DELETE CASCADE,
      lowest_price DECIMAL(10,2) NOT NULL,
      highest_price DECIMAL(10,2) NOT NULL,
      average_price DECIMAL(10,2) NOT NULL,
      num_sources INTEGER NOT NULL,
      recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'partner_retailers') THEN
    CREATE TABLE partner_retailers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_alerts') THEN
    CREATE TABLE price_alerts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_offers') THEN
    CREATE TABLE personal_offers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      product_name TEXT NOT NULL,
      product_url TEXT NOT NULL,
      offer_price DECIMAL(10,2) NOT NULL,
      currency TEXT NOT NULL DEFAULT 'USD',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_preferences') THEN
    CREATE TABLE alert_preferences (
      user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_delivery_queue') THEN
    CREATE TABLE alert_delivery_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      alert_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  END IF;
END $$;

-- =====================================================
-- STEP 2: Add missing columns to existing tables
-- =====================================================

-- price_tracking
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_tracking' AND column_name = 'manual_product_url') THEN ALTER TABLE price_tracking ADD COLUMN manual_product_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_tracking' AND column_name = 'match_confidence') THEN ALTER TABLE price_tracking ADD COLUMN match_confidence DECIMAL(3,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_tracking' AND column_name = 'confirmed_product_id') THEN ALTER TABLE price_tracking ADD COLUMN confirmed_product_id TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_tracking' AND column_name = 'last_checked_at') THEN ALTER TABLE price_tracking ADD COLUMN last_checked_at TIMESTAMPTZ; END IF;
END $$;

-- partner_retailers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'api_key') THEN ALTER TABLE partner_retailers ADD COLUMN api_key TEXT UNIQUE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'contact_email') THEN ALTER TABLE partner_retailers ADD COLUMN contact_email TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'webhook_url') THEN ALTER TABLE partner_retailers ADD COLUMN webhook_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'is_active') THEN ALTER TABLE partner_retailers ADD COLUMN is_active BOOLEAN DEFAULT true; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'rate_limit_per_hour') THEN ALTER TABLE partner_retailers ADD COLUMN rate_limit_per_hour INTEGER DEFAULT 100; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'partner_retailers' AND column_name = 'updated_at') THEN ALTER TABLE partner_retailers ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); END IF;
END $$;

-- price_alerts
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'tracking_id') THEN ALTER TABLE price_alerts ADD COLUMN tracking_id UUID REFERENCES price_tracking(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'offer_id') THEN ALTER TABLE price_alerts ADD COLUMN offer_id UUID; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'price_data') THEN ALTER TABLE price_alerts ADD COLUMN price_data JSONB; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'dismissed') THEN ALTER TABLE price_alerts ADD COLUMN dismissed BOOLEAN DEFAULT false; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'price_alerts' AND column_name = 'valid_until') THEN ALTER TABLE price_alerts ADD COLUMN valid_until TIMESTAMPTZ; END IF;
END $$;

-- personal_offers
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'partner_retailer_id') THEN ALTER TABLE personal_offers ADD COLUMN partner_retailer_id UUID REFERENCES partner_retailers(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'product_id') THEN ALTER TABLE personal_offers ADD COLUMN product_id TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'product_image_url') THEN ALTER TABLE personal_offers ADD COLUMN product_image_url TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'original_price') THEN ALTER TABLE personal_offers ADD COLUMN original_price DECIMAL(10,2); END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'description') THEN ALTER TABLE personal_offers ADD COLUMN description TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'valid_until') THEN ALTER TABLE personal_offers ADD COLUMN valid_until TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_offers' AND column_name = 'dismissed') THEN ALTER TABLE personal_offers ADD COLUMN dismissed BOOLEAN DEFAULT false; END IF;
END $$;

-- alert_preferences
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_preferences' AND column_name = 'price_drop_threshold') THEN ALTER TABLE alert_preferences ADD COLUMN price_drop_threshold DECIMAL(5,2) DEFAULT 10.00; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_preferences' AND column_name = 'enable_email_alerts') THEN ALTER TABLE alert_preferences ADD COLUMN enable_email_alerts BOOLEAN DEFAULT true; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_preferences' AND column_name = 'enable_push_alerts') THEN ALTER TABLE alert_preferences ADD COLUMN enable_push_alerts BOOLEAN DEFAULT true; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_preferences' AND column_name = 'max_alerts_per_day') THEN ALTER TABLE alert_preferences ADD COLUMN max_alerts_per_day INTEGER DEFAULT 10; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_preferences' AND column_name = 'updated_at') THEN ALTER TABLE alert_preferences ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW(); END IF;
END $$;

-- alert_delivery_queue
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'alert_id') THEN ALTER TABLE alert_delivery_queue ADD COLUMN alert_id UUID REFERENCES price_alerts(id) ON DELETE CASCADE; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'delivery_method') THEN ALTER TABLE alert_delivery_queue ADD COLUMN delivery_method TEXT DEFAULT 'in_app'; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'attempts') THEN ALTER TABLE alert_delivery_queue ADD COLUMN attempts INTEGER DEFAULT 0; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'last_attempt_at') THEN ALTER TABLE alert_delivery_queue ADD COLUMN last_attempt_at TIMESTAMPTZ; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'error_message') THEN ALTER TABLE alert_delivery_queue ADD COLUMN error_message TEXT; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'alert_delivery_queue' AND column_name = 'completed_at') THEN ALTER TABLE alert_delivery_queue ADD COLUMN completed_at TIMESTAMPTZ; END IF;
END $$;

-- ai_messages
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ai_messages' AND column_name = 'action_results') THEN ALTER TABLE ai_messages ADD COLUMN action_results JSONB; END IF;
END $$;

-- =====================================================
-- STEP 3: Create indexes
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_price_tracking_user ON price_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_price_history_tracking ON price_history(tracking_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_retailers_api_key ON partner_retailers(api_key);
CREATE INDEX IF NOT EXISTS idx_partner_retailers_active ON partner_retailers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_dismissed ON price_alerts(user_id, dismissed) WHERE dismissed = false;
CREATE INDEX IF NOT EXISTS idx_personal_offers_user ON personal_offers(user_id, dismissed) WHERE dismissed = false;
CREATE INDEX IF NOT EXISTS idx_alert_delivery_status ON alert_delivery_queue(status, created_at) WHERE status = 'pending';

-- =====================================================
-- STEP 4: Views (FIXED: using 'name' and 'brand' columns)
-- =====================================================

CREATE OR REPLACE VIEW community_availability AS
SELECT 
  gi.id AS gear_item_id,
  gi.name AS item_name,
  COUNT(DISTINCT gi.user_id) AS user_count,
  MIN(gi.price_paid) AS min_price,
  MAX(gi.price_paid) AS max_price,
  AVG(gi.price_paid) AS avg_price
FROM gear_items gi
WHERE gi.status = 'own'
  AND gi.name IS NOT NULL
  AND gi.brand IS NOT NULL
GROUP BY gi.id, gi.name;

-- =====================================================
-- STEP 5: Functions
-- =====================================================

CREATE OR REPLACE FUNCTION record_price_snapshot(
  p_tracking_id uuid, p_lowest_price decimal(10,2), p_highest_price decimal(10,2),
  p_average_price decimal(10,2), p_num_sources integer
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_snapshot_id uuid;
BEGIN
  INSERT INTO price_history (tracking_id, lowest_price, highest_price, average_price, num_sources, recorded_at)
  VALUES (p_tracking_id, p_lowest_price, p_highest_price, p_average_price, p_num_sources, NOW())
  RETURNING id INTO v_snapshot_id;
  UPDATE price_tracking SET last_checked_at = NOW() WHERE id = p_tracking_id;
  RETURN v_snapshot_id;
END; $$;

CREATE OR REPLACE FUNCTION create_price_alert(
  p_user_id uuid, p_tracking_id uuid, p_alert_type text, p_title text,
  p_message text, p_price_data jsonb DEFAULT NULL, p_valid_until timestamptz DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_alert_id uuid;
BEGIN
  INSERT INTO price_alerts (user_id, tracking_id, alert_type, title, message, price_data, valid_until)
  VALUES (p_user_id, p_tracking_id, p_alert_type, p_title, p_message, p_price_data, COALESCE(p_valid_until, NOW() + INTERVAL '7 days'))
  RETURNING id INTO v_alert_id;
  RETURN v_alert_id;
END; $$;

CREATE OR REPLACE FUNCTION get_next_delivery_batch(p_batch_size integer DEFAULT 10)
RETURNS TABLE (id uuid, user_id uuid, alert_id uuid, alert_type text, delivery_method text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY UPDATE alert_delivery_queue
  SET status = 'processing', last_attempt_at = NOW(), attempts = attempts + 1
  WHERE alert_delivery_queue.id IN (
    SELECT alert_delivery_queue.id FROM alert_delivery_queue
    WHERE status = 'pending' AND attempts < 3
    ORDER BY created_at ASC LIMIT p_batch_size FOR UPDATE SKIP LOCKED
  )
  RETURNING alert_delivery_queue.id, alert_delivery_queue.user_id, 
            alert_delivery_queue.alert_id, alert_delivery_queue.alert_type, 
            alert_delivery_queue.delivery_method;
END; $$;

CREATE OR REPLACE FUNCTION cleanup_delivery_queue() RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_deleted_count integer;
BEGIN
  DELETE FROM alert_delivery_queue WHERE status = 'completed' AND completed_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END; $$;

CREATE OR REPLACE FUNCTION enqueue_alert_delivery(
  p_user_id uuid, p_alert_id uuid, p_alert_type text, p_delivery_method text DEFAULT 'in_app'
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_task_id uuid;
BEGIN
  INSERT INTO alert_delivery_queue (user_id, alert_id, alert_type, delivery_method, status)
  VALUES (p_user_id, p_alert_id, p_alert_type, p_delivery_method, 'pending')
  RETURNING id INTO v_task_id;
  RETURN v_task_id;
END; $$;

-- =====================================================
-- STEP 6: RLS Policies
-- =====================================================

ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_delivery_queue ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN CREATE POLICY "Users view own tracking" ON price_tracking FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users insert own tracking" ON price_tracking FOR INSERT WITH CHECK (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update own tracking" ON price_tracking FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service full access results" ON price_results FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users view history" ON price_history FOR SELECT USING (EXISTS (SELECT 1 FROM price_tracking pt WHERE pt.id = price_history.tracking_id AND pt.user_id = auth.uid())); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Service manage alerts" ON price_alerts FOR ALL USING (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users view alerts" ON price_alerts FOR SELECT USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE POLICY "Users update alerts" ON price_alerts FOR UPDATE USING (auth.uid() = user_id); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================================================
-- SUCCESS! Migration complete.
-- Next: Regenerate types and remove @ts-nocheck comments
-- =====================================================
