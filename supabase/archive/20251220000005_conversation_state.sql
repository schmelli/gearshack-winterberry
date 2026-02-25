-- Migration: Add conversation_state column to ai_conversations
-- Feature: Agentic AI Assistant System
-- Date: 2025-12-20
-- Purpose: Track conversation context state across turns for multi-turn reasoning

-- ==================== Add conversation_state Column ====================

ALTER TABLE ai_conversations
ADD COLUMN IF NOT EXISTS conversation_state JSONB;

COMMENT ON COLUMN ai_conversations.conversation_state IS
  'Tracks context state across turns. Format: { current_topic, entities, preferences, pending_actions, memory_anchors }';

-- ==================== Indexes ====================

-- GIN index on conversation_state for efficient JSONB queries
-- Enables fast lookups like: WHERE conversation_state @> '{"current_topic": "gear_recommendation"}'
CREATE INDEX IF NOT EXISTS idx_ai_conversations_state
  ON ai_conversations USING GIN (conversation_state);

-- ==================== Helper Functions ====================

-- Function to update conversation state atomically
CREATE OR REPLACE FUNCTION update_conversation_state(
  p_conversation_id UUID,
  p_state_update JSONB
) RETURNS JSONB AS $$
DECLARE
  v_new_state JSONB;
BEGIN
  -- Merge the update with existing state (update wins on conflicts)
  UPDATE ai_conversations
  SET
    conversation_state = COALESCE(conversation_state, '{}'::JSONB) || p_state_update,
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = auth.uid()  -- Enforce RLS in function
  RETURNING conversation_state INTO v_new_state;

  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get conversation state with defaults
CREATE OR REPLACE FUNCTION get_conversation_state(p_conversation_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_state JSONB;
BEGIN
  SELECT conversation_state INTO v_state
  FROM ai_conversations
  WHERE id = p_conversation_id
    AND user_id = auth.uid();  -- Enforce RLS in function

  -- Return state with defaults if empty
  RETURN COALESCE(v_state, jsonb_build_object(
    'current_topic', NULL,
    'entities', '[]'::JSONB,
    'preferences', '{}'::JSONB,
    'pending_actions', '[]'::JSONB,
    'memory_anchors', '[]'::JSONB,
    'turn_count', 0
  ));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to clear conversation state (start fresh)
CREATE OR REPLACE FUNCTION clear_conversation_state(p_conversation_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE ai_conversations
  SET
    conversation_state = NULL,
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = auth.uid();

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment turn count in state
CREATE OR REPLACE FUNCTION increment_conversation_turn(p_conversation_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_turn_count INTEGER;
BEGIN
  UPDATE ai_conversations
  SET
    conversation_state = jsonb_set(
      COALESCE(conversation_state, '{}'::JSONB),
      '{turn_count}',
      to_jsonb(COALESCE((conversation_state->>'turn_count')::INTEGER, 0) + 1)
    ),
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = auth.uid()
  RETURNING (conversation_state->>'turn_count')::INTEGER INTO v_turn_count;

  RETURN COALESCE(v_turn_count, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== State Management Utilities ====================

-- Function to add entity to conversation state
CREATE OR REPLACE FUNCTION add_conversation_entity(
  p_conversation_id UUID,
  p_entity_type TEXT,
  p_entity_id TEXT,
  p_entity_name TEXT
) RETURNS JSONB AS $$
DECLARE
  v_entity JSONB;
  v_new_state JSONB;
BEGIN
  v_entity := jsonb_build_object(
    'type', p_entity_type,
    'id', p_entity_id,
    'name', p_entity_name,
    'added_at', NOW()
  );

  UPDATE ai_conversations
  SET
    conversation_state = jsonb_set(
      COALESCE(conversation_state, '{"entities": []}'::JSONB),
      '{entities}',
      COALESCE(conversation_state->'entities', '[]'::JSONB) || v_entity
    ),
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = auth.uid()
  RETURNING conversation_state INTO v_new_state;

  RETURN v_new_state;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to add pending action to conversation state
CREATE OR REPLACE FUNCTION add_pending_action(
  p_conversation_id UUID,
  p_action_type TEXT,
  p_action_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
  v_action JSONB;
BEGIN
  v_action_id := gen_random_uuid();
  v_action := jsonb_build_object(
    'id', v_action_id,
    'type', p_action_type,
    'data', p_action_data,
    'status', 'pending',
    'created_at', NOW()
  );

  UPDATE ai_conversations
  SET
    conversation_state = jsonb_set(
      COALESCE(conversation_state, '{"pending_actions": []}'::JSONB),
      '{pending_actions}',
      COALESCE(conversation_state->'pending_actions', '[]'::JSONB) || v_action
    ),
    updated_at = NOW()
  WHERE id = p_conversation_id
    AND user_id = auth.uid();

  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
