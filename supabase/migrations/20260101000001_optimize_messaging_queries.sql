-- Migration: Optimize messaging queries (Fix N+1 patterns)
-- Feature: 002-fix-n-1-query-pattern-in-messaging-queries
-- Date: 2026-01-01
--
-- This migration creates optimized SQL functions to eliminate N+1 query patterns
-- in the messaging system. Previously, fetchConversations made 1+2N queries
-- (1 for conversations, then N calls to fetchConversationParticipants and
-- N calls to fetchLastMessage). This reduces it to a single optimized query.

-- ============================================================================
-- Get User Conversations with Participants and Last Messages
-- ============================================================================
-- This function replaces the N+1 pattern of separately fetching participants
-- and last messages for each conversation. It uses JOINs, window functions,
-- and JSON aggregation to return everything in a single query.
--
-- Performance improvement: 1+2N queries → 1 query
-- Example: For 20 conversations, reduces from 41 queries to 1 query

CREATE OR REPLACE FUNCTION get_user_conversations(
  p_user_id UUID,
  p_include_archived BOOLEAN DEFAULT false
)
RETURNS TABLE (
  -- Conversation participant fields (user's relationship to conversation)
  conversation_id UUID,
  role TEXT,
  is_muted BOOLEAN,
  is_archived BOOLEAN,
  unread_count INTEGER,
  last_read_at TIMESTAMPTZ,

  -- Conversation details
  conv_id UUID,
  conv_type TEXT,
  conv_name TEXT,
  conv_created_by UUID,
  conv_created_at TIMESTAMPTZ,
  conv_updated_at TIMESTAMPTZ,

  -- Last message preview (JSON object)
  last_message JSONB,

  -- Participants array (JSON array)
  participants JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH user_conversations AS (
    -- Get all conversations for the user with their participant status
    SELECT
      cp.conversation_id,
      cp.role,
      cp.is_muted,
      cp.is_archived,
      cp.unread_count,
      cp.last_read_at,
      c.id as conv_id,
      c.type as conv_type,
      c.name as conv_name,
      c.created_by as conv_created_by,
      c.created_at as conv_created_at,
      c.updated_at as conv_updated_at
    FROM conversation_participants cp
    INNER JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = p_user_id
      AND (p_include_archived OR cp.is_archived = false)
  ),
  ranked_messages AS (
    -- Get the most recent message for each conversation using window function
    SELECT
      m.id,
      m.conversation_id,
      m.content,
      m.message_type,
      m.sender_id,
      m.created_at,
      p.display_name as sender_name,
      ROW_NUMBER() OVER (
        PARTITION BY m.conversation_id
        ORDER BY m.created_at DESC
      ) as rn
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.deletion_state = 'active'
      AND m.conversation_id IN (SELECT conversation_id FROM user_conversations)
  ),
  last_messages AS (
    -- Filter to only the most recent message per conversation
    SELECT
      conversation_id,
      jsonb_build_object(
        'id', id,
        'content', content,
        'message_type', message_type,
        'sender_id', sender_id,
        'sender_name', sender_name,
        'created_at', created_at
      ) as message_data
    FROM ranked_messages
    WHERE rn = 1
  ),
  conversation_participants_agg AS (
    -- Aggregate all participants for each conversation into JSON array
    SELECT
      cp.conversation_id,
      jsonb_agg(
        jsonb_build_object(
          'id', p.id,
          'display_name', COALESCE(p.display_name, 'Unknown'),
          'avatar_url', p.avatar_url,
          'role', cp.role,
          'joined_at', cp.joined_at
        )
        ORDER BY cp.joined_at ASC
      ) as participants_data
    FROM conversation_participants cp
    INNER JOIN profiles p ON p.id = cp.user_id
    WHERE cp.conversation_id IN (SELECT conversation_id FROM user_conversations)
    GROUP BY cp.conversation_id
  )
  -- Final join to combine everything
  SELECT
    uc.conversation_id,
    uc.role::TEXT,
    uc.is_muted,
    uc.is_archived,
    uc.unread_count,
    uc.last_read_at,
    uc.conv_id,
    uc.conv_type::TEXT,
    uc.conv_name,
    uc.conv_created_by,
    uc.conv_created_at,
    uc.conv_updated_at,
    lm.message_data as last_message,
    cpa.participants_data as participants
  FROM user_conversations uc
  LEFT JOIN last_messages lm ON lm.conversation_id = uc.conversation_id
  LEFT JOIN conversation_participants_agg cpa ON cpa.conversation_id = uc.conversation_id
  ORDER BY uc.conv_updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION get_user_conversations IS 'Optimized function to fetch user conversations with participants and last messages in a single query. Eliminates N+1 pattern (reduces 1+2N queries to 1 query).';

-- ============================================================================
-- Search Users with Block Status
-- ============================================================================
-- This function replaces the N+1 pattern of checking isBlocked for each
-- search result. It performs user search and block status checks in a single
-- query using NOT EXISTS subqueries.
--
-- Performance improvement: 1+N queries → 1 query
-- Example: For 20 search results, reduces from 21 queries to 1 query

CREATE OR REPLACE FUNCTION search_users_with_block_status(
  p_query TEXT,
  p_current_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  can_message BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.display_name, 'Unknown') as display_name,
    p.avatar_url,
    -- User can message if NOT blocked (in either direction) AND privacy allows
    (
      NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.user_id = p_current_user_id AND ub.blocked_id = p.id)
           OR (ub.user_id = p.id AND ub.blocked_id = p_current_user_id)
      )
      AND p.messaging_privacy != 'nobody'
    ) as can_message
  FROM profiles p
  WHERE p.discoverable = true
    AND p.id != p_current_user_id
    AND p.display_name ILIKE '%' || p_query || '%'
  ORDER BY p.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION search_users_with_block_status IS 'Optimized function to search users and check block status in a single query. Eliminates N+1 pattern (reduces 1+N queries to 1 query). Checks bidirectional blocks and messaging privacy.';

