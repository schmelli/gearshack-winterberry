-- Migration: Add tool orchestration columns to ai_messages
-- Feature: Agentic AI Assistant System
-- Date: 2025-12-20
-- Purpose: Add columns to track tool execution, reasoning traces, and orchestration metadata

-- ==================== Tool Orchestration Columns ====================

-- Add tool_calls column to track executed tools
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS tool_calls JSONB;

COMMENT ON COLUMN ai_messages.tool_calls IS
  'Tracks executed tools. Format: [{ tool_name, args, call_id, status, result?, error? }]';

-- Add reasoning_trace column for AI decision-making steps
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS reasoning_trace JSONB;

COMMENT ON COLUMN ai_messages.reasoning_trace IS
  'AI decision-making steps. Format: [{ step, reasoning, action, timestamp }]';

-- Add orchestration_metadata column for execution metadata
ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS orchestration_metadata JSONB;

COMMENT ON COLUMN ai_messages.orchestration_metadata IS
  'Execution metadata. Format: { model, temperature, max_tokens, latency_ms, retry_count, total_tool_calls }';

-- ==================== Indexes ====================

-- GIN index on tool_calls for efficient JSONB queries
-- Enables fast lookups like: WHERE tool_calls @> '[{"tool_name": "web_search"}]'
CREATE INDEX IF NOT EXISTS idx_ai_messages_tool_calls
  ON ai_messages USING GIN (tool_calls);

-- GIN index on orchestration_metadata for filtering by model or execution stats
CREATE INDEX IF NOT EXISTS idx_ai_messages_orchestration_metadata
  ON ai_messages USING GIN (orchestration_metadata);
