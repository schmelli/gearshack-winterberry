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
