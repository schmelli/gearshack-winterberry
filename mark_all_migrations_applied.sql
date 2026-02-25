-- ============================================================================
-- Mark All Migrations as Applied
-- ============================================================================
-- Run this AFTER successfully executing APPLY_MIGRATIONS_COMPLETE.sql
-- This updates the migration tracking table so Supabase knows these
-- migrations have been applied.
-- ============================================================================

-- Mark all old migrations as applied (to prevent conflicts)
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20251210', 'initial_schema', ARRAY[]::text[]),
  ('20251211', 'catalog_public_read', ARRAY[]::text[]),
  ('20251211', 'categories_i18n', ARRAY[]::text[]),
  ('20251211', 'gear_favourite', ARRAY[]::text[]),
  ('20251211', 'gear_marketplace_flags', ARRAY[]::text[]),
  ('20251211', 'profile_bio_social', ARRAY[]::text[]),
  ('20251211', 'profile_location', ARRAY[]::text[]),
  ('20251211', 'search_brands_fuzzy', ARRAY[]::text[]),
  ('20251212', 'loadout_sharing', ARRAY[]::text[]),
  ('20251212', 'marketplace_columns', ARRAY[]::text[]),
  ('20251212', 'messaging_realtime', ARRAY[]::text[]),
  ('20251214', 'add_source_share_token', ARRAY[]::text[]),
  ('20251214', 'comment_notification_trigger', ARRAY[]::text[]),
  ('20251214', 'create_notifications_table', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- Mark the new migrations we just applied
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20251214235203', 'add_loadout_image_generation', ARRAY[]::text[]),
  ('20251216', 'add_active_image_trigger', ARRAY[]::text[]),
  ('20251216', 'add_composite_index_loadout_timestamp', ARRAY[]::text[]),
  ('20251216', 'fix_unique_active_constraint', ARRAY[]::text[]),
  ('20251216', 'wishlist_functions', ARRAY[]::text[]),
  ('20251216120000', 'fix_loadout_images_security', ARRAY[]::text[]),
  ('20251216204932', 'ai_assistant', ARRAY[]::text[]),
  ('20251216205703', 'add_subscription_tier', ARRAY[]::text[]),
  ('20251217000001', 'fix_rate_limit_race_condition', ARRAY[]::text[]),
  ('20251217000002', 'atomic_cache_increment', ARRAY[]::text[]),
  ('20251217075019', 'fix_notification_trigger', ARRAY[]::text[]),
  ('20251217080049', 'increment_ai_rate_limit', ARRAY[]::text[]),
  ('20251217102228', 'fix_rate_limits_primary_key', ARRAY[]::text[]),
  ('20251217102314', 'add_rate_limit_cleanup', ARRAY[]::text[]),
  ('20251217103447', 'drop_standalone_increment_function', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- Verify all migrations are recorded
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version >= '20251210'
ORDER BY version;
