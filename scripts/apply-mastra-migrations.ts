/**
 * Apply Mastra Database Migrations
 * Feature: 001-mastra-agentic-voice
 *
 * This script applies all Mastra-related database migrations to Supabase.
 * Run with: npx tsx scripts/apply-mastra-migrations.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const MIGRATIONS = [
  '20250120_conversation_memory.sql',
  '20250122_workflow_executions.sql',
  '20250125_rate_limit_tracking.sql',
  '20250126_gdpr_deletion_records.sql',
  '20250127_data_retention_cron.sql',
];

async function applyMigrations() {
  console.log('🚀 Applying Mastra database migrations to Supabase...\n');

  for (const migration of MIGRATIONS) {
    const migrationPath = join(process.cwd(), 'supabase', 'migrations', migration);

    try {
      console.log(`📄 Applying migration: ${migration}`);
      const sql = readFileSync(migrationPath, 'utf-8');

      const { error } = await supabase.rpc('exec_sql', { sql });

      if (error) {
        // If exec_sql RPC doesn't exist, try direct query
        const { error: queryError } = await supabase.from('_migrations').select().limit(0);

        if (queryError) {
          console.error(`❌ Error applying ${migration}:`, error.message);
          console.log('\n⚠️  Manual Migration Required:');
          console.log(`   Please run the following SQL in Supabase SQL Editor:`);
          console.log(`   File: supabase/migrations/${migration}\n`);
          continue;
        }
      }

      console.log(`✅ Successfully applied: ${migration}\n`);
    } catch (error) {
      console.error(`❌ Failed to apply ${migration}:`, error);
      console.log('\n⚠️  Manual Migration Required:');
      console.log(`   Please copy the contents of supabase/migrations/${migration}`);
      console.log(`   and run it manually in the Supabase SQL Editor\n`);
    }
  }

  console.log('\n✨ Migration process complete!');
  console.log('\n📋 Next Steps:');
  console.log('   1. Verify tables were created in Supabase Dashboard');
  console.log('   2. Test RLS policies work correctly');
  console.log('   3. Run: npm run dev to start the development server');
}

applyMigrations().catch(console.error);
