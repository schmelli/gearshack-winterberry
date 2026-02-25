-- Migration: Create shakedown_bookmarks table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS shakedown_bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,

  -- Optional note for the bookmark
  note VARCHAR(200),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints: One bookmark per user per shakedown
  CONSTRAINT unique_bookmark UNIQUE(user_id, shakedown_id)
);

-- Index for user's bookmarks list (sorted by recency)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user ON shakedown_bookmarks(user_id, created_at DESC);

-- Comments
COMMENT ON TABLE shakedown_bookmarks IS 'User bookmarks for shakedowns (FR-014, User Story 6)';
COMMENT ON COLUMN shakedown_bookmarks.note IS 'Optional personal note for the bookmark';
