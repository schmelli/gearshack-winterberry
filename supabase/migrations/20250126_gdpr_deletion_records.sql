-- Migration: GDPR Deletion Records for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-26
-- Description: Creates the gdpr_deletion_records table for Right to Erasure compliance (GDPR Article 17)

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS gdpr_deletion_records (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference (preserved for audit even after user deletion)
  user_id UUID NOT NULL,

  -- Deletion workflow state
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),

  -- Timing
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,

  -- Results
  records_deleted INTEGER DEFAULT 0,
  error_message TEXT
);

-- ==================== INDEXES ====================

-- Performance index for user queries
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_user
  ON gdpr_deletion_records(user_id, requested_at DESC);

-- Performance index for status queries
CREATE INDEX IF NOT EXISTS idx_gdpr_deletion_status
  ON gdpr_deletion_records(status, requested_at DESC);

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS to ensure multi-tenancy
ALTER TABLE gdpr_deletion_records ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own deletion records
CREATE POLICY "Users can only access own deletion records"
  ON gdpr_deletion_records
  FOR ALL
  USING (user_id::text = auth.uid()::text);

-- Policy: Service role has full access
CREATE POLICY "Service role full access"
  ON gdpr_deletion_records
  FOR ALL
  TO service_role
  USING (true);

-- ==================== HELPER FUNCTIONS ====================

-- Function: Request GDPR deletion for user
CREATE OR REPLACE FUNCTION request_gdpr_deletion(
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_deletion_id UUID;
BEGIN
  -- Insert deletion request
  INSERT INTO gdpr_deletion_records (user_id, status, requested_at)
  VALUES (p_user_id, 'pending', now())
  RETURNING id INTO v_deletion_id;

  RETURN v_deletion_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Execute GDPR deletion (background job)
CREATE OR REPLACE FUNCTION execute_gdpr_deletion(
  p_deletion_id UUID
)
RETURNS VOID AS $$
DECLARE
  v_user_id UUID;
  v_records_deleted INTEGER := 0;
BEGIN
  -- Get user_id from deletion record
  SELECT user_id INTO v_user_id
  FROM gdpr_deletion_records
  WHERE id = p_deletion_id AND status = 'pending';

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Deletion record not found or already processed: %', p_deletion_id;
  END IF;

  -- Update status to processing
  UPDATE gdpr_deletion_records
  SET status = 'processing'
  WHERE id = p_deletion_id;

  -- Delete conversation memory
  DELETE FROM conversation_memory WHERE user_id = v_user_id;
  GET DIAGNOSTICS v_records_deleted = ROW_COUNT;

  -- Delete workflow executions
  DELETE FROM workflow_executions WHERE user_id = v_user_id;

  -- Delete rate limit tracking
  DELETE FROM rate_limit_tracking WHERE user_id = v_user_id;

  -- Update deletion record with results
  UPDATE gdpr_deletion_records
  SET
    status = 'completed',
    completed_at = now(),
    records_deleted = v_records_deleted
  WHERE id = p_deletion_id;

EXCEPTION
  WHEN OTHERS THEN
    -- Update deletion record with error
    UPDATE gdpr_deletion_records
    SET
      status = 'failed',
      error_message = SQLERRM
    WHERE id = p_deletion_id;
    RAISE;
END;
$$ LANGUAGE plpgsql;

-- ==================== COMMENTS ====================

COMMENT ON TABLE gdpr_deletion_records IS 'Audit trail for GDPR Right to Erasure requests with 24-hour SLA';
COMMENT ON COLUMN gdpr_deletion_records.status IS 'Deletion workflow state: pending, processing, completed, failed';
COMMENT ON COLUMN gdpr_deletion_records.records_deleted IS 'Total count of deleted conversation memory records';
COMMENT ON FUNCTION request_gdpr_deletion IS 'Creates a new GDPR deletion request, returns deletion ID';
COMMENT ON FUNCTION execute_gdpr_deletion IS 'Executes GDPR deletion for a pending request (called by background job)';
