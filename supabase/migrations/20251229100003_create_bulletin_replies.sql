-- Migration: Create bulletin_replies table
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS bulletin_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES bulletin_posts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  parent_reply_id UUID REFERENCES bulletin_replies(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 1,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_depth CHECK (depth >= 1 AND depth <= 2),
  CONSTRAINT chk_no_self_reference CHECK (id != parent_reply_id),
  CONSTRAINT chk_depth_consistency CHECK (
    (parent_reply_id IS NULL AND depth = 1) OR
    (parent_reply_id IS NOT NULL AND depth = 2)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bulletin_replies_post ON bulletin_replies(post_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_bulletin_replies_author ON bulletin_replies(author_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_replies_parent ON bulletin_replies(parent_reply_id)
  WHERE parent_reply_id IS NOT NULL;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_bulletin_replies_reply_count ON bulletin_posts;
CREATE TRIGGER trg_bulletin_replies_updated_at
  BEFORE UPDATE ON bulletin_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_post_updated_at();

-- Trigger to update reply_count on bulletin_posts
CREATE OR REPLACE FUNCTION update_bulletin_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE bulletin_posts
    SET reply_count = reply_count + 1
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE bulletin_posts
    SET reply_count = GREATEST(0, reply_count - 1)
    WHERE id = OLD.post_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      UPDATE bulletin_posts
      SET reply_count = GREATEST(0, reply_count - 1)
      WHERE id = NEW.post_id;
    -- Handle undelete (if ever needed)
    ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
      UPDATE bulletin_posts
      SET reply_count = reply_count + 1
      WHERE id = NEW.post_id;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bulletin_replies_reply_count ON bulletin_posts;
CREATE TRIGGER trg_bulletin_reply_count
  AFTER INSERT OR UPDATE OR DELETE ON bulletin_replies
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_reply_count();

-- Comments
COMMENT ON TABLE bulletin_replies IS 'Replies to bulletin board posts, max 2 levels deep';
COMMENT ON COLUMN bulletin_replies.depth IS 'Nesting level: 1 = direct reply, 2 = reply to reply';
COMMENT ON COLUMN bulletin_replies.parent_reply_id IS 'Parent reply for nested replies (depth 2 only)';
