-- Migration: Add reputation columns to profiles table
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

-- Add reputation fields (FR-024, FR-026)
-- Using IF NOT EXISTS pattern for idempotency

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedown_helpful_received INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedowns_reviewed INTEGER NOT NULL DEFAULT 0;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  shakedowns_created INTEGER NOT NULL DEFAULT 0;

-- Comments
COMMENT ON COLUMN profiles.shakedown_helpful_received IS 'Total helpful votes received for shakedown feedback';
COMMENT ON COLUMN profiles.shakedowns_reviewed IS 'Number of shakedowns user has provided feedback on';
COMMENT ON COLUMN profiles.shakedowns_created IS 'Number of shakedowns user has created';
