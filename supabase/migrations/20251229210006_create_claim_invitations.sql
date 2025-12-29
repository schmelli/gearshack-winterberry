-- Migration: Create Claim Invitations Table
-- Feature: 052-vip-loadouts
-- Description: Tracks claim invitations sent to VIPs for account ownership

-- =============================================================================
-- Claim Invitations Table
-- =============================================================================

CREATE TABLE IF NOT EXISTS claim_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- VIP account to be claimed
  vip_id UUID NOT NULL REFERENCES vip_accounts(id) ON DELETE CASCADE,

  -- Invitation details
  email VARCHAR(255) NOT NULL,
  token VARCHAR(100) UNIQUE NOT NULL,

  -- Status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'claimed', 'expired')),

  -- Audit fields
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Expiration (30 days from creation)
  expires_at TIMESTAMPTZ NOT NULL,

  -- Verification timestamps
  verified_at TIMESTAMPTZ,
  claimed_at TIMESTAMPTZ
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Token lookup (for claim verification)
CREATE INDEX IF NOT EXISTS idx_claim_invitations_token ON claim_invitations(token);

-- VIP's invitations
CREATE INDEX IF NOT EXISTS idx_claim_invitations_vip ON claim_invitations(vip_id);

-- Pending invitations (for admin management)
CREATE INDEX IF NOT EXISTS idx_claim_invitations_status ON claim_invitations(status)
  WHERE status = 'pending';

-- Expiration check (for cleanup)
CREATE INDEX IF NOT EXISTS idx_claim_invitations_expires ON claim_invitations(expires_at)
  WHERE status = 'pending';

-- =============================================================================
-- Triggers
-- =============================================================================

-- Auto-expire invitations after 30 days
CREATE OR REPLACE FUNCTION expire_claim_invitations()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE claim_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Note: This trigger runs on INSERT to check existing invitations
-- For production, a scheduled job (pg_cron) would be more efficient
CREATE OR REPLACE FUNCTION check_expired_invitations_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Expire any pending invitations that are past their expiry
  UPDATE claim_invitations
  SET status = 'expired'
  WHERE status = 'pending' AND expires_at < NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_expired_invitations
  BEFORE INSERT ON claim_invitations
  FOR EACH STATEMENT
  EXECUTE FUNCTION check_expired_invitations_on_insert();

-- =============================================================================
-- Constraints
-- =============================================================================

-- Validate email format
ALTER TABLE claim_invitations
  ADD CONSTRAINT chk_claim_invitations_email
  CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- Validate token length
ALTER TABLE claim_invitations
  ADD CONSTRAINT chk_claim_invitations_token_length
  CHECK (length(token) >= 64);

-- =============================================================================
-- Comments
-- =============================================================================

COMMENT ON TABLE claim_invitations IS 'Invitations for VIPs to claim their curated accounts';
COMMENT ON COLUMN claim_invitations.token IS 'Secure random token (64+ chars) for claim verification';
COMMENT ON COLUMN claim_invitations.expires_at IS 'Invitation expires 30 days after creation';
COMMENT ON COLUMN claim_invitations.verified_at IS 'When VIP verified their email';
COMMENT ON COLUMN claim_invitations.claimed_at IS 'When VIP completed the claim process';
