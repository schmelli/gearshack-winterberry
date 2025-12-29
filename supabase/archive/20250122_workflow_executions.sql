-- Migration: Workflow Executions for Mastra Agentic Voice AI
-- Feature: 001-mastra-agentic-voice
-- Created: 2025-01-22
-- Description: Creates the workflow_executions table for tracking multi-step workflows (trip planning, etc.)

-- ==================== TABLE CREATION ====================

CREATE TABLE IF NOT EXISTS workflow_executions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign keys
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Workflow metadata
  workflow_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout')),

  -- Execution state
  current_step TEXT,
  step_results JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,

  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

-- ==================== INDEXES ====================

-- Performance index for user/status queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_user_status
  ON workflow_executions(user_id, status, started_at DESC);

-- Performance index for workflow name queries
CREATE INDEX IF NOT EXISTS idx_workflow_executions_name
  ON workflow_executions(workflow_name, started_at DESC);

-- ==================== ROW LEVEL SECURITY ====================

-- Enable RLS to ensure multi-tenancy
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own workflow executions
CREATE POLICY "Users can only access own workflows"
  ON workflow_executions
  FOR ALL
  USING (auth.uid() = user_id);

-- Policy: Service role has full access
CREATE POLICY "Service role full access"
  ON workflow_executions
  FOR ALL
  TO service_role
  USING (true);

-- ==================== TRIGGERS ====================

-- Trigger: Auto-calculate duration when workflow completes
CREATE OR REPLACE FUNCTION calculate_workflow_duration()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    NEW.duration_ms := EXTRACT(EPOCH FROM (NEW.completed_at - NEW.started_at))::INTEGER * 1000;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_workflow_duration
  BEFORE UPDATE ON workflow_executions
  FOR EACH ROW
  EXECUTE FUNCTION calculate_workflow_duration();

-- ==================== COMMENTS ====================

COMMENT ON TABLE workflow_executions IS 'Tracks multi-step workflow execution for trip planning and complex reasoning';
COMMENT ON COLUMN workflow_executions.status IS 'Workflow state: pending, running, completed, failed, timeout';
COMMENT ON COLUMN workflow_executions.step_results IS 'JSONB field storing results from each workflow step';
COMMENT ON COLUMN workflow_executions.duration_ms IS 'Total workflow execution time in milliseconds';
