/**
 * Test script to verify loadout_shares table and RLS policies
 *
 * Usage: npx tsx scripts/test-share-creation.ts
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testShareCreation() {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  console.log('Testing loadout_shares table...\n');

  // 1. Check if table exists
  console.log('1. Checking if loadout_shares table exists...');
  const { data: tables, error: tablesError } = await supabase
    .from('loadout_shares')
    .select('count')
    .limit(1);

  if (tablesError) {
    console.error('❌ Table check failed:', tablesError.message);
    return;
  }
  console.log('✅ Table exists\n');

  // 2. Try to read existing shares (should work with public read policy)
  console.log('2. Testing public read access...');
  const { data: existingShares, error: readError } = await supabase
    .from('loadout_shares')
    .select('share_token, loadout_id, owner_id, created_at')
    .limit(5);

  if (readError) {
    console.error('❌ Read failed:', readError.message);
  } else {
    console.log(`✅ Read successful. Found ${existingShares.length} existing shares`);
    if (existingShares.length > 0) {
      console.log('   First share:', existingShares[0]);
    }
  }

  console.log('\n3. Testing if we can create a share (requires authentication)...');
  console.log('   Note: This will fail without auth, which is expected.');

  const testToken = crypto.randomUUID();
  const { error: insertError } = await supabase
    .from('loadout_shares')
    .insert({
      share_token: testToken,
      loadout_id: '00000000-0000-0000-0000-000000000000', // Fake ID
      owner_id: '00000000-0000-0000-0000-000000000000', // Fake ID
      payload: {
        loadout: {
          id: 'test',
          name: 'Test Loadout',
          description: null,
          tripDate: null,
          activityTypes: [],
          seasons: []
        },
        items: []
      },
      allow_comments: true,
    });

  if (insertError) {
    if (insertError.code === '42501' || insertError.message.includes('new row violates row-level security')) {
      console.log('   ⚠️  Insert blocked by RLS (expected without auth)');
    } else {
      console.error('   ❌ Unexpected error:', insertError.message);
    }
  } else {
    console.log('   ✅ Insert successful (unexpected - RLS might be misconfigured)');
  }

  console.log('\n4. Testing RPC function increment_share_view_count...');
  const { error: rpcError } = await supabase.rpc('increment_share_view_count', {
    p_share_token: existingShares?.[0]?.share_token || 'nonexistent',
    p_viewer_id: null
  });

  if (rpcError) {
    console.error('❌ RPC function failed:', rpcError.message);
  } else {
    console.log('✅ RPC function executed successfully');
  }

  console.log('\nTest complete!');
}

testShareCreation().catch(console.error);
