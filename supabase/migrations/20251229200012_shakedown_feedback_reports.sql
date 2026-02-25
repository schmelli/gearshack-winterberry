-- Migration: Create shakedown_feedback_reports table
-- Feature: 001-community-shakedowns
-- Task: T074
-- Date: 2025-12-29
--
-- This table tracks user reports on shakedown feedback for content moderation.
-- Uses the existing report_reason enum from bulletin board feature.
-- Soft-hides feedback when report threshold (3) is reached.

CREATE TABLE IF NOT EXISTS shakedown_feedback_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  feedback_id UUID NOT NULL REFERENCES shakedown_feedback(id) ON DELETE CASCADE,
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Report details (uses existing report_reason enum from bulletin board)
  reason report_reason NOT NULL,
  details TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_details_length CHECK (details IS NULL OR length(details) <= 500),
  -- One report per user per feedback (prevents duplicate reports)
  CONSTRAINT uq_feedback_reports_user_feedback UNIQUE (reporter_id, feedback_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_feedback_reports_feedback ON shakedown_feedback_reports(feedback_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_reporter ON shakedown_feedback_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_feedback_reports_created ON shakedown_feedback_reports(created_at DESC);

-- Add report_count column to shakedown_feedback for quick threshold checks
ALTER TABLE shakedown_feedback
ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to auto-update report_count and soft-hide at threshold
CREATE OR REPLACE FUNCTION update_feedback_report_count()
RETURNS TRIGGER AS $$
DECLARE
  new_count INTEGER;
  report_threshold INTEGER := 3;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Increment report count
    UPDATE shakedown_feedback
    SET report_count = report_count + 1,
        -- Soft-hide at threshold
        is_hidden = CASE
          WHEN report_count + 1 >= report_threshold THEN true
          ELSE is_hidden
        END,
        hidden_reason = CASE
          WHEN report_count + 1 >= report_threshold THEN 'Reported: pending admin review'
          ELSE hidden_reason
        END,
        updated_at = now()
    WHERE id = NEW.feedback_id
    RETURNING report_count INTO new_count;

  ELSIF TG_OP = 'DELETE' THEN
    -- Decrement report count (for admin dismissals)
    UPDATE shakedown_feedback
    SET report_count = GREATEST(0, report_count - 1),
        updated_at = now()
    WHERE id = OLD.feedback_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_feedback_report_count ON shakedown_feedback_reports;
CREATE TRIGGER trg_feedback_report_count
  AFTER INSERT OR DELETE ON shakedown_feedback_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_feedback_report_count();

-- RLS Policies

-- Enable RLS
ALTER TABLE shakedown_feedback_reports ENABLE ROW LEVEL SECURITY;

-- Users can create reports (but not on their own content)
CREATE POLICY "feedback_reports_insert" ON shakedown_feedback_reports
FOR INSERT TO authenticated
WITH CHECK (
  reporter_id = auth.uid()
  -- Cannot report own feedback (checked in application layer for better error messages)
);

-- Users can view their own reports
CREATE POLICY "feedback_reports_select_own" ON shakedown_feedback_reports
FOR SELECT TO authenticated
USING (reporter_id = auth.uid());

-- Admins can view all reports via service role
-- Note: Admin access handled via service role until is_admin column is added to profiles
-- This policy will be updated when admin role system is implemented

-- Users cannot delete their own reports (admins can via service role)
-- No DELETE policy for regular users

-- Comments
COMMENT ON TABLE shakedown_feedback_reports IS 'User reports for shakedown feedback content moderation';
COMMENT ON COLUMN shakedown_feedback_reports.feedback_id IS 'UUID of the reported feedback';
COMMENT ON COLUMN shakedown_feedback_reports.reason IS 'Predefined reason: spam, harassment, off_topic, other';
COMMENT ON COLUMN shakedown_feedback_reports.details IS 'Optional additional details (max 500 chars)';
COMMENT ON CONSTRAINT uq_feedback_reports_user_feedback ON shakedown_feedback_reports IS 'Prevents duplicate reports from same user';
