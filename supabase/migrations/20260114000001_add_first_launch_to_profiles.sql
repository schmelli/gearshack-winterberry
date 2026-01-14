-- Migration: Add first_launch field to profiles table
-- Feature: User Onboarding
-- Date: 2026-01-14
--
-- Tracks when a user first completes the onboarding flow.
-- This field is set once when onboarding is completed and never updated again.
-- NULL indicates the user has not completed onboarding yet.

-- =============================================================================
-- Add first_launch Column
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS
  first_launch TIMESTAMPTZ DEFAULT NULL;

COMMENT ON COLUMN profiles.first_launch IS 'Timestamp when user first completed onboarding flow. NULL if not completed.';

-- =============================================================================
-- Index for Performance
-- =============================================================================

-- Index to efficiently find users who haven't completed onboarding
-- Partial index only includes rows where first_launch IS NULL
CREATE INDEX IF NOT EXISTS idx_profiles_first_launch_null
ON profiles(first_launch)
WHERE first_launch IS NULL;

COMMENT ON INDEX idx_profiles_first_launch_null IS 'Efficient lookup for users who have not completed onboarding';
