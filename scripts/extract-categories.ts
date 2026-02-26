/**
 * Extract Categories from Supabase
 *
 * Queries the categories table and outputs a structured view of the taxonomy.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);


async function extractCategories() {
  console.log('🔍 Extracting categories from Supabase...\n');

  // Fetch all categories
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('level', { ascending: true })
    .order('label', { ascending: true });

  if (error) {
    console.error('❌ Error fetching categories:', error);
    process.exit(1);
  }

  if (!categories || categories.length === 0) {
    console.log('⚠️  No categories found in database');
    return;
  }

  console.log(`✅ Found ${categories.length} categories\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Group by level
  const level1 = categories.filter(c => c.level === 1);
  const level2 = categories.filter(c => c.level === 2);
  const level3 = categories.filter(c => c.level === 3);

  console.log(`📊 Distribution: Level 1: ${level1.length} | Level 2: ${level2.length} | Level 3: ${level3.length}\n`);
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Build hierarchical structure
  for (const cat1 of level1) {
    const children2 = level2.filter(c => c.parent_id === cat1.id);

    const i18n1 = cat1.i18n as { en?: string; de?: string } | null;
    console.log(`📁 ${cat1.label} (${cat1.id.substring(0, 8)}...)`);
    console.log(`   EN: ${i18n1?.en || 'N/A'} | DE: ${i18n1?.de || 'N/A'}`);
    console.log(`   Children: ${children2.length}`);
    console.log('');

    for (const cat2 of children2) {
      const children3 = level3.filter(c => c.parent_id === cat2.id);

      const i18n2 = cat2.i18n as { en?: string; de?: string } | null;
      console.log(`   ├─ ${cat2.label} (${cat2.id.substring(0, 8)}...)`);
      console.log(`   │  EN: ${i18n2?.en || 'N/A'} | DE: ${i18n2?.de || 'N/A'}`);
      console.log(`   │  Children: ${children3.length}`);
      console.log('');

      for (const cat3 of children3) {
        const i18n3 = cat3.i18n as { en?: string; de?: string } | null;
        console.log(`   │  ├─ ${cat3.label} (${cat3.id.substring(0, 8)}...)`);
        console.log(`   │  │  EN: ${i18n3?.en || 'N/A'} | DE: ${i18n3?.de || 'N/A'}`);
        console.log('');
      }
    }

    console.log('');
  }

  console.log('═══════════════════════════════════════════════════════════════\n');

  // Analysis
  console.log('📊 ANALYSIS:\n');

  // Check for missing translations
  const missingEnglish = categories.filter(c => {
    const i18n = c.i18n as { en?: string; de?: string } | null;
    return !i18n?.en;
  });
  const missingGerman = categories.filter(c => {
    const i18n = c.i18n as { en?: string; de?: string } | null;
    return !i18n?.de;
  });

  if (missingEnglish.length > 0) {
    console.log(`⚠️  ${missingEnglish.length} categories missing English translation:`);
    missingEnglish.forEach(c => console.log(`   - ${c.label} (${c.id.substring(0, 8)}...)`));
    console.log('');
  }

  if (missingGerman.length > 0) {
    console.log(`⚠️  ${missingGerman.length} categories missing German translation:`);
    missingGerman.forEach(c => console.log(`   - ${c.label} (${c.id.substring(0, 8)}...)`));
    console.log('');
  }

  // Check for orphaned categories
  const orphaned = categories.filter(c => {
    if (c.level === 1) return false; // Level 1 should have null parent
    return !categories.some(p => p.id === c.parent_id);
  });

  if (orphaned.length > 0) {
    console.log(`❌ ${orphaned.length} orphaned categories (parent not found):`);
    orphaned.forEach(c => console.log(`   - ${c.label} (Level ${c.level}, parent: ${c.parent_id?.substring(0, 8)}...)`));
    console.log('');
  }

  // Check for empty parent categories
  for (const cat1 of level1) {
    const children = level2.filter(c => c.parent_id === cat1.id);
    if (children.length === 0) {
      console.log(`⚠️  Empty Level 1 category: ${cat1.label}`);
    }
  }

  for (const cat2 of level2) {
    const children = level3.filter(c => c.parent_id === cat2.id);
    if (children.length === 0) {
      console.log(`⚠️  Empty Level 2 category: ${cat2.label}`);
    }
  }

  console.log('\n✅ Extraction complete!');
}

extractCategories().catch(console.error);
