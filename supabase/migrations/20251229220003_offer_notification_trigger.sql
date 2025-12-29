-- Migration: Offer Received Notification Trigger
-- Feature: 053-merchant-integration
-- Task: T055
-- Date: 2025-12-29
--
-- Creates a database trigger that automatically creates a notification
-- when a merchant sends an offer to a user.

-- ============================================================================
-- 1. Create notification trigger function
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_offer_notification()
RETURNS TRIGGER AS $$
DECLARE
  v_merchant_name TEXT;
  v_catalog_item_name TEXT;
BEGIN
  -- Get merchant business name
  SELECT m.business_name INTO v_merchant_name
  FROM merchants m
  WHERE m.id = NEW.merchant_id;

  -- Get catalog item name
  SELECT mci.name INTO v_catalog_item_name
  FROM merchant_catalog_items mci
  WHERE mci.id = NEW.catalog_item_id;

  -- Insert notification
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    data,
    created_at
  ) VALUES (
    NEW.user_id,
    'offer_received',
    'New offer from ' || COALESCE(v_merchant_name, 'a merchant'),
    format(
      'You received a special offer on %s. The offer expires on %s.',
      COALESCE(v_catalog_item_name, 'an item'),
      to_char(NEW.expires_at, 'Mon DD, YYYY')
    ),
    jsonb_build_object(
      'offer_id', NEW.id,
      'merchant_id', NEW.merchant_id,
      'catalog_item_id', NEW.catalog_item_id,
      'offer_price', NEW.offer_price,
      'regular_price', NEW.regular_price,
      'discount_percent', round(((NEW.regular_price - NEW.offer_price) / NEW.regular_price * 100)::numeric, 0),
      'expires_at', NEW.expires_at
    ),
    now()
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 2. Create trigger on merchant_offers table
-- ============================================================================

DROP TRIGGER IF EXISTS on_offer_created_notification ON merchant_offers;

CREATE TRIGGER on_offer_created_notification
  AFTER INSERT ON merchant_offers
  FOR EACH ROW
  EXECUTE FUNCTION trigger_offer_notification();

-- ============================================================================
-- 3. Add index for notification lookup by offer
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_notifications_offer_data
  ON notifications USING GIN ((data->'offer_id'));

-- ============================================================================
-- 4. Grant execute on function
-- ============================================================================

GRANT EXECUTE ON FUNCTION trigger_offer_notification() TO authenticated;

-- ============================================================================
-- COMPLETE
-- ============================================================================
