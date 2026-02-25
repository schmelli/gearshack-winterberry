-- Migration: Create loadout_shares table
-- Feature: Share Management
-- Date: 2026-02-06
--
-- Creates the loadout_shares table for sharing loadouts with public/private access control.
-- Includes password protection, expiry dates, and view tracking.

-- ============================================================================
-- 1. Create loadout_shares table
-- ============================================================================

CREATE TABLE IF NOT EXISTS loadout_shares (
  share_token TEXT PRIMARY KEY,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  allow_comments BOOLEAN NOT NULL DEFAULT true,
  view_count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  password_hash TEXT,
  last_viewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_loadout_shares_loadout ON loadout_shares(loadout_id);
CREATE INDEX IF NOT EXISTS idx_loadout_shares_owner ON loadout_shares(owner_id);
CREATE INDEX IF NOT EXISTS idx_loadout_shares_expires ON loadout_shares(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 2. Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE loadout_shares ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view a share if they have the token)
-- This is checked in the application layer by querying with the share_token
DROP POLICY IF EXISTS "loadout_shares_public_read" ON loadout_shares;
CREATE POLICY "loadout_shares_public_read"
  ON loadout_shares FOR SELECT
  USING (true);

-- Owner can insert their own shares
DROP POLICY IF EXISTS "loadout_shares_owner_insert" ON loadout_shares;
CREATE POLICY "loadout_shares_owner_insert"
  ON loadout_shares FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Owner can update their own shares
DROP POLICY IF EXISTS "loadout_shares_owner_update" ON loadout_shares;
CREATE POLICY "loadout_shares_owner_update"
  ON loadout_shares FOR UPDATE
  USING (auth.uid() = owner_id);

-- Owner can delete their own shares
DROP POLICY IF EXISTS "loadout_shares_owner_delete" ON loadout_shares;
CREATE POLICY "loadout_shares_owner_delete"
  ON loadout_shares FOR DELETE
  USING (auth.uid() = owner_id);

-- ============================================================================
-- 3. Create increment_share_view_count RPC function
-- ============================================================================

CREATE OR REPLACE FUNCTION increment_share_view_count(
  p_share_token TEXT,
  p_viewer_id UUID DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  UPDATE loadout_shares
  SET
    view_count = view_count + 1,
    last_viewed_at = now()
  WHERE share_token = p_share_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. Create updated_at trigger
-- ============================================================================

DROP TRIGGER IF EXISTS update_loadout_shares_updated_at ON loadout_shares;
CREATE TRIGGER update_loadout_shares_updated_at
  BEFORE UPDATE ON loadout_shares
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- COMPLETE
-- ============================================================================
