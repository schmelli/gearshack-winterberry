-- Migration: Create shakedowns table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

CREATE TABLE IF NOT EXISTS shakedowns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership & Linking
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  loadout_id UUID NOT NULL REFERENCES loadouts(id) ON DELETE CASCADE,

  -- Trip Context (FR-002)
  trip_name VARCHAR(100) NOT NULL,
  trip_start_date DATE NOT NULL,
  trip_end_date DATE NOT NULL,
  experience_level experience_level NOT NULL,
  concerns TEXT,  -- Optional: specific areas for feedback

  -- Privacy (FR-003, FR-004)
  privacy shakedown_privacy NOT NULL DEFAULT 'friends_only',
  share_token VARCHAR(32) UNIQUE,  -- For public shareable URLs (FR-005)

  -- Status & Lifecycle (FR-019, FR-020, FR-023)
  status shakedown_status NOT NULL DEFAULT 'open',
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Denormalized Counts (for performance)
  feedback_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,

  -- Moderation
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  hidden_reason VARCHAR(200),

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Constraints
  CONSTRAINT chk_trip_dates CHECK (trip_end_date >= trip_start_date),
  CONSTRAINT chk_trip_name_length CHECK (length(trip_name) <= 100)
);

-- Indexes for performance (safe to run multiple times)
CREATE INDEX IF NOT EXISTS idx_shakedowns_owner ON shakedowns(owner_id);
CREATE INDEX IF NOT EXISTS idx_shakedowns_loadout ON shakedowns(loadout_id);
CREATE INDEX IF NOT EXISTS idx_shakedowns_status ON shakedowns(status) WHERE is_hidden = false;
CREATE INDEX IF NOT EXISTS idx_shakedowns_feed ON shakedowns(created_at DESC)
  WHERE is_hidden = false AND status = 'open';
CREATE INDEX IF NOT EXISTS idx_shakedowns_share_token ON shakedowns(share_token)
  WHERE share_token IS NOT NULL;

-- Trigger for updated_at (OR REPLACE makes it idempotent)
CREATE OR REPLACE FUNCTION update_shakedown_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger (idempotent)
DROP TRIGGER IF EXISTS trg_shakedowns_updated_at ON shakedowns;
CREATE TRIGGER trg_shakedowns_updated_at
  BEFORE UPDATE ON shakedowns
  FOR EACH ROW
  EXECUTE FUNCTION update_shakedown_updated_at();

-- Comments
COMMENT ON TABLE shakedowns IS 'Community shakedown requests for loadout review feedback';
COMMENT ON COLUMN shakedowns.trip_name IS 'Name/description of the planned trip';
COMMENT ON COLUMN shakedowns.experience_level IS 'User self-reported experience level for context';
COMMENT ON COLUMN shakedowns.concerns IS 'Optional specific areas user wants feedback on';
COMMENT ON COLUMN shakedowns.share_token IS 'Token for public shareable URLs';
COMMENT ON COLUMN shakedowns.feedback_count IS 'Denormalized feedback count for performance';
COMMENT ON COLUMN shakedowns.helpful_count IS 'Denormalized helpful vote count for performance';
COMMENT ON COLUMN shakedowns.is_hidden IS 'Moderation flag to hide from public feeds';
