-- Migration: Create bulletin board enums
-- Feature: 051-community-bulletin-board
-- Date: 2025-12-29

-- Safe enum creation: only create if not exists
DO $$ BEGIN
  CREATE TYPE post_tag AS ENUM (
    'question',
    'shakedown',
    'trade',
    'trip_planning',
    'gear_advice',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE linked_content_type AS ENUM (
    'loadout',
    'shakedown',
    'marketplace_item'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_reason AS ENUM (
    'spam',
    'harassment',
    'off_topic',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'pending',
    'resolved',
    'dismissed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE moderation_action AS ENUM (
    'delete_content',
    'warn_user',
    'ban_1d',
    'ban_7d',
    'ban_permanent',
    'dismiss'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add comments for documentation (safe - will just update if exists)
COMMENT ON TYPE post_tag IS 'Category tags for bulletin board posts';
COMMENT ON TYPE linked_content_type IS 'Types of content that can be linked in bulletin posts';
COMMENT ON TYPE report_reason IS 'Predefined reasons for reporting content';
COMMENT ON TYPE report_status IS 'Status tracking for content reports';
COMMENT ON TYPE moderation_action IS 'Actions moderators can take on reported content';
