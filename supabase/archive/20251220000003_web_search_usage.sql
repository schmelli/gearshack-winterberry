-- Migration: Create web_search_usage table for cost tracking
-- Feature: Agentic AI Assistant System
-- Date: 2025-12-20
-- Purpose: Track web search API usage, costs, and quotas per user

-- ==================== web_search_usage Table ====================

CREATE TABLE web_search_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES ai_conversations(id) ON DELETE SET NULL,

  -- Search details
  search_query TEXT NOT NULL,
  search_type VARCHAR(50) NOT NULL CHECK (
    search_type IN ('general', 'news', 'reviews', 'conditions', 'products', 'local_shops', 'images')
  ),

  -- Cost tracking
  cost_usd DECIMAL(10, 6) NOT NULL DEFAULT 0.000000,

  -- Cache status
  cached BOOLEAN NOT NULL DEFAULT false,

  -- Performance metrics
  latency_ms INTEGER,
  results_count INTEGER,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==================== Indexes ====================

-- Index for user usage lookups (for quota checks)
CREATE INDEX idx_web_search_usage_user
  ON web_search_usage(user_id, created_at DESC);

-- Index for conversation-based lookups
CREATE INDEX idx_web_search_usage_conversation
  ON web_search_usage(conversation_id)
  WHERE conversation_id IS NOT NULL;

-- Index for cost analysis by date range
CREATE INDEX idx_web_search_usage_cost_analysis
  ON web_search_usage(created_at, cost_usd);

-- Index for cache hit rate analysis
CREATE INDEX idx_web_search_usage_cache_analysis
  ON web_search_usage(cached, created_at);

-- ==================== Row Level Security ====================

ALTER TABLE web_search_usage ENABLE ROW LEVEL SECURITY;

-- Users can view their own usage
CREATE POLICY web_search_usage_select ON web_search_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Users can insert their own usage records
CREATE POLICY web_search_usage_insert ON web_search_usage
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Service role has full access (for admin dashboards and background jobs)
CREATE POLICY web_search_usage_service ON web_search_usage
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ==================== Helper Functions ====================

-- Function to get user's daily search usage count and cost
CREATE OR REPLACE FUNCTION get_user_daily_search_usage(p_user_id UUID)
RETURNS TABLE (
  search_count INTEGER,
  total_cost_usd DECIMAL(10, 6),
  cached_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(cost_usd), 0::DECIMAL(10, 6)),
    COUNT(*) FILTER (WHERE cached = true)::INTEGER
  FROM web_search_usage
  WHERE user_id = p_user_id
    AND created_at >= DATE_TRUNC('day', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has exceeded daily quota
CREATE OR REPLACE FUNCTION check_web_search_quota(
  p_user_id UUID,
  p_daily_limit INTEGER DEFAULT 50
) RETURNS JSONB AS $$
DECLARE
  v_usage RECORD;
  v_exceeded BOOLEAN;
BEGIN
  SELECT * INTO v_usage FROM get_user_daily_search_usage(p_user_id);

  v_exceeded := v_usage.search_count >= p_daily_limit;

  RETURN jsonb_build_object(
    'exceeded', v_exceeded,
    'count', v_usage.search_count,
    'limit', p_daily_limit,
    'total_cost_usd', v_usage.total_cost_usd,
    'cached_count', v_usage.cached_count,
    'resets_at', DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== Usage Analytics View ====================

-- View for aggregated usage statistics (admin use)
CREATE OR REPLACE VIEW web_search_usage_stats AS
SELECT
  DATE_TRUNC('day', created_at) AS date,
  COUNT(*) AS total_searches,
  COUNT(DISTINCT user_id) AS unique_users,
  SUM(cost_usd) AS total_cost_usd,
  AVG(latency_ms)::INTEGER AS avg_latency_ms,
  COUNT(*) FILTER (WHERE cached = true) AS cached_hits,
  ROUND(100.0 * COUNT(*) FILTER (WHERE cached = true) / NULLIF(COUNT(*), 0), 2) AS cache_hit_rate_pct
FROM web_search_usage
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;
