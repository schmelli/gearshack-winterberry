-- Migration: Exclude VIP service accounts from user search
-- Date: 2026-01-02
-- Description: Update search_users_with_block_status RPC to filter out VIP accounts
--              VIPs are service accounts (like influencer profiles) that shouldn't
--              appear in friend search or messaging user search.

-- ============================================================================
-- Update User Search Function
-- ============================================================================

CREATE OR REPLACE FUNCTION search_users_with_block_status(
  p_query TEXT,
  p_current_user_id UUID,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  display_name TEXT,
  avatar_url TEXT,
  can_message BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    COALESCE(p.display_name, 'Unknown') as display_name,
    p.avatar_url,
    -- User can message if NOT blocked (in either direction) AND privacy allows
    (
      NOT EXISTS (
        SELECT 1 FROM user_blocks ub
        WHERE (ub.user_id = p_current_user_id AND ub.blocked_id = p.id)
           OR (ub.user_id = p.id AND ub.blocked_id = p_current_user_id)
      )
      AND p.messaging_privacy != 'nobody'
    ) as can_message
  FROM profiles p
  WHERE p.discoverable = true
    AND p.id != p_current_user_id
    AND p.account_type != 'vip'  -- Exclude VIP service accounts from user search
    -- Escape ILIKE wildcards (%, _) in user input to prevent injection
    AND p.display_name ILIKE '%' || REPLACE(REPLACE(p_query, '%', '\%'), '_', '\_') || '%'
  ORDER BY p.display_name ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update comment
COMMENT ON FUNCTION search_users_with_block_status IS 'Optimized function to search users and check block status in a single query. Eliminates N+1 pattern (reduces 1+N queries to 1 query). Checks bidirectional blocks and messaging privacy. Excludes VIP service accounts from search results.';
