-- Add atomic cache usage increment function
-- Prevents race conditions when multiple requests hit same cached response

CREATE OR REPLACE FUNCTION increment_cache_usage(
  p_cache_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE ai_cached_responses
  SET
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE id = p_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION increment_cache_usage(uuid) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION increment_cache_usage IS 'Atomically increment usage count for cached AI responses';
