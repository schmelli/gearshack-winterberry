-- Migration: Add Featured Videos to VIP Accounts
-- Feature: 056-community-hub-enhancements
-- Purpose: Allow admins to assign featured YouTube videos to VIP profiles

-- =============================================================================
-- Extend vip_accounts table
-- =============================================================================

-- Add featured_video_urls column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vip_accounts'
    AND column_name = 'featured_video_urls'
  ) THEN
    ALTER TABLE vip_accounts
      ADD COLUMN featured_video_urls TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END $$;

-- Add documentation
COMMENT ON COLUMN vip_accounts.featured_video_urls IS
  'Array of YouTube URLs for featured videos section in VIP profile modal';
