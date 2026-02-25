-- Migration: Create user_bulletin_bans table
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS user_bulletin_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES profiles(id),
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ, -- NULL = permanent ban
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Only one active ban per user
  CONSTRAINT uq_bulletin_ban_user UNIQUE (user_id)
);

-- Index for quick ban checks
CREATE INDEX IF NOT EXISTS idx_bulletin_bans_user ON user_bulletin_bans(user_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_bans_expires ON user_bulletin_bans(expires_at)
  WHERE expires_at IS NOT NULL;

-- Helper function to check if user is banned
CREATE OR REPLACE FUNCTION is_user_bulletin_banned(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_bulletin_bans
    WHERE user_id = p_user_id
      AND (expires_at IS NULL OR expires_at > now())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON TABLE user_bulletin_bans IS 'Bans users from posting/replying on bulletin board';
COMMENT ON COLUMN user_bulletin_bans.expires_at IS 'NULL means permanent ban';
COMMENT ON FUNCTION is_user_bulletin_banned IS 'Check if user is currently banned from bulletin board';
