-- Migration: Share management features
-- Adds expiry, password protection, view tracking, and analytics for shared loadouts

-- =============================================================================
-- Add management columns to loadout_shares
-- =============================================================================

ALTER TABLE loadout_shares
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS last_viewed_at TIMESTAMPTZ;

-- Add comments for documentation
COMMENT ON COLUMN loadout_shares.expires_at IS 'Optional expiry timestamp. Share becomes inaccessible after this time.';
COMMENT ON COLUMN loadout_shares.password_hash IS 'bcrypt hash of optional password. NULL means no password required.';
COMMENT ON COLUMN loadout_shares.view_count IS 'Total number of views for this share.';
COMMENT ON COLUMN loadout_shares.last_viewed_at IS 'Timestamp of the most recent view.';

-- =============================================================================
-- Add DELETE policy for owners
-- =============================================================================

CREATE POLICY loadout_shares_owner_delete
  ON loadout_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- =============================================================================
-- Update public read policy to check expiry
-- =============================================================================

-- Drop and recreate the public read policy to include expiry check
DROP POLICY IF EXISTS loadout_shares_public_read ON loadout_shares;

CREATE POLICY loadout_shares_public_read
  ON loadout_shares FOR SELECT
  USING (
    expires_at IS NULL OR expires_at > NOW()
  );

COMMENT ON POLICY loadout_shares_public_read ON loadout_shares IS
  'Allow public read access to shares that have not expired.';

-- =============================================================================
-- Create view analytics table
-- =============================================================================

CREATE TABLE IF NOT EXISTS loadout_share_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  share_token TEXT REFERENCES loadout_shares(share_token) ON DELETE CASCADE NOT NULL,
  viewer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for efficient queries by share_token
CREATE INDEX IF NOT EXISTS idx_share_views_token ON loadout_share_views(share_token, viewed_at DESC);

-- Enable RLS
ALTER TABLE loadout_share_views ENABLE ROW LEVEL SECURITY;

-- Anyone can insert a view record (anonymous tracking)
CREATE POLICY share_views_insert
  ON loadout_share_views FOR INSERT
  WITH CHECK (true);

-- Only owners can read view analytics
CREATE POLICY share_views_select_owner
  ON loadout_share_views FOR SELECT
  USING (
    share_token IN (
      SELECT share_token FROM loadout_shares WHERE owner_id = auth.uid()
    )
  );

-- Add comments
COMMENT ON TABLE loadout_share_views IS 'Analytics table tracking individual views of shared loadouts.';
COMMENT ON COLUMN loadout_share_views.viewer_id IS 'Authenticated user ID if logged in, NULL for anonymous views.';

-- =============================================================================
-- Function to increment view count (called from API)
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_share_view_count(p_share_token TEXT, p_viewer_id UUID DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update the share's view count and last_viewed_at
  UPDATE loadout_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = NOW()
  WHERE share_token = p_share_token
    AND (expires_at IS NULL OR expires_at > NOW());

  -- Record the view in analytics table
  INSERT INTO loadout_share_views (share_token, viewer_id)
  VALUES (p_share_token, p_viewer_id);
END;
$$;

COMMENT ON FUNCTION increment_share_view_count IS
  'Atomically increments view count and records view in analytics. Respects expiry.';
