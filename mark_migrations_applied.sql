-- Mark all old migrations as applied in the tracking table
-- This prevents re-running migrations that were applied manually

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

SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