-- ============================================================================
-- Performance Indexes
-- ============================================================================
-- These indexes optimize the SQL functions above and improve query performance
-- for conversation lookups, message ordering, and user search.

-- Index for efficient last message lookup in get_user_conversations
-- Supports: ORDER BY m.created_at DESC in the ROW_NUMBER() window function
-- Used in: ranked_messages CTE
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created_at
  ON messages(conversation_id, created_at DESC)
  WHERE deletion_state = 'active';

-- Index for bidirectional block checks in search_users_with_block_status
-- Supports: WHERE (ub.user_id = X AND ub.blocked_id = Y) OR (ub.user_id = Y AND ub.blocked_id = X)
-- Used in: NOT EXISTS subquery for block status checks
CREATE INDEX IF NOT EXISTS idx_user_blocks_user_blocked
  ON user_blocks(user_id, blocked_id);

-- Reverse index for bidirectional block checks (covers the OR condition)
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked_user
  ON user_blocks(blocked_id, user_id);

-- Index for user search by discoverable status and display name
-- Supports: WHERE discoverable = true AND display_name ILIKE ...
-- Used in: search_users_with_block_status function
CREATE INDEX IF NOT EXISTS idx_profiles_discoverable_display_name
  ON profiles(discoverable, display_name)
  WHERE discoverable = true;

-- Comments
COMMENT ON INDEX idx_messages_conversation_created_at IS 'Optimizes last message lookup by conversation with temporal ordering. Partial index on active messages only.';
COMMENT ON INDEX idx_user_blocks_user_blocked IS 'Optimizes bidirectional block checks (user_id → blocked_id direction).';
COMMENT ON INDEX idx_user_blocks_blocked_user IS 'Optimizes bidirectional block checks (blocked_id → user_id direction).';
COMMENT ON INDEX idx_profiles_discoverable_display_name IS 'Optimizes user search queries. Partial index on discoverable users only.';
