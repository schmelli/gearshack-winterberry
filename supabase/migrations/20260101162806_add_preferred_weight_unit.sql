-- Migration: Add preferred_weight_unit column to profiles table
-- Feature: 012-automatic-unit-conversion
-- Date: 2026-01-01

-- Add preferred_weight_unit field for user's weight display preference
-- Using IF NOT EXISTS pattern for idempotency

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  preferred_weight_unit TEXT NOT NULL DEFAULT 'g';

-- Add check constraint to ensure only valid weight units (idempotent)
DO $$ BEGIN
  ALTER TABLE profiles ADD CONSTRAINT preferred_weight_unit_check
    CHECK (preferred_weight_unit IN ('g', 'oz', 'lb'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Comment
COMMENT ON COLUMN profiles.preferred_weight_unit IS 'User preference for weight unit display (grams, ounces, or pounds)';
