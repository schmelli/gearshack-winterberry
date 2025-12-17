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
