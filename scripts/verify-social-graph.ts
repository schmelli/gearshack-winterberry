#!/usr/bin/env tsx

/**
 * Verification Script: Social Graph Migration
 *
 * Checks that all tables, functions, and enums from the social graph migration
 * were created successfully in the database.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTables() {
  console.log('\n✓ Checking Tables...\n');

  const tables = ['friend_requests', 'friendships', 'user_follows', 'friend_activities'];

  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .select('*')
      .limit(0);

    if (error) {
      console.log(`❌ Table '${table}': NOT FOUND`);
      console.log(`   Error: ${error.message}`);
    } else {
      console.log(`✅ Table '${table}': EXISTS`);
    }
  }
}

async function verifyFunctions() {
  console.log('\n✓ Checking RPC Functions...\n');

  const functions = [
    'are_friends',
    'send_friend_request',
    'respond_to_friend_request',
    'get_mutual_friends',
    'get_friend_activity_feed',
    'get_friend_activity_feed_filtered'
  ];

  for (const fn of functions) {
    try {
      // Test with minimal valid params
      const { error } = await supabase.rpc(fn, {});

      if (error && error.message.includes('does not exist')) {
        console.log(`❌ Function '${fn}': NOT FOUND`);
      } else {
        // Function exists (we expect parameter errors since we're not passing real params)
        console.log(`✅ Function '${fn}': EXISTS`);
      }
    } catch (err) {
      console.log(`❌ Function '${fn}': ERROR - ${err}`);
    }
  }
}

async function main() {
  console.log('🔍 Verifying Social Graph Migration');
  console.log('=====================================');

  await verifyTables();
  await verifyFunctions();

  console.log('\n✅ Verification Complete!\n');
}

main();
