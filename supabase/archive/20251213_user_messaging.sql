-- Migration: User Messaging System
-- Feature: 046-user-messaging-system
-- Date: 2025-12-13
-- Tasks: T003, T004, T005
--
-- Run this SQL in Supabase Dashboard > SQL Editor
-- Or via Supabase CLI: supabase db push

-- =============================================================================
-- T003: Create messaging enums
-- =============================================================================

CREATE TYPE message_type AS ENUM (
  'text',
  'image',
  'voice',
  'location',
  'gear_reference',
  'gear_trade',
  'trip_invitation'
);

CREATE TYPE message_deletion_state AS ENUM (
  'active',
  'deleted_for_sender',
  'deleted_for_all'
);

CREATE TYPE conversation_type AS ENUM (
  'direct',
  'group'
);

CREATE TYPE participant_role AS ENUM (
  'member',
  'admin'
);

CREATE TYPE report_reason AS ENUM (
  'spam',
  'harassment',
  'inappropriate_content',
  'other'
);

CREATE TYPE report_status AS ENUM (
  'pending',
  'reviewed',
  'resolved',
  'dismissed'
);

CREATE TYPE messaging_privacy AS ENUM (
  'everyone',
  'friends_only',
  'nobody'
);

-- =============================================================================
-- T004: Add messaging privacy columns to profiles table
-- =============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS messaging_privacy messaging_privacy DEFAULT 'everyone';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS online_status_privacy messaging_privacy DEFAULT 'friends_only';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS discoverable BOOLEAN DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS read_receipts_enabled BOOLEAN DEFAULT true;

-- =============================================================================
-- T003: Create conversations table
-- =============================================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type conversation_type NOT NULL,
  name TEXT,  -- Required for group, NULL for direct
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for recent conversations
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
CREATE INDEX idx_conversations_created_by ON conversations(created_by);

-- =============================================================================
-- T003: Create conversation_participants table
-- =============================================================================

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role participant_role DEFAULT 'member' NOT NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  is_muted BOOLEAN DEFAULT false NOT NULL,
  is_archived BOOLEAN DEFAULT false NOT NULL,
  unread_count INT DEFAULT 0 NOT NULL,
  last_read_at TIMESTAMPTZ,
  PRIMARY KEY (conversation_id, user_id)
);

-- Index for user's conversations
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);
CREATE INDEX idx_conv_participants_archived ON conversation_participants(user_id, is_archived);
CREATE INDEX idx_conv_participants_unread ON conversation_participants(user_id, unread_count) WHERE unread_count > 0;

-- =============================================================================
-- T003: Create messages table
-- =============================================================================

CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  content TEXT,
  message_type message_type NOT NULL DEFAULT 'text',
  media_url TEXT,
  metadata JSONB DEFAULT '{}' NOT NULL,
  deletion_state message_deletion_state DEFAULT 'active' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  -- Full-text search vector
  search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector('english', coalesce(content, ''))
  ) STORED
);

-- Indexes for messages
CREATE INDEX idx_messages_conversation ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_search ON messages USING GIN(search_vector);
CREATE INDEX idx_messages_type ON messages(message_type);

-- =============================================================================
-- T003: Create message_deletions table (for "delete for me")
-- =============================================================================

CREATE TABLE message_deletions (
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

-- =============================================================================
-- T003: Create message_reactions table
-- =============================================================================

CREATE TABLE message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('👍', '❤️', '😂', '😮', '😢')),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX idx_reactions_message ON message_reactions(message_id);

-- =============================================================================
-- T003: Create user_friends table (one-way follow model)
-- =============================================================================

CREATE TABLE user_friends (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, friend_id),
  CHECK (user_id != friend_id)  -- Can't friend yourself
);

CREATE INDEX idx_friends_friend ON user_friends(friend_id);

-- =============================================================================
-- T003: Create user_blocks table
-- =============================================================================

CREATE TABLE user_blocks (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  PRIMARY KEY (user_id, blocked_id),
  CHECK (user_id != blocked_id)  -- Can't block yourself
);

