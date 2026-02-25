-- =============================================================================
-- Price Tracking Feature Migrations
-- Feature: 050-price-tracking
-- Date: 2025-12-17
-- =============================================================================
--
-- INSTRUCTIONS:
-- 1. Open Supabase Dashboard (https://supabase.com)
-- 2. Select your project
-- 3. Navigate to SQL Editor
-- 4. Copy and paste this ENTIRE file
-- 5. Click "Run" to execute all migrations in order
-- 6. Verify success messages for each section
--
-- IMPORTANT: Run this in development/staging first, then production!
--
-- =============================================================================

-- Migration 1: Enable Extensions
-- =============================================================================
-- File: 20251217000010_enable_extensions.sql
-- Description: Enable pg_trgm for fuzzy product name matching

-- Enable pg_trgm extension for fuzzy text search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create GIN index on gear_items.name for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_gear_items_name_trgm ON gear_items USING gin (name gin_trgm_ops);

-- Verify extension is enabled
DO $$
BEGIN
  RAISE NOTICE '✓ Migration 1 Complete: pg_trgm extension enabled';
END $$;

-- =============================================================================
-- Migration 2: Price Tracking Tables
-- =============================================================================
-- File: 20251217000011_price_tracking_tables.sql
-- Description: Core tables for price tracking, results, and history

-- Create price_tracking table
CREATE TABLE IF NOT EXISTS price_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  gear_item_id uuid REFERENCES gear_items(id) ON DELETE CASCADE NOT NULL,
  enabled boolean DEFAULT true,
  alerts_enabled boolean DEFAULT true,
  confirmed_product_id text,
  match_confidence numeric(3, 2),
  last_checked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, gear_item_id)
);

-- Create price_results table
CREATE TABLE IF NOT EXISTS price_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid REFERENCES price_tracking(id) ON DELETE CASCADE NOT NULL,
  source_type text NOT NULL CHECK (source_type IN ('google_shopping', 'ebay', 'partner_retailer', 'local_shop')),
  source_name text NOT NULL,
  source_url text NOT NULL,
  price_amount numeric(10, 2) NOT NULL,
  price_currency text DEFAULT 'EUR',
  shipping_cost numeric(10, 2),
  shipping_currency text DEFAULT 'EUR',
  total_price numeric(10, 2) NOT NULL,
  product_name text NOT NULL,
  product_image_url text,
  product_condition text DEFAULT 'new',
  is_local boolean DEFAULT false,
  shop_latitude numeric(10, 7),
  shop_longitude numeric(10, 7),
  distance_km numeric(6, 2),
  fetched_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create price_history table
CREATE TABLE IF NOT EXISTS price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tracking_id uuid REFERENCES price_tracking(id) ON DELETE CASCADE NOT NULL,
  lowest_price numeric(10, 2) NOT NULL,
  average_price numeric(10, 2),
  source_count integer NOT NULL,
  recorded_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create indexes for price tracking tables
CREATE INDEX IF NOT EXISTS idx_price_tracking_user_id ON price_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_gear_item_id ON price_tracking(gear_item_id);
CREATE INDEX IF NOT EXISTS idx_price_tracking_enabled ON price_tracking(enabled) WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_price_results_tracking_id ON price_results(tracking_id);
CREATE INDEX IF NOT EXISTS idx_price_results_expires_at ON price_results(expires_at);
CREATE INDEX IF NOT EXISTS idx_price_results_total_price ON price_results(total_price);

