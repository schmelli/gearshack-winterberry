-- Migration: Create shakedown_feedback table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS shakedown_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  shakedown_id UUID NOT NULL REFERENCES shakedowns(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES shakedown_feedback(id) ON DELETE CASCADE,  -- For replies
  gear_item_id UUID REFERENCES gear_items(id) ON DELETE SET NULL,  -- Item-specific feedback (FR-008)

  -- Content (FR-009)
  content TEXT NOT NULL,
  content_html TEXT,  -- Pre-rendered markdown for performance

  -- Nesting (FR-010: max 3 levels)
  depth SMALLINT NOT NULL DEFAULT 1,
  CONSTRAINT depth_limit CHECK (depth BETWEEN 1 AND 3),

  -- Metrics
  helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_reason VARCHAR(200),

  -- Edit tracking (FR-011: 30-minute window)
  is_edited BOOLEAN NOT NULL DEFAULT false,
  edited_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_feedback_shakedown ON shakedown_feedback(shakedown_id);
CREATE INDEX IF NOT EXISTS idx_feedback_author ON shakedown_feedback(author_id);
CREATE INDEX IF NOT EXISTS idx_feedback_parent ON shakedown_feedback(parent_id);
CREATE INDEX IF NOT EXISTS idx_feedback_item ON shakedown_feedback(gear_item_id)
  WHERE gear_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_feedback_visible ON shakedown_feedback(shakedown_id, created_at)
  WHERE is_hidden = false;

-- Trigger for updated_at (OR REPLACE makes it idempotent)
CREATE OR REPLACE FUNCTION update_shakedown_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  -- Mark as edited if content changed and not within first minute
  IF OLD.content IS DISTINCT FROM NEW.content AND OLD.created_at < now() - INTERVAL '1 minute' THEN
    NEW.is_edited = true;
    NEW.edited_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_shakedown_feedback_updated_at ON shakedown_feedback;
CREATE TRIGGER trg_shakedown_feedback_updated_at
  BEFORE UPDATE ON shakedown_feedback
  FOR EACH ROW
  EXECUTE FUNCTION update_shakedown_feedback_updated_at();

-- Comments
COMMENT ON TABLE shakedown_feedback IS 'Feedback/comments on shakedowns with threaded replies support';
COMMENT ON COLUMN shakedown_feedback.parent_id IS 'Self-reference for threaded replies';
COMMENT ON COLUMN shakedown_feedback.gear_item_id IS 'Optional link to specific gear item for item-specific feedback';
COMMENT ON COLUMN shakedown_feedback.content_html IS 'Pre-rendered markdown HTML for performance';
COMMENT ON COLUMN shakedown_feedback.depth IS 'Nesting level (1-3) for reply hierarchy';
COMMENT ON COLUMN shakedown_feedback.helpful_count IS 'Denormalized helpful vote count';
COMMENT ON COLUMN shakedown_feedback.is_edited IS 'Flag indicating if content was edited after creation';