CREATE INDEX idx_blocks_blocked ON user_blocks(blocked_id);

-- =============================================================================
-- T003: Create user_reports table
-- =============================================================================

CREATE TABLE user_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  reported_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  reason report_reason NOT NULL,
  details TEXT,
  status report_status DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_reports_status ON user_reports(status, created_at DESC);
CREATE INDEX idx_reports_reporter ON user_reports(reporter_id);
CREATE INDEX idx_reports_reported ON user_reports(reported_user_id);

-- =============================================================================
-- T005: Enable Row Level Security on all messaging tables
-- =============================================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_deletions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_reports ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- T005: RLS Policies for conversations
-- =============================================================================

-- Users can view conversations they're part of
CREATE POLICY "conversations_select_participant"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can create conversations
CREATE POLICY "conversations_insert_authenticated"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = auth.uid());

-- Users can update conversations they're admin of (for groups)
CREATE POLICY "conversations_update_admin"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- T005: RLS Policies for conversation_participants
-- =============================================================================

-- Users can see participants of conversations they're in
CREATE POLICY "participants_select_member"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can insert themselves or be added by admins
CREATE POLICY "participants_insert_self_or_admin"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid() OR
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own participation settings
CREATE POLICY "participants_update_own"
  ON conversation_participants FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can leave conversations (delete their own participation)
CREATE POLICY "participants_delete_own"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Admins can remove other participants
CREATE POLICY "participants_delete_admin"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- =============================================================================
-- T005: RLS Policies for messages
-- =============================================================================

-- Users can view messages in their conversations (excluding deleted)
CREATE POLICY "messages_select_participant"
  ON messages FOR SELECT
  TO authenticated
  USING (
    conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
    AND deletion_state != 'deleted_for_all'
    AND id NOT IN (
      SELECT message_id FROM message_deletions
      WHERE user_id = auth.uid()
    )
  );

-- Users can send messages to conversations they're in
CREATE POLICY "messages_insert_participant"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND conversation_id IN (
      SELECT conversation_id FROM conversation_participants
      WHERE user_id = auth.uid()
    )
  );

-- Users can update their own messages (for deletion_state)
CREATE POLICY "messages_update_own"
  ON messages FOR UPDATE
  TO authenticated
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

-- =============================================================================
-- T005: RLS Policies for message_deletions
-- =============================================================================

-- Users can see their own deletions
CREATE POLICY "deletions_select_own"
  ON message_deletions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can delete messages for themselves
CREATE POLICY "deletions_insert_own"
  ON message_deletions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- T005: RLS Policies for message_reactions
-- =============================================================================

-- Users can view reactions on messages they can see
CREATE POLICY "reactions_select_visible"
  ON message_reactions FOR SELECT
  TO authenticated
  USING (
    message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Users can add reactions to messages they can see
CREATE POLICY "reactions_insert_own"
  ON message_reactions FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND message_id IN (
      SELECT m.id FROM messages m
      JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
      WHERE cp.user_id = auth.uid()
    )
  );

-- Users can remove their own reactions
CREATE POLICY "reactions_delete_own"
  ON message_reactions FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- T005: RLS Policies for user_friends
-- =============================================================================

-- Users can see their own friends and who has added them as friend
CREATE POLICY "friends_select_own"
  ON user_friends FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

-- Users can manage their own friends list
CREATE POLICY "friends_insert_own"
  ON user_friends FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "friends_delete_own"
  ON user_friends FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- T005: RLS Policies for user_blocks
-- =============================================================================

-- Users can only see their own blocks
CREATE POLICY "blocks_select_own"
  ON user_blocks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can manage their own blocks
CREATE POLICY "blocks_insert_own"
  ON user_blocks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "blocks_delete_own"
  ON user_blocks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =============================================================================
-- T005: RLS Policies for user_reports
-- =============================================================================

