/**
 * Product Seed Script
 *
 * Feature: 044-intelligence-integration
 *
 * Seeds the catalog_products table with sample outdoor gear products
 * for testing product autocomplete functionality.
 *
 * Usage: npx tsx scripts/seed-products-sample.ts
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Product data with name, brand, and category
interface ProductSeedData {
  name: string;
  brandName: string; // Will be looked up to get brand_id
  category: string;
  description?: string;
}

// Sample products organized by brand
const PRODUCTS: ProductSeedData[] = [
  // Hilleberg - Tents
  { name: 'Hilleberg Niak', brandName: 'Hilleberg', category: 'Tents', description: 'Lightweight 1-2 person tent' },
  { name: 'Hilleberg Akto', brandName: 'Hilleberg', category: 'Tents', description: 'Solo tent for all seasons' },
  { name: 'Hilleberg Anjan 2', brandName: 'Hilleberg', category: 'Tents', description: '2-person 3-season tent' },
  { name: 'Hilleberg Staika', brandName: 'Hilleberg', category: 'Tents', description: 'Freestanding dome tent' },
  { name: 'Hilleberg Keron 3 GT', brandName: 'Hilleberg', category: 'Tents', description: '3-person expedition tent' },

  // Big Agnes - Tents & Sleeping
  { name: 'Big Agnes Copper Spur HV UL2', brandName: 'Big Agnes', category: 'Tents', description: 'Ultralight backpacking tent' },
  { name: 'Big Agnes Tiger Wall UL2', brandName: 'Big Agnes', category: 'Tents', description: 'Semi-freestanding UL tent' },
  { name: 'Big Agnes Anthracite 20', brandName: 'Big Agnes', category: 'Sleeping Bags', description: '20°F down sleeping bag' },

  // MSR - Tents & Stoves
  { name: 'MSR Hubba Hubba NX', brandName: 'MSR', category: 'Tents', description: '2-person backpacking tent' },
  { name: 'MSR FreeLite 2', brandName: 'MSR', category: 'Tents', description: 'Ultralight 2-person tent' },
  { name: 'MSR PocketRocket 2', brandName: 'MSR', category: 'Stoves', description: 'Ultralight canister stove' },
  { name: 'MSR WindBurner', brandName: 'MSR', category: 'Stoves', description: 'Windproof stove system' },

  // Zpacks - Ultralight
  { name: 'Zpacks Duplex', brandName: 'Zpacks', category: 'Tents', description: 'DCF 2-person trekking pole tent' },
  { name: 'Zpacks Plexamid', brandName: 'Zpacks', category: 'Tents', description: 'DCF solo trekking pole tent' },
  { name: 'Zpacks Arc Haul Ultra 60L', brandName: 'Zpacks', category: 'Backpacks', description: 'Ultralight framed pack' },
  { name: 'Zpacks Nero 38L', brandName: 'Zpacks', category: 'Backpacks', description: 'Frameless ultralight pack' },

  // Osprey - Backpacks
  { name: 'Osprey Exos 58', brandName: 'Osprey', category: 'Backpacks', description: 'Lightweight backpacking pack' },
  { name: 'Osprey Atmos AG 65', brandName: 'Osprey', category: 'Backpacks', description: 'Anti-Gravity suspension pack' },
  { name: 'Osprey Talon 22', brandName: 'Osprey', category: 'Backpacks', description: 'Day hiking pack' },
  { name: 'Osprey Stratos 36', brandName: 'Osprey', category: 'Backpacks', description: 'Ventilated day pack' },

  // Gregory - Backpacks
  { name: 'Gregory Baltoro 65', brandName: 'Gregory', category: 'Backpacks', description: 'Full-featured expedition pack' },
  { name: 'Gregory Focal 48', brandName: 'Gregory', category: 'Backpacks', description: 'Lightweight backpacking pack' },
  { name: 'Gregory Zulu 40', brandName: 'Gregory', category: 'Backpacks', description: 'Ventilated day pack' },

  // Nemo Equipment - Sleep System
  { name: 'Nemo Hornet Elite 2P', brandName: 'Nemo Equipment', category: 'Tents', description: 'Ultralight backpacking tent' },
  { name: 'Nemo Dragonfly 2P', brandName: 'Nemo Equipment', category: 'Tents', description: 'Ultralight backpacking tent' },
  { name: 'Nemo Tensor Insulated', brandName: 'Nemo Equipment', category: 'Sleeping Pads', description: 'Insulated ultralight pad' },
  { name: 'Nemo Disco 30', brandName: 'Nemo Equipment', category: 'Sleeping Bags', description: 'Spoon-shaped sleeping bag' },

  // Thermarest - Sleeping Pads
  { name: 'Thermarest NeoAir XLite NXT', brandName: 'Thermarest', category: 'Sleeping Pads', description: 'Ultralight insulated pad' },
  { name: 'Thermarest NeoAir UberLite', brandName: 'Thermarest', category: 'Sleeping Pads', description: 'Ultra-ultralight pad' },
  { name: 'Thermarest Z Lite Sol', brandName: 'Thermarest', category: 'Sleeping Pads', description: 'Closed-cell foam pad' },
  { name: 'Thermarest ProLite Plus', brandName: 'Thermarest', category: 'Sleeping Pads', description: 'Self-inflating pad' },

  // Western Mountaineering - Sleeping Bags
  { name: 'Western Mountaineering UltraLite', brandName: 'Western Mountaineering', category: 'Sleeping Bags', description: '20°F down bag' },
  { name: 'Western Mountaineering NanoLite', brandName: 'Western Mountaineering', category: 'Sleeping Bags', description: '38°F ultralight bag' },
  { name: 'Western Mountaineering Versalite', brandName: 'Western Mountaineering', category: 'Sleeping Bags', description: '10°F expedition bag' },

  // Enlightened Equipment - Quilts
  { name: 'Enlightened Equipment Enigma 20', brandName: 'Enlightened Equipment', category: 'Quilts', description: '20°F down quilt' },
  { name: 'Enlightened Equipment Revelation 30', brandName: 'Enlightened Equipment', category: 'Quilts', description: '30°F convertible quilt' },
  { name: 'Enlightened Equipment Torrid Apex', brandName: 'Enlightened Equipment', category: 'Jackets', description: 'Synthetic insulated jacket' },

  // Sea to Summit - Accessories
  { name: 'Sea to Summit Aeros Pillow', brandName: 'Sea to Summit', category: 'Pillows', description: 'Inflatable camp pillow' },
  { name: 'Sea to Summit Ultra-Sil Dry Sack', brandName: 'Sea to Summit', category: 'Stuff Sacks', description: 'Ultralight dry bag' },
  { name: 'Sea to Summit Alpha Pot', brandName: 'Sea to Summit', category: 'Cookware', description: 'Lightweight aluminum pot' },

  // Jetboil - Stoves
  { name: 'Jetboil Flash', brandName: 'Jetboil', category: 'Stoves', description: 'Fast-boil cooking system' },
  { name: 'Jetboil MiniMo', brandName: 'Jetboil', category: 'Stoves', description: 'Regulated simmer system' },
  { name: 'Jetboil Stash', brandName: 'Jetboil', category: 'Stoves', description: 'Ultralight cooking system' },

  // Snow Peak - Cookware
  { name: 'Snow Peak Ti-Mini Solo Combo', brandName: 'Snow Peak', category: 'Cookware', description: 'Titanium pot set' },
  { name: 'Snow Peak Trek 900', brandName: 'Snow Peak', category: 'Cookware', description: 'Titanium cookset' },
  { name: 'Snow Peak LiteMax Stove', brandName: 'Snow Peak', category: 'Stoves', description: 'Ultralight titanium stove' },

  // Black Diamond - Climbing & Lighting
  { name: 'Black Diamond Spot 400', brandName: 'Black Diamond', category: 'Headlamps', description: '400 lumen headlamp' },
  { name: 'Black Diamond Storm 500-R', brandName: 'Black Diamond', category: 'Headlamps', description: 'Rechargeable headlamp' },
  { name: 'Black Diamond Trail Trekking Poles', brandName: 'Black Diamond', category: 'Trekking Poles', description: 'Aluminum trekking poles' },
  { name: 'Black Diamond Distance Carbon Z', brandName: 'Black Diamond', category: 'Trekking Poles', description: 'Ultralight carbon poles' },

  // Petzl - Headlamps
  { name: 'Petzl Actik Core', brandName: 'Petzl', category: 'Headlamps', description: 'Rechargeable headlamp' },
  { name: 'Petzl Swift RL', brandName: 'Petzl', category: 'Headlamps', description: 'Reactive lighting headlamp' },
  { name: 'Petzl Bindi', brandName: 'Petzl', category: 'Headlamps', description: 'Ultra-compact headlamp' },

  // Patagonia - Apparel
  { name: 'Patagonia Nano Puff Jacket', brandName: 'Patagonia', category: 'Jackets', description: 'Synthetic insulated jacket' },
  { name: 'Patagonia Down Sweater', brandName: 'Patagonia', category: 'Jackets', description: '800-fill down jacket' },
  { name: 'Patagonia Torrentshell 3L', brandName: 'Patagonia', category: 'Rain Gear', description: 'Waterproof rain jacket' },
  { name: 'Patagonia R1 Air Full-Zip', brandName: 'Patagonia', category: 'Fleece', description: 'Breathable fleece jacket' },

  // Arc'teryx - Apparel
  { name: "Arc'teryx Atom LT Hoody", brandName: "Arc'teryx", category: 'Jackets', description: 'Synthetic insulated hoody' },
  { name: "Arc'teryx Cerium LT Down Hoody", brandName: "Arc'teryx", category: 'Jackets', description: '850-fill down hoody' },
  { name: "Arc'teryx Beta AR Jacket", brandName: "Arc'teryx", category: 'Rain Gear', description: 'Gore-Tex Pro shell' },
  { name: "Arc'teryx Gamma LT Pant", brandName: "Arc'teryx", category: 'Pants', description: 'Softshell hiking pant' },

  // Rab - Apparel
  { name: 'Rab Microlight Alpine Jacket', brandName: 'Rab', category: 'Jackets', description: '750-fill down jacket' },
  { name: 'Rab Xenon Jacket', brandName: 'Rab', category: 'Jackets', description: 'Synthetic insulated jacket' },
  { name: 'Rab Downpour Eco Jacket', brandName: 'Rab', category: 'Rain Gear', description: 'Recycled waterproof jacket' },

  // Hyperlite Mountain Gear
  { name: 'Hyperlite Mountain Gear Southwest 3400', brandName: 'Hyperlite Mountain Gear', category: 'Backpacks', description: 'DCF ultralight pack' },
  { name: 'Hyperlite Mountain Gear Dirigo 2', brandName: 'Hyperlite Mountain Gear', category: 'Tents', description: 'DCF 2-person tent' },
  { name: 'Hyperlite Mountain Gear Stuff Pack', brandName: 'Hyperlite Mountain Gear', category: 'Backpacks', description: 'Packable summit pack' },

  // Gossamer Gear
  { name: 'Gossamer Gear Mariposa 60', brandName: 'Gossamer Gear', category: 'Backpacks', description: 'Ultralight framed pack' },
  { name: 'Gossamer Gear The One', brandName: 'Gossamer Gear', category: 'Tents', description: 'Solo trekking pole shelter' },
  { name: 'Gossamer Gear LT5 Trekking Poles', brandName: 'Gossamer Gear', category: 'Trekking Poles', description: 'Carbon fiber poles' },

  // ULA Equipment
  { name: 'ULA Circuit', brandName: 'ULA Equipment', category: 'Backpacks', description: 'Ultralight thru-hiking pack' },
  { name: 'ULA Ohm 2.0', brandName: 'ULA Equipment', category: 'Backpacks', description: 'Frameless ultralight pack' },
  { name: 'ULA Photon', brandName: 'ULA Equipment', category: 'Backpacks', description: 'Minimalist day pack' },

  // Tarptent
  { name: 'Tarptent Double Rainbow', brandName: 'Tarptent', category: 'Tents', description: '2-person trekking pole tent' },
  { name: 'Tarptent Stratospire Li', brandName: 'Tarptent', category: 'Tents', description: 'DCF 2-person tent' },
  { name: 'Tarptent Aeon Li', brandName: 'Tarptent', category: 'Tents', description: 'DCF solo tent' },

  // Six Moon Designs
  { name: 'Six Moon Designs Lunar Solo', brandName: 'Six Moon Designs', category: 'Tents', description: 'Solo trekking pole tent' },
  { name: 'Six Moon Designs Skyscape Trekker', brandName: 'Six Moon Designs', category: 'Tents', description: '1-person tent with pole' },
  { name: 'Six Moon Designs Flight 40', brandName: 'Six Moon Designs', category: 'Backpacks', description: 'Ultralight frameless pack' },

  // Granite Gear
  { name: 'Granite Gear Crown2 60', brandName: 'Granite Gear', category: 'Backpacks', description: 'Lightweight framed pack' },
  { name: 'Granite Gear Blaze 60', brandName: 'Granite Gear', category: 'Backpacks', description: 'Ventilated hiking pack' },
  { name: 'Granite Gear Air Grocery Bag', brandName: 'Granite Gear', category: 'Stuff Sacks', description: 'Food storage bag' },

  // Toaks
  { name: 'Toaks Titanium 750ml Pot', brandName: 'Toaks', category: 'Cookware', description: 'Ultralight titanium pot' },
  { name: 'Toaks Titanium Long Handle Spoon', brandName: 'Toaks', category: 'Utensils', description: 'Titanium eating utensil' },
  { name: 'Toaks Titanium Wood Stove', brandName: 'Toaks', category: 'Stoves', description: 'Backpacking wood stove' },
];

/**
 * Generates a stable external_id from product name
 * Used for upsert conflict resolution
 */
