-- Migration: Create Friend Activities Table
-- Feature: 001-social-graph
-- Task: T010
-- Date: 2025-12-28

-- =============================================================================
-- FRIEND ACTIVITIES TABLE
-- Stores denormalized activity events for efficient feed queries
-- Enabled for Supabase Realtime for live updates
-- =============================================================================

CREATE TABLE IF NOT EXISTS friend_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type activity_type NOT NULL,
  reference_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  metadata JSONB DEFAULT '{}',
  visibility activity_visibility NOT NULL DEFAULT 'friends',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Primary index for feed queries (user's activities by time)
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time
  ON friend_activities(user_id, created_at DESC);

-- Index for global/public feed queries
CREATE INDEX IF NOT EXISTS idx_friend_activities_time
  ON friend_activities(created_at DESC);

-- Index for visibility-based queries
CREATE INDEX IF NOT EXISTS idx_friend_activities_visibility
  ON friend_activities(visibility, created_at DESC);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- Users can view activities based on visibility and friendship
CREATE POLICY "friend_activities_select" ON friend_activities
  FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (visibility = 'friends' AND are_friends(user_id, auth.uid()))
  );

-- Activities are created via triggers/RPC only
CREATE POLICY "friend_activities_insert" ON friend_activities
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own activities
CREATE POLICY "friend_activities_delete_own" ON friend_activities
  FOR DELETE
  USING (user_id = auth.uid());

-- =============================================================================
-- ENABLE REALTIME
-- =============================================================================

-- Enable Realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE friend_activities;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE friend_activities IS 'Denormalized activity events for friend feed with Realtime enabled';
COMMENT ON COLUMN friend_activities.user_id IS 'User who performed the activity';
COMMENT ON COLUMN friend_activities.activity_type IS 'Type of activity (new_loadout, gear_added, etc.)';
COMMENT ON COLUMN friend_activities.reference_type IS 'Entity type being referenced (loadout, gear_item, profile)';
COMMENT ON COLUMN friend_activities.reference_id IS 'ID of the referenced entity';
COMMENT ON COLUMN friend_activities.metadata IS 'Additional activity data as JSONB';
COMMENT ON COLUMN friend_activities.visibility IS 'Who can see this activity (public, friends, private)';
