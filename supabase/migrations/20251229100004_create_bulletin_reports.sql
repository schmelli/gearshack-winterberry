-- Migration: Create bulletin_reports table
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS bulletin_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type VARCHAR(10) NOT NULL,
  target_id UUID NOT NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status NOT NULL DEFAULT 'pending',
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,
  action_taken moderation_action,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_target_type CHECK (target_type IN ('post', 'reply')),
  CONSTRAINT chk_details_length CHECK (details IS NULL OR length(details) <= 500),
  CONSTRAINT chk_resolution_consistency CHECK (
    (status = 'pending' AND resolved_by IS NULL AND resolved_at IS NULL AND action_taken IS NULL) OR
    (status != 'pending' AND resolved_by IS NOT NULL AND resolved_at IS NOT NULL)
  ),
  -- One report per user per target
  CONSTRAINT uq_bulletin_reports_user_target UNIQUE (reporter_id, target_type, target_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulletin_reports_target ON bulletin_reports(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_reports_status ON bulletin_reports(status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bulletin_reports_reporter ON bulletin_reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_reports_created ON bulletin_reports(created_at DESC);

-- Comments
COMMENT ON TABLE bulletin_reports IS 'User reports for bulletin board content moderation';
COMMENT ON COLUMN bulletin_reports.target_type IS 'Type of reported content: post or reply';
COMMENT ON COLUMN bulletin_reports.target_id IS 'UUID of the reported post or reply';
COMMENT ON CONSTRAINT uq_bulletin_reports_user_target ON bulletin_reports IS 'Prevents duplicate reports from same user';
