-- Migration: Create Friend Requests Table
-- Feature: 001-social-graph
-- Task: T007
-- Date: 2025-12-28

-- =============================================================================
-- FRIEND REQUESTS TABLE
-- Stores pending friend requests with automatic expiration (30 days)
-- =============================================================================

CREATE TABLE IF NOT EXISTS friend_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status friend_request_status NOT NULL DEFAULT 'pending',
  message TEXT CHECK (char_length(message) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),

  -- Constraints
  CONSTRAINT friend_requests_no_self_request CHECK (sender_id != recipient_id),
  CONSTRAINT friend_requests_unique_pending UNIQUE (sender_id, recipient_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================

-- Index for recipient's pending requests (most common query)
CREATE INDEX IF NOT EXISTS idx_friend_requests_recipient_pending
  ON friend_requests(recipient_id, status)
  WHERE status = 'pending';

-- Index for sender's requests
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender
  ON friend_requests(sender_id);

-- Index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_friend_requests_expires
  ON friend_requests(expires_at)
  WHERE status = 'pending';

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Users can view requests where they are sender or recipient
CREATE POLICY "friend_requests_select_own" ON friend_requests
  FOR SELECT
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

-- Users can insert requests as sender
CREATE POLICY "friend_requests_insert_sender" ON friend_requests
  FOR INSERT
  WITH CHECK (sender_id = auth.uid());

-- Recipients can update request status
CREATE POLICY "friend_requests_update_recipient" ON friend_requests
  FOR UPDATE
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Senders can delete (cancel) pending requests
CREATE POLICY "friend_requests_delete_sender" ON friend_requests
  FOR DELETE
  USING (sender_id = auth.uid() AND status = 'pending');

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE friend_requests IS 'Pending and historical friend requests with 30-day auto-expiration';
COMMENT ON COLUMN friend_requests.sender_id IS 'User who sent the friend request';
COMMENT ON COLUMN friend_requests.recipient_id IS 'User who received the friend request';
COMMENT ON COLUMN friend_requests.status IS 'Current status: pending, accepted, declined, or expired';
COMMENT ON COLUMN friend_requests.message IS 'Optional personal message (max 500 chars)';
COMMENT ON COLUMN friend_requests.expires_at IS 'Auto-expiration date (30 days from creation)';
