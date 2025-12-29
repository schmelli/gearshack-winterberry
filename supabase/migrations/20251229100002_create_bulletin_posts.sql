-- Migration: Create bulletin_posts table
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS bulletin_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content VARCHAR(500) NOT NULL,
  tag post_tag,
  linked_content_type linked_content_type,
  linked_content_id UUID,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  reply_count INTEGER NOT NULL DEFAULT 0,
  content_tsvector TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_content_length CHECK (length(content) <= 500),
  CONSTRAINT chk_linked_content CHECK (
    (linked_content_type IS NULL) = (linked_content_id IS NULL)
  )
);

-- Indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_author ON bulletin_posts(author_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_created ON bulletin_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_tag ON bulletin_posts(tag) WHERE tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_search ON bulletin_posts USING GIN(content_tsvector);
CREATE INDEX IF NOT EXISTS idx_bulletin_posts_active ON bulletin_posts(created_at DESC)
  WHERE is_deleted = false AND is_archived = false;

-- Trigger for updated_at (OR REPLACE makes it idempotent)
CREATE OR REPLACE FUNCTION update_bulletin_post_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_bulletin_posts_updated_at ON bulletin_posts;
CREATE TRIGGER trg_bulletin_posts_updated_at
  BEFORE UPDATE ON bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_bulletin_post_updated_at();

-- Comments
COMMENT ON TABLE bulletin_posts IS 'Community bulletin board posts with 500 char limit';
COMMENT ON COLUMN bulletin_posts.content_tsvector IS 'Full-text search vector, auto-generated';
COMMENT ON COLUMN bulletin_posts.reply_count IS 'Denormalized reply count for performance';
COMMENT ON COLUMN bulletin_posts.is_archived IS 'Posts older than 90 days are soft-archived';
