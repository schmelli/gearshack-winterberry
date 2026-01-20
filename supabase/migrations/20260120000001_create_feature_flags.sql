-- Migration: Create Feature Flags System
-- Feature: Admin Feature Activation
-- Description: Allows admins to enable/disable features globally or per user group

-- ============================================================================
-- Create enum for allowed user groups
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'feature_user_group') THEN
    CREATE TYPE feature_user_group AS ENUM ('all', 'admins', 'trailblazer', 'beta', 'vip', 'merchant');
  END IF;
END$$;

-- ============================================================================
-- Create feature_flags table
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Feature identification
  feature_key TEXT NOT NULL UNIQUE,
  feature_name TEXT NOT NULL,
  description TEXT,

  -- Parent feature for hierarchical features (e.g., community sub-features)
  parent_feature_key TEXT REFERENCES feature_flags(feature_key) ON DELETE CASCADE,

  -- Activation status
  is_enabled BOOLEAN NOT NULL DEFAULT false,

  -- User group restrictions (NULL = disabled, empty array with is_enabled=true = everyone)
  -- If is_enabled=true and allowed_groups contains values, only those groups have access
  allowed_groups feature_user_group[] DEFAULT '{}',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_feature_flags_feature_key ON feature_flags(feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_parent_key ON feature_flags(parent_feature_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);

-- ============================================================================
-- Update trigger for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_feature_flags_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_feature_flags_updated_at ON feature_flags;
CREATE TRIGGER trigger_feature_flags_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flags_updated_at();

-- ============================================================================
-- RLS Policies
-- ============================================================================
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Everyone can read feature flags (needed for feature checks)
DROP POLICY IF EXISTS feature_flags_select_all ON feature_flags;
CREATE POLICY feature_flags_select_all ON feature_flags
  FOR SELECT USING (true);

-- Only admins can insert feature flags
DROP POLICY IF EXISTS feature_flags_admin_insert ON feature_flags;
CREATE POLICY feature_flags_admin_insert ON feature_flags
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can update feature flags
DROP POLICY IF EXISTS feature_flags_admin_update ON feature_flags;
CREATE POLICY feature_flags_admin_update ON feature_flags
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Only admins can delete feature flags
DROP POLICY IF EXISTS feature_flags_admin_delete ON feature_flags;
CREATE POLICY feature_flags_admin_delete ON feature_flags
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Seed initial feature flags
-- ============================================================================
INSERT INTO feature_flags (feature_key, feature_name, description, is_enabled, allowed_groups)
VALUES
  -- Main features
  ('community', 'Community', 'Community hub with all social features', true, '{}'),
  ('ai_gear_assistant', 'AI Gear Assistant', 'AI-powered gear recommendations and assistance', true, '{trailblazer,admins}'),
  ('messaging', 'Messaging System', 'Direct messaging between users', true, '{}'),

  -- Community sub-features
  ('community_bulletin', 'Bulletin Board', 'Community bulletin board for posts and discussions', true, '{}'),
  ('community_shakedowns', 'Shakedowns', 'Gear shakedown reviews from the community', true, '{}'),
  ('community_social', 'Social Features', 'Following, friends, and social connections', true, '{}'),
  ('community_wiki', 'Wiki', 'Community-driven gear wiki', true, '{}')
ON CONFLICT (feature_key) DO NOTHING;

-- Set parent relationships for community sub-features
UPDATE feature_flags SET parent_feature_key = 'community'
WHERE feature_key IN ('community_bulletin', 'community_shakedowns', 'community_social', 'community_wiki');

-- ============================================================================
-- Activity log for feature flag changes
-- ============================================================================
-- Extend admin_action_type enum if it exists
DO $$
BEGIN
  -- Check if the type exists and add new values
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_action_type') THEN
    BEGIN
      ALTER TYPE admin_action_type ADD VALUE IF NOT EXISTS 'feature_flag_update';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END$$;
