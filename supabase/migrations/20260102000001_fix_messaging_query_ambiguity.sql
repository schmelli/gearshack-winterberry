-- Migration: Fix ambiguous column reference in get_user_conversations
-- Date: 2026-01-02
-- Fixes: Column reference "conv_id" is ambiguous error

-- Drop the existing function first
DROP FUNCTION IF EXISTS get_user_conversations(UUID, BOOLEAN);

-- Recreate with fixed query (removed ambiguous column references)
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
      cp.conversation_id as uc_conversation_id,
      cp.role as uc_role,
      cp.is_muted as uc_is_muted,
      cp.is_archived as uc_is_archived,
      cp.unread_count as uc_unread_count,
      cp.last_read_at as uc_last_read_at,
      c.id as uc_id,
      c.type as uc_type,
      c.name as uc_name,
      c.created_by as uc_created_by,
      c.created_at as uc_created_at,
      c.updated_at as uc_updated_at
    FROM conversation_participants cp
    INNER JOIN conversations c ON c.id = cp.conversation_id
    WHERE cp.user_id = p_user_id
      AND (p_include_archived OR cp.is_archived = false)
  ),
  ranked_messages AS (
    -- Get the most recent message for each conversation using window function
    SELECT
      m.id as msg_id,
      m.conversation_id as msg_conversation_id,
      m.content as msg_content,
      m.message_type as msg_message_type,
      m.sender_id as msg_sender_id,
      m.created_at as msg_created_at,
      p.display_name as msg_sender_name,
      ROW_NUMBER() OVER (
        PARTITION BY m.conversation_id
        ORDER BY m.created_at DESC
      ) as rn
    FROM messages m
    LEFT JOIN profiles p ON p.id = m.sender_id
    WHERE m.deletion_state = 'active'
      AND m.conversation_id IN (SELECT uc_id FROM user_conversations)
  ),
  last_messages AS (
    -- Filter to only the most recent message per conversation
    SELECT
      msg_conversation_id,
      jsonb_build_object(
        'id', msg_id,
        'content', msg_content,
        'message_type', msg_message_type,
        'sender_id', msg_sender_id,
        'sender_name', msg_sender_name,
        'created_at', msg_created_at
      ) as message_data
    FROM ranked_messages
    WHERE rn = 1
  ),
  conversation_participants_agg AS (
    -- Aggregate all participants for each conversation into JSON array
    SELECT
      cp.conversation_id as cpa_conversation_id,
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
    WHERE cp.conversation_id IN (SELECT uc_id FROM user_conversations)
    GROUP BY cp.conversation_id
  )
  -- Final join to combine everything
  SELECT
    uc.uc_conversation_id,
    uc.uc_role::TEXT,
    uc.uc_is_muted,
    uc.uc_is_archived,
    uc.uc_unread_count,
    uc.uc_last_read_at,
    uc.uc_id,
    uc.uc_type::TEXT,
    uc.uc_name,
    uc.uc_created_by,
    uc.uc_created_at,
    uc.uc_updated_at,
    lm.message_data as last_message,
    cpa.participants_data as participants
  FROM user_conversations uc
  LEFT JOIN last_messages lm ON lm.msg_conversation_id = uc.uc_id
  LEFT JOIN conversation_participants_agg cpa ON cpa.cpa_conversation_id = uc.uc_id
  ORDER BY uc.uc_updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comments
COMMENT ON FUNCTION get_user_conversations IS 'Optimized function to fetch user conversations with participants and last messages in a single query. Eliminates N+1 pattern (reduces 1+2N queries to 1 query). Fixed ambiguous column references.';
