-- Migration: Create insight_feedback table
-- Feature: 045-gear-detail-modal
--
-- Stores user feedback (thumbs up/down) on GearGraph insights
-- to improve recommendation quality over time.

CREATE TABLE IF NOT EXISTS insight_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- The insight content (used as identifier since insights don't have IDs)
  insight_content_hash TEXT NOT NULL,
  insight_content TEXT NOT NULL,

  -- Context about what gear item the insight was shown for
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,
  gear_brand TEXT,
  gear_name TEXT,
  category_id TEXT,

  -- The feedback: true = thumbs up, false = thumbs down
  is_positive BOOLEAN NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate feedback from same user on same insight
  UNIQUE(user_id, insight_content_hash)
);

-- Index for quick lookups
CREATE INDEX idx_insight_feedback_user ON insight_feedback(user_id);
CREATE INDEX idx_insight_feedback_hash ON insight_feedback(insight_content_hash);
CREATE INDEX idx_insight_feedback_positive ON insight_feedback(is_positive);

-- RLS policies
ALTER TABLE insight_feedback ENABLE ROW LEVEL SECURITY;

-- Users can only see their own feedback
CREATE POLICY "Users can view own feedback"
  ON insight_feedback FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback"
  ON insight_feedback FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own feedback (change vote)
CREATE POLICY "Users can update own feedback"
  ON insight_feedback FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own feedback
CREATE POLICY "Users can delete own feedback"
  ON insight_feedback FOR DELETE
  USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE insight_feedback IS 'Stores user feedback on GearGraph insights - Feature 045';
COMMENT ON COLUMN insight_feedback.insight_content_hash IS 'MD5 hash of insight content for deduplication';
COMMENT ON COLUMN insight_feedback.is_positive IS 'true = thumbs up, false = thumbs down';
