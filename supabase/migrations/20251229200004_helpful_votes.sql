-- Migration: Create shakedown_helpful_votes table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS shakedown_helpful_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  feedback_id UUID NOT NULL REFERENCES shakedown_feedback(id) ON DELETE CASCADE,
  voter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints: One vote per user per feedback
  CONSTRAINT unique_vote UNIQUE(feedback_id, voter_id)
);

-- Indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_helpful_votes_feedback ON shakedown_helpful_votes(feedback_id);
CREATE INDEX IF NOT EXISTS idx_helpful_votes_voter ON shakedown_helpful_votes(voter_id);

-- Comments
COMMENT ON TABLE shakedown_helpful_votes IS 'Tracks "Mark as Helpful" votes on feedback (FR-022)';
COMMENT ON COLUMN shakedown_helpful_votes.feedback_id IS 'The feedback item being marked as helpful';
COMMENT ON COLUMN shakedown_helpful_votes.voter_id IS 'The user (shakedown owner) casting the vote';
