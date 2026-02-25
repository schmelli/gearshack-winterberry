-- Migration: Create ai_tool_execution_logs table for observability
-- Feature: Agentic AI Assistant System
-- Date: 2025-12-20
-- Purpose: Track all AI tool executions for debugging, analytics, and auditing

-- ==================== ai_tool_execution_logs Table ====================

CREATE TABLE ai_tool_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES ai_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Tool identification
  tool_name VARCHAR(100) NOT NULL,
  tool_args JSONB,

  -- Execution results
  tool_result JSONB,
  success BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,

  -- Performance metrics
  execution_time_ms INTEGER,
  retry_count INTEGER NOT NULL DEFAULT 0,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== Indexes ====================

-- Index for message-based lookups (get all tools for a message)
CREATE INDEX idx_tool_logs_message
  ON ai_tool_execution_logs(message_id)
  WHERE message_id IS NOT NULL;

-- Index for user-based lookups and audit trails
CREATE INDEX idx_tool_logs_user
  ON ai_tool_execution_logs(user_id, created_at DESC);

-- Index for tool-specific analytics
CREATE INDEX idx_tool_logs_tool_name
  ON ai_tool_execution_logs(tool_name, created_at DESC);

-- Index for failure analysis
CREATE INDEX idx_tool_logs_failures
  ON ai_tool_execution_logs(tool_name, created_at DESC)
  WHERE success = false;

-- Index for performance analysis
CREATE INDEX idx_tool_logs_performance
  ON ai_tool_execution_logs(tool_name, execution_time_ms)
  WHERE execution_time_ms IS NOT NULL;

-- GIN index on tool_args for filtering by specific arguments
CREATE INDEX idx_tool_logs_args
  ON ai_tool_execution_logs USING GIN (tool_args);

-- ==================== Row Level Security ====================

ALTER TABLE ai_tool_execution_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own tool execution logs
CREATE POLICY tool_logs_select ON ai_tool_execution_logs
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own execution logs
CREATE POLICY tool_logs_insert ON ai_tool_execution_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role has full access (for admin dashboards and cleanup jobs)
CREATE POLICY tool_logs_service ON ai_tool_execution_logs
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== Helper Functions ====================

-- Function to log tool execution
CREATE OR REPLACE FUNCTION log_tool_execution(
  p_message_id UUID,
  p_user_id UUID,
  p_tool_name VARCHAR(100),
  p_tool_args JSONB,
  p_tool_result JSONB,
  p_success BOOLEAN,
  p_error_message TEXT DEFAULT NULL,
  p_execution_time_ms INTEGER DEFAULT NULL,
  p_retry_count INTEGER DEFAULT 0
) RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO ai_tool_execution_logs (
    message_id,
    user_id,
    tool_name,
    tool_args,
    tool_result,
    success,
    error_message,
    execution_time_ms,
    retry_count
  ) VALUES (
    p_message_id,
    p_user_id,
    p_tool_name,
    p_tool_args,
    p_tool_result,
    p_success,
    p_error_message,
    p_execution_time_ms,
    p_retry_count
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get tool execution stats for a user
CREATE OR REPLACE FUNCTION get_user_tool_stats(
  p_user_id UUID,
  p_days INTEGER DEFAULT 7
) RETURNS TABLE (
  tool_name VARCHAR(100),
  total_calls INTEGER,
  success_count INTEGER,
  failure_count INTEGER,
  avg_execution_time_ms INTEGER,
  total_retries INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    tel.tool_name,
    COUNT(*)::INTEGER,
    COUNT(*) FILTER (WHERE tel.success = true)::INTEGER,
    COUNT(*) FILTER (WHERE tel.success = false)::INTEGER,
    AVG(tel.execution_time_ms)::INTEGER,
    SUM(tel.retry_count)::INTEGER
  FROM ai_tool_execution_logs tel
  WHERE tel.user_id = p_user_id
    AND tel.created_at >= NOW() - (p_days || ' days')::INTERVAL
  GROUP BY tel.tool_name
  ORDER BY COUNT(*) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== Analytics View ====================

-- View for aggregated tool execution statistics (admin use)
CREATE OR REPLACE VIEW tool_execution_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  tool_name,
  COUNT(*) AS total_executions,
  COUNT(*) FILTER (WHERE success = true) AS successful,
  COUNT(*) FILTER (WHERE success = false) AS failed,
  ROUND(100.0 * COUNT(*) FILTER (WHERE success = true) / NULLIF(COUNT(*), 0), 2) AS success_rate_pct,
  AVG(execution_time_ms)::INTEGER AS avg_execution_ms,
  MAX(execution_time_ms) AS max_execution_ms,
  SUM(retry_count) AS total_retries
FROM ai_tool_execution_logs
GROUP BY DATE_TRUNC('day', created_at), tool_name
ORDER BY date DESC, total_executions DESC;

-- ==================== Cleanup Function ====================

-- Function to purge old tool execution logs (30-day retention by default)
CREATE OR REPLACE FUNCTION purge_old_tool_logs(p_retention_days INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM ai_tool_execution_logs
  WHERE created_at < NOW() - (p_retention_days || ' days')::INTERVAL;

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
