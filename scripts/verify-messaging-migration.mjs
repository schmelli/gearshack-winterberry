#!/usr/bin/env node
/**
 * Verify Messaging Migration
 *
 * Checks that the messaging RPC functions were created successfully.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔍 Verifying messaging migration...\n');

// Test the get_user_conversations function with a dummy UUID
const testUserId = '00000000-0000-0000-0000-000000000000';

try {
  const { data, error } = await supabase.rpc('get_user_conversations', {
    p_user_id: testUserId,
    p_include_archived: false
  });

  if (error) {
    console.log('❌ get_user_conversations function not found or error:');
    console.log('   ', error.message);
    process.exit(1);
  }

  console.log('✅ get_user_conversations function exists and works!');
  console.log(`   Returned: ${Array.isArray(data) ? data.length : 0} conversations (expected 0 for test user)`);
  console.log('');

  // Test search function
  const { data: searchData, error: searchError } = await supabase.rpc('search_users_with_block_status', {
    p_query: 'test',
    p_current_user_id: testUserId,
    p_limit: 5
  });

  if (searchError) {
    console.log('❌ search_users_with_block_status function not found or error:');
    console.log('   ', searchError.message);
    process.exit(1);
  }

  console.log('✅ search_users_with_block_status function exists and works!');
  console.log(`   Returned: ${Array.isArray(searchData) ? searchData.length : 0} users`);
  console.log('');
  console.log('🎉 Migration successfully applied!');
  console.log('');
  console.log('✨ The messaging system is now ready to use!');

} catch (err) {
  console.error('❌ Unexpected error:', err.message);
  process.exit(1);
}