function generateExternalId(name: string): string {
  return `seed-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`;
}

async function seedProducts(): Promise<void> {
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

  console.log('Fetching brand IDs...');

  // First, fetch all brands to get their IDs
  const { data: brands, error: brandsError } = await supabase
    .from('catalog_brands')
    .select('id, name');

  if (brandsError) {
    console.error('Error fetching brands:', brandsError.message);
    process.exit(1);
  }

  // Create a map of brand name to ID
  const brandMap = new Map<string, string>();
  for (const brand of brands || []) {
    brandMap.set(brand.name, brand.id);
  }

  console.log(`Found ${brandMap.size} brands in database`);
  console.log(`Seeding ${PRODUCTS.length} products to catalog_products...`);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const product of PRODUCTS) {
    const brandId = brandMap.get(product.brandName);

    if (!brandId) {
      console.warn(`  ⚠ Skipped "${product.name}" - brand "${product.brandName}" not found`);
      skippedCount++;
      continue;
    }

    const externalId = generateExternalId(product.name);

    const { error } = await supabase
      .from('catalog_products')
      .upsert(
        {
          external_id: externalId,
          brand_id: brandId,
          name: product.name,
          category_main: product.category,
          description: product.description || null,
        },
        { onConflict: 'external_id' }
      );

    if (error) {
      console.error(`  ✗ Failed to upsert "${product.name}": ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✓ ${product.name}`);
      successCount++;
    }
  }

  console.log('');
  console.log(`Seeding complete: ${successCount} succeeded, ${skippedCount} skipped, ${errorCount} failed`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

// Run the seed function
seedProducts().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
