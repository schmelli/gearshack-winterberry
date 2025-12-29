-- Migration: Create shakedown enums
-- Feature: 001-community-shakedowns
-- Date: 2025-12-29

-- Shakedown privacy levels
DO $$ BEGIN
  CREATE TYPE shakedown_privacy AS ENUM (
    'public',
    'friends_only',
    'private'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Shakedown status
DO $$ BEGIN
  CREATE TYPE shakedown_status AS ENUM (
    'open',
    'completed',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Experience levels (may already exist from other features)
DO $$ BEGIN
  CREATE TYPE experience_level AS ENUM (
    'beginner',
    'intermediate',
    'experienced',
    'expert'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Badge types for shakedown reputation
DO $$ BEGIN
  CREATE TYPE shakedown_badge AS ENUM (
    'shakedown_helper',    -- 10 helpful votes
    'trail_expert',        -- 50 helpful votes
    'community_legend'     -- 100 helpful votes
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation
COMMENT ON TYPE shakedown_privacy IS 'Privacy levels for shakedown visibility: public, friends_only, private';
COMMENT ON TYPE shakedown_status IS 'Lifecycle status for shakedowns: open, completed, archived';
COMMENT ON TYPE experience_level IS 'User experience level for trip context';
COMMENT ON TYPE shakedown_badge IS 'Reputation badges awarded for helpful feedback';
