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
