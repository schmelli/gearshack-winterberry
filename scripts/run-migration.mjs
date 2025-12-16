#!/usr/bin/env node
/**
 * Apply AI Assistant migration via Supabase SQL Editor API
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

// Extract project ref from URL
const projectRef = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

if (!projectRef) {
  console.error('❌ Could not extract project ref from URL');
  process.exit(1);
}

// Read migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '20251216204932_ai_assistant.sql');
const sql = readFileSync(migrationPath, 'utf-8');

console.log('🔄 Applying AI Assistant migration...');
console.log(`   Project: ${projectRef}`);
console.log(`   File: 20251216204932_ai_assistant.sql`);
console.log(`   Size: ${sql.length} characters`);
console.log('');

// Use Supabase SQL Editor API
const apiUrl = `${SUPABASE_URL}/rest/v1/rpc/exec_sql`;

try {
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`❌ HTTP ${response.status}: ${errorText}`);
    console.log('');
    console.log('⚠️  The exec_sql function may not exist. Trying alternative method...');
    console.log('');
    console.log('📋 Please apply this migration manually:');
    console.log('   1. Go to https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
    console.log('   2. Copy the contents of: supabase/migrations/20251216204932_ai_assistant.sql');
    console.log('   3. Paste and run the SQL');
    console.log('');
    console.log('✅ Then mark this migration as applied locally with:');
    console.log('   npx supabase migration repair --status applied 20251216204932');
    process.exit(1);
  }

  const result = await response.json();
  console.log('✅ Migration applied successfully!');
  console.log('');
  console.log('📊 Result:', JSON.stringify(result, null, 2));
  console.log('');
  console.log('✅ To sync local migration history, run:');
  console.log('   npx supabase migration repair --status applied 20251216204932');

} catch (error) {
  console.error('❌ Error applying migration:', error.message);
  console.log('');
  console.log('📋 Fallback: Apply migration manually via Supabase Dashboard');
  console.log('   URL: https://supabase.com/dashboard/project/' + projectRef + '/sql/new');
  process.exit(1);
}