CREATE INDEX IF NOT EXISTS idx_price_history_tracking_id ON price_history(tracking_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON price_history(recorded_at);

-- Add updated_at trigger to price_tracking
CREATE OR REPLACE FUNCTION update_price_tracking_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER price_tracking_updated_at
  BEFORE UPDATE ON price_tracking
  FOR EACH ROW
  EXECUTE FUNCTION update_price_tracking_updated_at();

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 2 Complete: Price tracking tables created';
END $$;

-- =============================================================================
-- Migration 3: Partner Retailers
-- =============================================================================
-- File: 20251217000012_partner_retailers.sql
-- Description: Partner retailers and personal offers tables

-- Create partner_retailers table
CREATE TABLE IF NOT EXISTS partner_retailers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  logo_url text,
  website_url text,
  api_key_hash text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create personal_offers table
CREATE TABLE IF NOT EXISTS personal_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_retailer_id uuid REFERENCES partner_retailers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tracking_id uuid REFERENCES price_tracking(id) ON DELETE CASCADE NOT NULL,
  product_id text NOT NULL,
  product_name text NOT NULL,
  product_url text NOT NULL,
  offer_price numeric(10, 2) NOT NULL,
  original_price numeric(10, 2),
  currency text DEFAULT 'EUR',
  valid_until timestamptz NOT NULL,
  description text,
  terms text,
  dismissed boolean DEFAULT false,
  notified_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for partner tables
CREATE INDEX IF NOT EXISTS idx_partner_retailers_is_active ON partner_retailers(is_active);
CREATE INDEX IF NOT EXISTS idx_personal_offers_user_id ON personal_offers(user_id);
CREATE INDEX IF NOT EXISTS idx_personal_offers_tracking_id ON personal_offers(tracking_id);
CREATE INDEX IF NOT EXISTS idx_personal_offers_valid_until ON personal_offers(valid_until);
CREATE INDEX IF NOT EXISTS idx_personal_offers_dismissed ON personal_offers(dismissed);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 3 Complete: Partner retailer tables created';
END $$;

-- =============================================================================
-- Migration 4: Alerts
-- =============================================================================
-- File: 20251217000013_alerts.sql
-- Description: Alert system for price drops and notifications

-- Create price_alerts table
CREATE TABLE IF NOT EXISTS price_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tracking_id uuid REFERENCES price_tracking(id) ON DELETE CASCADE,
  offer_id uuid REFERENCES personal_offers(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('price_drop', 'local_shop_available', 'community_member_available', 'personal_offer')),
  title text NOT NULL,
  message text NOT NULL,
  link_url text,
  sent_via_push boolean DEFAULT false,
  sent_via_email boolean DEFAULT false,
  push_sent_at timestamptz,
  email_sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create alert_preferences table
CREATE TABLE IF NOT EXISTS alert_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  push_enabled boolean DEFAULT true,
  email_enabled boolean DEFAULT false,
  price_drop_enabled boolean DEFAULT true,
  local_shop_enabled boolean DEFAULT true,
  community_enabled boolean DEFAULT true,
  personal_offer_enabled boolean DEFAULT true,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for alert tables
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_tracking_id ON price_alerts(tracking_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_created_at ON price_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_alert_preferences_user_id ON alert_preferences(user_id);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 4 Complete: Alert tables created';
END $$;

-- =============================================================================
-- Migration 5: Views and Functions
-- =============================================================================
-- File: 20251217000014_views_functions.sql
-- Description: Community availability view and fuzzy search function

-- Create community_availability view
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

-- Create fuzzy_search_products function
CREATE OR REPLACE FUNCTION fuzzy_search_products(
  search_query text,
  similarity_threshold numeric DEFAULT 0.3,
  max_results integer DEFAULT 10
)
RETURNS TABLE (
  gear_item_id uuid,
  name text,
  similarity_score numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    gi.id,
    gi.name,
    similarity(gi.name, search_query) AS score
  FROM gear_items gi
  WHERE similarity(gi.name, search_query) > similarity_threshold
  ORDER BY score DESC
  LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 5 Complete: Views and functions created';
END $$;

-- =============================================================================
-- Migration 6: RLS Policies
-- =============================================================================
-- File: 20251217000015_rls_policies.sql
-- Description: Row-Level Security policies for all price tracking tables

-- Enable RLS on all tables
ALTER TABLE price_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_retailers ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_offers ENABLE ROW LEVEL SECURITY;

-- price_tracking policies
CREATE POLICY "Users can view their own price tracking"
  ON price_tracking FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own price tracking"
  ON price_tracking FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own price tracking"
  ON price_tracking FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own price tracking"
  ON price_tracking FOR DELETE
  USING (auth.uid() = user_id);

-- price_results policies
CREATE POLICY "Users can view their price results"
  ON price_results FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_results.tracking_id
        AND pt.user_id = auth.uid()
    )
  );

-- price_history policies
CREATE POLICY "Users can view their price history"
  ON price_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM price_tracking pt
      WHERE pt.id = price_history.tracking_id
        AND pt.user_id = auth.uid()
    )
  );

-- price_alerts policies
CREATE POLICY "Users can view their own alerts"
  ON price_alerts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own alerts"
  ON price_alerts FOR UPDATE
  USING (auth.uid() = user_id);

-- alert_preferences policies
CREATE POLICY "Users can view their own preferences"
  ON alert_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON alert_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON alert_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- partner_retailers policies (public read)
CREATE POLICY "Anyone can view active partner retailers"
  ON partner_retailers FOR SELECT
  USING (is_active = true);

-- personal_offers policies
CREATE POLICY "Users can view their own offers"
  ON personal_offers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own offers"
  ON personal_offers FOR UPDATE
  USING (auth.uid() = user_id);

DO $$
BEGIN
  RAISE NOTICE '✓ Migration 6 Complete: RLS policies applied';
END $$;

-- =============================================================================
-- Final Verification
-- =============================================================================

-- Verify all tables exist
DO $$
DECLARE
  table_count integer;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'price_tracking',
      'price_results',
      'price_history',
      'price_alerts',
      'alert_preferences',
      'partner_retailers',
      'personal_offers'
    );

  IF table_count = 7 THEN
    RAISE NOTICE '✓ Verification: All 7 tables created successfully';
  ELSE
    RAISE WARNING '⚠ Verification: Expected 7 tables, found %', table_count;
  END IF;
END $$;

-- Verify view exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.views
    WHERE table_schema = 'public'
      AND table_name = 'community_availability'
  ) THEN
    RAISE NOTICE '✓ Verification: community_availability view exists';
  ELSE
    RAISE WARNING '⚠ Verification: community_availability view not found';
  END IF;
END $$;

-- Verify function exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'fuzzy_search_products'
  ) THEN
    RAISE NOTICE '✓ Verification: fuzzy_search_products function exists';
  ELSE
    RAISE WARNING '⚠ Verification: fuzzy_search_products function not found';
  END IF;
END $$;

-- Verify extension exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension
    WHERE extname = 'pg_trgm'
  ) THEN
    RAISE NOTICE '✓ Verification: pg_trgm extension enabled';
  ELSE
    RAISE WARNING '⚠ Verification: pg_trgm extension not found';
  END IF;
END $$;

-- =============================================================================
-- SUCCESS!
-- =============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE '✅ ALL MIGRATIONS COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '==============================================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Run the seed data: supabase/seed.sql';
  RAISE NOTICE '2. Configure environment variables in Vercel';
  RAISE NOTICE '3. See specs/050-price-tracking/DEPLOYMENT.md for full checklist';
  RAISE NOTICE '';
END $$;