-- Users can view their own reports
CREATE POLICY "reports_select_own"
  ON user_reports FOR SELECT
  TO authenticated
  USING (reporter_id = auth.uid());

-- Users can create reports
CREATE POLICY "reports_insert_own"
  ON user_reports FOR INSERT
  TO authenticated
  WITH CHECK (reporter_id = auth.uid());

-- =============================================================================
-- Trigger: Update conversation.updated_at on new message
-- =============================================================================

CREATE OR REPLACE FUNCTION update_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations
  SET updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_message_update_conversation
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION update_conversation_timestamp();

-- =============================================================================
-- Trigger: Increment unread_count for other participants on new message
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_unread_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversation_participants
  SET unread_count = unread_count + 1
  WHERE conversation_id = NEW.conversation_id
    AND user_id != NEW.sender_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_message_increment_unread
AFTER INSERT ON messages
FOR EACH ROW
EXECUTE FUNCTION increment_unread_count();

-- =============================================================================
-- Function: Reset unread count when conversation is read
-- =============================================================================

CREATE OR REPLACE FUNCTION reset_unread_count(p_conversation_id UUID, p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE conversation_participants
  SET unread_count = 0, last_read_at = NOW()
  WHERE conversation_id = p_conversation_id
    AND user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: Check if user can message another user (privacy + blocks)
-- =============================================================================

CREATE OR REPLACE FUNCTION can_message_user(p_sender_id UUID, p_recipient_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_is_blocked BOOLEAN;
  v_privacy messaging_privacy;
  v_is_friend BOOLEAN;
BEGIN
  -- Check if blocked (in either direction)
  SELECT EXISTS(
    SELECT 1 FROM user_blocks
    WHERE (user_id = p_recipient_id AND blocked_id = p_sender_id)
       OR (user_id = p_sender_id AND blocked_id = p_recipient_id)
  ) INTO v_is_blocked;

  IF v_is_blocked THEN
    RETURN FALSE;
  END IF;

  -- Get recipient's privacy setting
  SELECT messaging_privacy INTO v_privacy
  FROM profiles WHERE id = p_recipient_id;

  IF v_privacy = 'nobody' THEN
    RETURN FALSE;
  END IF;

  IF v_privacy = 'everyone' THEN
    RETURN TRUE;
  END IF;

  -- Check if sender is friend of recipient
  SELECT EXISTS(
    SELECT 1 FROM user_friends
    WHERE user_id = p_recipient_id AND friend_id = p_sender_id
  ) INTO v_is_friend;

  RETURN v_is_friend;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Function: Get or create direct conversation between two users
-- =============================================================================

CREATE OR REPLACE FUNCTION get_or_create_direct_conversation(p_user1 UUID, p_user2 UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Check for existing direct conversation
  SELECT c.id INTO v_conversation_id
  FROM conversations c
  JOIN conversation_participants cp1 ON cp1.conversation_id = c.id AND cp1.user_id = p_user1
  JOIN conversation_participants cp2 ON cp2.conversation_id = c.id AND cp2.user_id = p_user2
  WHERE c.type = 'direct'
  LIMIT 1;

  IF v_conversation_id IS NOT NULL THEN
    RETURN v_conversation_id;
  END IF;

  -- Create new conversation
  INSERT INTO conversations (type, created_by)
  VALUES ('direct', p_user1)
  RETURNING id INTO v_conversation_id;

  -- Add both participants
  INSERT INTO conversation_participants (conversation_id, user_id, role)
  VALUES (v_conversation_id, p_user1, 'member'),
         (v_conversation_id, p_user2, 'member');

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Enable Realtime for messaging tables
-- =============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_participants;

-- =============================================================================
-- Add RLS policy for profiles to allow viewing other users (for messaging)
-- =============================================================================

-- Allow authenticated users to view basic profile info of discoverable users
CREATE POLICY "profiles_select_discoverable"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    id = auth.uid() OR discoverable = true
  );

-- =============================================================================
-- End of migration
-- =============================================================================
