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
