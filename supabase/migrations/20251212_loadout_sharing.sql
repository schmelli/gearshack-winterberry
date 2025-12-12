-- Migration: Loadout Sharing + Virtual Gear Shakedown
-- Date: 2025-12-12
-- Adds public share snapshots and realtime comment stream for shared loadouts.

-- =============================================================================
-- Loadout Share Snapshots
-- =============================================================================
CREATE TABLE IF NOT EXISTS loadout_shares (
  share_token TEXT PRIMARY KEY,
  loadout_id UUID REFERENCES loadouts(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  allow_comments BOOLEAN DEFAULT TRUE NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE loadout_shares ENABLE ROW LEVEL SECURITY;

-- Public read access so recipients with the link can view the shared payload
CREATE POLICY loadout_shares_public_read
  ON loadout_shares FOR SELECT
  USING (true);

-- Owners can create/update their shares
CREATE POLICY loadout_shares_owner_insert
  ON loadout_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY loadout_shares_owner_update
  ON loadout_shares FOR UPDATE
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- =============================================================================
-- Realtime Comments for Virtual Gear Shakedown
-- =============================================================================
CREATE TABLE IF NOT EXISTS loadout_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  share_token TEXT REFERENCES loadout_shares(share_token) ON DELETE CASCADE NOT NULL,
  item_id UUID,
  author TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

ALTER TABLE loadout_comments ENABLE ROW LEVEL SECURITY;

-- Anyone with the link can read comments
CREATE POLICY loadout_comments_public_read
  ON loadout_comments FOR SELECT
  USING (true);

-- Anyone with the link can post comments when the share allows it
CREATE POLICY loadout_comments_public_insert
  ON loadout_comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM loadout_shares s
      WHERE s.share_token = loadout_comments.share_token
        AND s.allow_comments = TRUE
    )
  );
