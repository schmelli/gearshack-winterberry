-- Migration: T002 - Create notifications table
-- Feature: 048-shared-loadout-enhancement
-- Purpose: Store user notifications including loadout comments, messages, and system alerts
-- Date: 2025-12-14

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'loadout_comment',
    'message_received',
    'friend_request',
    'gear_trade',
    'system'
  )),
  reference_type TEXT,
  reference_id TEXT,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user's unread notifications (most common query)
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at DESC);

-- Index for user's all notifications
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only view their own notifications
CREATE POLICY "Users view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- RLS Policy: Users can update (mark read) their own notifications
CREATE POLICY "Users update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add table comment for documentation
COMMENT ON TABLE notifications IS
  'Stores all user notifications including comments, messages, and system alerts';
COMMENT ON COLUMN notifications.type IS
  'Notification category: loadout_comment, message_received, friend_request, gear_trade, or system';
COMMENT ON COLUMN notifications.reference_type IS
  'Type of referenced entity (e.g., loadout_comment, message, user)';
COMMENT ON COLUMN notifications.reference_id IS
  'UUID or token of the referenced entity';
