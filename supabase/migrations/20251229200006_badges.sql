-- Migration: Create shakedown_badges table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS shakedown_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Badge Type
  badge_type shakedown_badge NOT NULL,

  -- Awarded timestamp
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraint: One badge type per user
  CONSTRAINT unique_badge UNIQUE(user_id, badge_type)
);

-- Index for user's badges
CREATE INDEX IF NOT EXISTS idx_badges_user ON shakedown_badges(user_id);

-- Comments
COMMENT ON TABLE shakedown_badges IS 'Reputation badges awarded for helpful feedback (FR-024, FR-025)';
COMMENT ON COLUMN shakedown_badges.badge_type IS 'Badge type: shakedown_helper (10), trail_expert (50), community_legend (100)';
COMMENT ON COLUMN shakedown_badges.awarded_at IS 'Timestamp when the badge was awarded';
