/**
 * Migration Script: user_working_memory → mastra_resources
 *
 * Moves existing user working memory profiles from the custom
 * user_working_memory Supabase table into Mastra's native
 * mastra_resources table (column: workingMemory TEXT).
 *
 * Safe to re-run — uses upsert semantics (MemoryPG.updateResource).
 *
 * Prerequisites:
 * - DATABASE_URL in .env.local (direct PostgreSQL connection string)
 * - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local
 *
 * Usage:
 *   npm run migrate:working-memory
 */

import { config } from 'dotenv';
config({ path: '.env.local' });
config(); // fallback: .env
import { MemoryPG } from '@mastra/pg';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Config
// =============================================================================

const DATABASE_URL = process.env.DATABASE_URL;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is required in .env.local');
  process.exit(1);
}
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required in .env.local');
  process.exit(1);
}

// =============================================================================
// Migration
// =============================================================================

async function migrate() {
  console.log('=== Working Memory Migration: user_working_memory → mastra_resources ===\n');

  // Source: Supabase user_working_memory table
  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

  const { data: rows, error } = await supabase
    .from('user_working_memory')
    .select('user_id, profile');

  if (error) {
    throw new Error(`Failed to read user_working_memory: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    console.log('No users found in user_working_memory. Nothing to migrate.');
    return;
  }

  console.log(`Found ${rows.length} user(s) to migrate.\n`);

  // Target: Mastra MemoryPG (mastra_resources table)
  const store = new MemoryPG({
    connectionString: DATABASE_URL!,
  });

  // Ensure mastra_resources table exists
  await store.init();

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      // updateResource creates the resource if it doesn't exist,
      // or updates workingMemory if it already exists — idempotent.
      await store.updateResource({
        resourceId: row.user_id,
        workingMemory: JSON.stringify(row.profile),
      });

      console.log(`  ✓ Migrated user ${row.user_id}`);
      migrated++;
    } catch (err) {
      console.error(`  ✗ Failed user ${row.user_id}:`, err instanceof Error ? err.message : err);
      failed++;
    }
  }

  console.log(`\n=== Done: ${migrated} migrated, ${failed} failed ===`);

  if (failed > 0) {
    console.error('\nSome users failed to migrate. Check errors above.');
    process.exit(1);
  }
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
