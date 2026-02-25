/**
 * Check loadout_shares table structure
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function checkTableStructure() {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // Query information_schema to get column details
  const { data, error } = await supabase
    .from('loadout_shares')
    .select('*')
    .limit(1);

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (data && data.length > 0) {
    console.log('Columns in loadout_shares:');
    console.log(Object.keys(data[0]));
    console.log('\nSample row:');
    console.log(JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data found, cannot determine structure');
  }
}

checkTableStructure();
