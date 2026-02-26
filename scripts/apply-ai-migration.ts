#!/usr/bin/env tsx
/**
 * Directly applies the AI Assistant migration to the Supabase database
 * Used when Supabase CLI migration history is out of sync
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function applyMigration() {
  console.log('🔄 Reading migration file...');

  const migrationPath = path.join(
    __dirname,
    '..',
    'supabase',
    'migrations',
    '20251216204932_ai_assistant.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf-8');

  console.log('📝 Migration file loaded, executing SQL...');
  console.log(`   File: ${migrationPath}`);
  console.log(`   Size: ${sql.length} characters`);

  try {
    // Execute the migration SQL
    // Note: Supabase client doesn't directly support raw SQL execution with multiple statements
    // We'll need to use the Postgres connection or split into statements

    // Split SQL into individual statements (simple split by semicolon)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📊 Found ${statements.length} SQL statements to execute`);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const preview = statement.substring(0, 60).replace(/\s+/g, ' ');

      try {
        // Use rpc to execute raw SQL (requires a function on database)
        // Alternative: use supabase.from().select() for queries
        // For DDL statements, we need to use the REST API directly

        const { error } = await supabase.rpc('exec_sql', {
          sql: statement + ';'
        });

        if (error) {
          // If exec_sql function doesn't exist, fall back to alternative method
          if (error.message?.includes('function') && error.message?.includes('does not exist')) {
            console.log(`ℹ️  exec_sql function not available, using direct REST API...`);

            // Use Supabase REST API to execute SQL
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': supabaseKey!,
                'Authorization': `Bearer ${supabaseKey}`,
              },
              body: JSON.stringify({ query: statement + ';' }),
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}: ${await response.text()}`);
            }

            successCount++;
            console.log(`   ✅ [${i + 1}/${statements.length}] ${preview}...`);
          } else {
            throw error;
          }
        } else {
          successCount++;
          console.log(`   ✅ [${i + 1}/${statements.length}] ${preview}...`);
        }
      } catch (err) {
        errorCount++;
        console.error(`   ❌ [${i + 1}/${statements.length}] ${preview}...`);
        console.error(`      Error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    console.log('');
    console.log('📋 Migration Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);

    if (errorCount > 0) {
      console.log('');
      console.log('⚠️  Some statements failed. Check errors above.');
      console.log('   You may need to apply the migration manually via Supabase dashboard.');
      process.exit(1);
    } else {
      console.log('');
      console.log('✅ Migration applied successfully!');
    }
  } catch (error) {
    console.error('❌ Failed to apply migration:');
    console.error(error);
    process.exit(1);
  }
}

applyMigration();
