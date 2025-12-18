-- Add action_results column to ai_messages table
-- This column tracks the execution status and results of AI tool calls

ALTER TABLE ai_messages
ADD COLUMN IF NOT EXISTS action_results jsonb;

COMMENT ON COLUMN ai_messages.action_results IS
  'Stores execution results for AI tool calls/actions. Format: { [actionId]: { status, executed_at, result?, error? } }';
