-- ============================================================================
-- Migration: Add Account Status to Profiles
-- Feature: Admin Section Enhancement - User Management
--
-- Adds account status tracking for user suspension/banning functionality.
-- ============================================================================

-- Create account_status enum type
DO $$ BEGIN
    CREATE TYPE account_status AS ENUM ('active', 'suspended', 'banned');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Add account status and suspension fields to profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS account_status account_status DEFAULT 'active';

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspension_reason TEXT;

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS suspended_by UUID REFERENCES profiles(id);

-- Index for efficient filtering by status
CREATE INDEX IF NOT EXISTS idx_profiles_account_status ON profiles(account_status);

-- Index for finding suspensions that should be lifted
CREATE INDEX IF NOT EXISTS idx_profiles_suspended_until ON profiles(suspended_until)
WHERE suspended_until IS NOT NULL;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON COLUMN profiles.account_status IS 'Current account status: active, suspended, or banned';
COMMENT ON COLUMN profiles.suspended_at IS 'Timestamp when the account was suspended';
COMMENT ON COLUMN profiles.suspended_until IS 'When the suspension expires (NULL for indefinite)';
COMMENT ON COLUMN profiles.suspension_reason IS 'Admin-provided reason for suspension';
COMMENT ON COLUMN profiles.suspended_by IS 'Admin who performed the suspension';
