-- Migration: Add automatic cache cleanup for expired entries
-- Feature: 057-wishlist-pricing-enhancements
-- Purpose: Prevent indefinite growth of cache tables

-- =============================================================================
-- Cache Cleanup Function
-- =============================================================================

CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS INTEGER AS $$
DECLARE
  deleted_ebay INTEGER;
  deleted_reseller INTEGER;
  total_deleted INTEGER;
BEGIN
  -- Delete expired eBay price cache entries
  DELETE FROM ebay_price_cache WHERE expires_at < now();
  GET DIAGNOSTICS deleted_ebay = ROW_COUNT;

  -- Delete expired reseller price results
  DELETE FROM reseller_price_results WHERE expires_at < now();
  GET DIAGNOSTICS deleted_reseller = ROW_COUNT;

  total_deleted := deleted_ebay + deleted_reseller;

  -- Log the cleanup (optional, can be removed if logging is not needed)
  RAISE NOTICE 'Cache cleanup: Deleted % eBay entries, % reseller entries (total: %)',
    deleted_ebay, deleted_reseller, total_deleted;

  RETURN total_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Schedule Cleanup (using pg_cron if available)
-- =============================================================================

-- Note: This requires pg_cron extension. If not available, the function
-- can be called manually or via application-layer scheduling.

DO $$
BEGIN
  -- Check if pg_cron extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) THEN
    -- Schedule cleanup to run every 6 hours
    PERFORM cron.schedule(
      'cleanup-price-cache',
      '0 */6 * * *',  -- At minute 0 past every 6th hour
      'SELECT cleanup_expired_cache();'
    );
  ELSE
    RAISE NOTICE 'pg_cron extension not available. Cache cleanup function created but not scheduled.';
    RAISE NOTICE 'Call cleanup_expired_cache() manually or schedule via application layer.';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Could not schedule cache cleanup: %. Function still available for manual calls.', SQLERRM;
END$$;

-- =============================================================================
-- Grant Execute Permission
-- =============================================================================

-- Allow service role to call the cleanup function
GRANT EXECUTE ON FUNCTION cleanup_expired_cache() TO service_role;

-- =============================================================================
-- Documentation
-- =============================================================================

COMMENT ON FUNCTION cleanup_expired_cache() IS
  'Deletes expired cache entries from ebay_price_cache and reseller_price_results tables. ' ||
  'Returns the total number of deleted rows. ' ||
  'Scheduled to run every 6 hours if pg_cron is available.';
