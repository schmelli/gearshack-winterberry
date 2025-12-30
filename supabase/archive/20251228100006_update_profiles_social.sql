-- Migration: Update Profiles for Social Features
-- Feature: 001-social-graph
-- Task: T011
-- Date: 2025-12-28

-- =============================================================================
-- ADD SOCIAL COLUMNS TO PROFILES TABLE
-- =============================================================================

-- Add privacy_preset column
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS privacy_preset privacy_preset DEFAULT 'everyone';

-- Add follower_count column (denormalized for VIP accounts)
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS follower_count INTEGER DEFAULT 0;

-- Add account_type column if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_type account_type DEFAULT 'standard';

-- Add online status columns
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'offline'
  CHECK (online_status IN ('online', 'away', 'invisible', 'offline'));

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for finding VIP accounts
CREATE INDEX IF NOT EXISTS idx_profiles_account_type
  ON profiles(account_type)
  WHERE account_type = 'vip';

-- Index for online status queries
CREATE INDEX IF NOT EXISTS idx_profiles_online_status
  ON profiles(online_status)
  WHERE online_status = 'online';

-- =============================================================================
-- UPDATE FUNCTION: Update last_active timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  -- Update last_active_at when user performs any action
  UPDATE profiles
  SET last_active_at = NOW()
  WHERE id = auth.uid()
    AND (last_active_at IS NULL OR last_active_at < NOW() - INTERVAL '1 minute');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN profiles.privacy_preset IS 'Quick privacy setting: only_me, friends_only, everyone, or custom';
COMMENT ON COLUMN profiles.follower_count IS 'Denormalized follower count (updated by trigger, visible for VIP only)';
COMMENT ON COLUMN profiles.account_type IS 'Account tier: standard, vip, or merchant';
COMMENT ON COLUMN profiles.online_status IS 'Current presence status: online, away, invisible, offline';
COMMENT ON COLUMN profiles.last_active_at IS 'Last activity timestamp for presence features';
