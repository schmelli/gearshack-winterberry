-- Feature 050: AI Assistant - Action Results Persistence
-- Issue #60: Persist action execution results to prevent data loss on page reload
-- Adds action_results column to ai_messages table to store execution status and results

-- Add action_results column to ai_messages table
-- Structure: { "action_id": { "status": "completed|failed", "executed_at": "ISO timestamp", "result": {...}, "error": "..." } }
ALTER TABLE ai_messages
ADD COLUMN action_results jsonb DEFAULT NULL;

-- Add index for querying messages with action results
CREATE INDEX ai_messages_action_results_idx
  ON ai_messages USING gin(action_results)
  WHERE action_results IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN ai_messages.action_results IS 'Stores execution results for AI-suggested actions. Format: { "action_id": { "status": "completed|failed", "executed_at": "ISO timestamp", "result": {...}, "error": "..." } }';
