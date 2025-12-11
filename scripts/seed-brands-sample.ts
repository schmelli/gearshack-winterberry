/**
 * Brand Seed Script
 *
 * Feature: 044-intelligence-integration
 * Task: T006-T009
 *
 * Seeds the catalog_brands table with common outdoor gear brands
 * for testing brand autocomplete functionality.
 *
 * Usage: npx tsx scripts/seed-brands-sample.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Brand data with name, country, and website
interface BrandSeedData {
  name: string;
  country: string;
  website_url: string;
}

// 25 common outdoor brands covering various categories
const BRANDS: BrandSeedData[] = [
  // Tents & Shelters
  { name: 'Hilleberg', country: 'Sweden', website_url: 'https://hilleberg.com' },
  { name: 'Big Agnes', country: 'USA', website_url: 'https://bigagnes.com' },
  { name: 'MSR', country: 'USA', website_url: 'https://msrgear.com' },
  { name: 'Tarptent', country: 'USA', website_url: 'https://tarptent.com' },
  { name: 'Six Moon Designs', country: 'USA', website_url: 'https://sixmoondesigns.com' },
  { name: 'Nemo Equipment', country: 'USA', website_url: 'https://nemoequipment.com' },

  // Ultralight Specialists
  { name: 'Zpacks', country: 'USA', website_url: 'https://zpacks.com' },
  { name: 'Gossamer Gear', country: 'USA', website_url: 'https://gossamergear.com' },
  { name: 'Hyperlite Mountain Gear', country: 'USA', website_url: 'https://hyperlitemountaingear.com' },

  // Sleep Systems
  { name: 'Thermarest', country: 'USA', website_url: 'https://thermarest.com' },
  { name: 'Western Mountaineering', country: 'USA', website_url: 'https://westernmountaineering.com' },
  { name: 'Enlightened Equipment', country: 'USA', website_url: 'https://enlightenedequipment.com' },
  { name: 'Sea to Summit', country: 'Australia', website_url: 'https://seatosummit.com' },

  // Packs
  { name: 'ULA Equipment', country: 'USA', website_url: 'https://ula-equipment.com' },
  { name: 'Granite Gear', country: 'USA', website_url: 'https://granitegear.com' },
  { name: 'Osprey', country: 'USA', website_url: 'https://osprey.com' },
  { name: 'Gregory', country: 'USA', website_url: 'https://gregorypacks.com' },

  // Cooking
  { name: 'Jetboil', country: 'USA', website_url: 'https://jetboil.com' },
  { name: 'Snow Peak', country: 'Japan', website_url: 'https://snowpeak.com' },
  { name: 'Toaks', country: 'China', website_url: 'https://toaksoutdoor.com' },

  // Climbing & Hardware
  { name: 'Black Diamond', country: 'USA', website_url: 'https://blackdiamondequipment.com' },
  { name: 'Petzl', country: 'France', website_url: 'https://petzl.com' },

  // Apparel
  { name: 'Patagonia', country: 'USA', website_url: 'https://patagonia.com' },
  { name: "Arc'teryx", country: 'Canada', website_url: 'https://arcteryx.com' },
  { name: 'Rab', country: 'UK', website_url: 'https://rab.equipment' },
];

/**
 * Generates a stable external_id from brand name
 * Used for upsert conflict resolution
 */
function generateExternalId(name: string): string {
  return `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
}

async function seedBrands(): Promise<void> {
  // Get Supabase credentials from environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`Seeding ${BRANDS.length} brands to catalog_brands...`);

  let successCount = 0;
  let errorCount = 0;

  for (const brand of BRANDS) {
    const externalId = generateExternalId(brand.name);

    const { error } = await supabase
      .from('catalog_brands')
      .upsert(
        {
          external_id: externalId,
          name: brand.name,
          website_url: brand.website_url,
        },
        { onConflict: 'external_id' }
      );

    if (error) {
      console.error(`  ✗ Failed to upsert "${brand.name}": ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✓ ${brand.name}`);
      successCount++;
    }
  }

  console.log('');
  console.log(`Seeding complete: ${successCount} succeeded, ${errorCount} failed`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run the seed function
seedBrands().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
