-- Migration: Update Notifications Table for Social Features
-- Feature: 001-social-graph
-- Task: T012
-- Date: 2025-12-28

-- =============================================================================
-- UPDATE NOTIFICATIONS TYPE CONSTRAINT
-- Add new notification types for social features
-- =============================================================================

-- Drop existing constraint if it exists
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with new social notification types
ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  -- Existing types
  'loadout_comment',
  'message_received',
  'friend_request',
  'gear_trade',
  'system',
  'gear_enrichment',
  -- New social types
  'friend_request_accepted',
  'new_follower',
  'friend_activity'
));

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON COLUMN notifications.type IS 'Notification type: loadout_comment, message_received, friend_request, friend_request_accepted, new_follower, friend_activity, gear_trade, system, gear_enrichment';
