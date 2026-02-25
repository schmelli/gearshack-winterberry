-- Add missing migration tracking records
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES
  ('20251216', 'add_composite_index_loadout_timestamp', ARRAY[]::text[]),
  ('20251216', 'fix_unique_active_constraint', ARRAY[]::text[]),
  ('20251216', 'wishlist_functions', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

-- Verify all migrations are now recorded
SELECT version, name
FROM supabase_migrations.schema_migrations
WHERE version >= '20251214'
ORDER BY version;
