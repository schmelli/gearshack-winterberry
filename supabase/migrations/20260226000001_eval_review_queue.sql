-- =============================================================================
-- Migration: Eval Review Queue for Synthetic Eval Generation
-- Feature: Synthetic Eval Generation from Production Traces
--
-- Creates the eval_review_queue table where LLM-generated eval candidates
-- are stored for human review before promotion to the test dataset.
-- =============================================================================

-- Enum for review status lifecycle
CREATE TYPE eval_review_status AS ENUM (
  'pending_review',
  'approved',
  'rejected',
  'promoted'
);

-- Enum for trace source type
CREATE TYPE eval_trace_source AS ENUM (
  'otel_span',
  'mastra_scorer',
  'manual'
);

-- =============================================================================
-- Table: eval_review_queue
-- =============================================================================

CREATE TABLE IF NOT EXISTS eval_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- The user input that was traced (becomes the eval "input")
  input TEXT NOT NULL,

  -- Which tools the LLM expects should be called for this input
  expected_tools TEXT[] NOT NULL DEFAULT '{}',

  -- Optional ground truth for scorer validation
  ground_truth JSONB,

  -- LLM's rationale for why this trace is a good eval candidate
  rationale TEXT NOT NULL,

  -- Which eval dataset this should be promoted to
  target_dataset TEXT NOT NULL DEFAULT 'general',

  -- Trace metadata for provenance
  source_trace_id TEXT,
  source_span_id TEXT,
  trace_source eval_trace_source NOT NULL DEFAULT 'otel_span',
  trace_duration_ms INTEGER,
  trace_tool_calls JSONB,
  trace_eval_scores JSONB,

  -- Review lifecycle
  status eval_review_status NOT NULL DEFAULT 'pending_review',
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  reviewer_notes TEXT,

  -- Generation metadata
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  generation_batch_id TEXT,
  generator_model TEXT,

  -- Standard timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================================================
-- Indexes
-- =============================================================================

-- Filter by status (primary query pattern: show pending items)
CREATE INDEX idx_eval_review_queue_status ON eval_review_queue(status);

-- Filter by generation batch for batch operations
CREATE INDEX idx_eval_review_queue_batch ON eval_review_queue(generation_batch_id);

-- Filter by target dataset for promotion queries
CREATE INDEX idx_eval_review_queue_dataset ON eval_review_queue(target_dataset, status);

-- Sort by generation time for chronological review
CREATE INDEX idx_eval_review_queue_generated_at ON eval_review_queue(generated_at DESC);

-- =============================================================================
-- RLS Policies
-- =============================================================================

ALTER TABLE eval_review_queue ENABLE ROW LEVEL SECURITY;

-- Service role can do everything (scripts use service role key)
CREATE POLICY "service_role_full_access" ON eval_review_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Authenticated users can view pending and approved items
CREATE POLICY "authenticated_read" ON eval_review_queue
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can update review status (via service role in scripts)
-- Regular authenticated users are read-only

-- =============================================================================
-- Updated_at trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_eval_review_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER eval_review_queue_updated_at
  BEFORE UPDATE ON eval_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_eval_review_queue_updated_at();

-- =============================================================================
-- Table: eval_generation_runs (audit log for generation runs)
-- =============================================================================

CREATE TABLE IF NOT EXISTS eval_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  traces_scanned INTEGER NOT NULL DEFAULT 0,
  candidates_generated INTEGER NOT NULL DEFAULT 0,
  generator_model TEXT NOT NULL,
  lookback_days INTEGER NOT NULL DEFAULT 7,
  filters JSONB,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE eval_generation_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_full_access_runs" ON eval_generation_runs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "authenticated_read_runs" ON eval_generation_runs
  FOR SELECT
  TO authenticated
  USING (true);

-- =============================================================================
-- Helper: Get pending review count
-- =============================================================================

CREATE OR REPLACE FUNCTION get_eval_review_stats()
RETURNS JSON AS $$
  SELECT json_build_object(
    'pending', COUNT(*) FILTER (WHERE status = 'pending_review'),
    'approved', COUNT(*) FILTER (WHERE status = 'approved'),
    'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
    'promoted', COUNT(*) FILTER (WHERE status = 'promoted'),
    'total', COUNT(*)
  )
  FROM eval_review_queue;
$$ LANGUAGE sql STABLE;
