-- Migration: Create Social Graph Enums
-- Feature: 001-social-graph
-- Task: T006
-- Date: 2025-12-28

-- =============================================================================
-- ENUMS FOR SOCIAL GRAPH FEATURE
-- =============================================================================

-- Friend request status
DO $$ BEGIN
  CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Activity type for friend feed
DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM (
    'new_loadout',
    'loadout_shared',
    'marketplace_listing',
    'gear_added',
    'friend_added',
    'profile_updated'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Activity visibility
DO $$ BEGIN
  CREATE TYPE activity_visibility AS ENUM ('public', 'friends', 'private');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Privacy preset for user settings
DO $$ BEGIN
  CREATE TYPE privacy_preset AS ENUM ('only_me', 'friends_only', 'everyone', 'custom');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Account type (if not already exists)
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('standard', 'vip', 'merchant');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add comments for documentation
COMMENT ON TYPE friend_request_status IS 'Status of a friend request: pending, accepted, declined, or expired';
COMMENT ON TYPE activity_type IS 'Types of activities that appear in friend feed';
COMMENT ON TYPE activity_visibility IS 'Who can see an activity: public, friends only, or private';
COMMENT ON TYPE privacy_preset IS 'Privacy preset patterns for quick configuration';
COMMENT ON TYPE account_type IS 'User account tier: standard, vip, or merchant';
