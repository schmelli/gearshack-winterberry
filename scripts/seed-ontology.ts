import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// --- Zero-Dependency Env Loader ---
// Statt 'dotenv' zu installieren, lesen wir die Datei einfach selbst.
function loadEnv(filename: string) {
  try {
    const filePath = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf-8');
    content.split('\n').forEach(line => {
      // Überspringe Kommentare und leere Zeilen
      if (!line || line.startsWith('#') || !line.includes('=')) return;
      
      const [key, ...values] = line.split('=');
      const value = values.join('=').trim().replace(/^["']|["']$/g, ''); // Entfernt Anführungszeichen
      
      // Setze nur, wenn noch nicht vorhanden (System-Env gewinnt)
      if (!process.env[key.trim()]) {
        process.env[key.trim()] = value;
      }
    });
    console.log(`✅ Loaded env from ${filename}`);
  } catch (e) {
    console.warn(`⚠️ Could not load ${filename}`);
  }
}

// Lade Umgebungsvariablen
loadEnv('.env.local');

// Setup Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Define Types based on YOUR JSON structure
interface I18nString {
  en: string;
  de: string;
  [key: string]: string;
}

interface OntologyData {
  version: string;
  supportedLocales: string[];
  categories: Record<string, I18nString>; // Level 1
  subcategories: Record<string, I18nString & { categoryId: string }>; // Level 2
  productTypes: Record<string, I18nString & { subcategoryId: string }>; // Level 3
}

async function seedOntology() {
  const isDryRun = process.argv.includes('--dry-run');
  // PFAD ANPASSEN: Falls deine Datei woanders liegt, hier checken!
  // Wir gehen davon aus: scripts/data/Hiking_Gear_Ontology_i18n.json
  const filePath = path.join(process.cwd(), 'scripts', 'data', 'Hiking_Gear_Ontology_i18n.json');

  console.log('========================================');
  console.log(`Ontology Seed Script`);
  console.log(`Mode: ${isDryRun ? 'DRY-RUN (No DB changes)' : 'LIVE EXECUTION'}`);
  console.log('========================================');

  try {
    // 1. Read File
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found at: ${filePath}`);
    }
    const rawData = fs.readFileSync(filePath, 'utf-8');
    const data: OntologyData = JSON.parse(rawData);
    
    console.log(`✅ Loaded JSON version ${data.version}`);

    // Helper to process categories
    const processItems = async (
      level: number, 
      items: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
      parentKeyField?: string
    ) => {
      let count = 0;
      
      // Convert Object (Map) to Array of entries
      for (const [slug, details] of Object.entries(items)) {
        // Extract basic info
        const { en, de, ...rest } = details;
        const i18n = { en, de };
        const label = en || slug; // Default label to English
        
        let parentId: string | null = null;

        // Find Parent ID if needed (Level 2 & 3)
        if (parentKeyField && details[parentKeyField]) {
          const parentSlug = details[parentKeyField];
          
          if (!isDryRun) {
            // Wir suchen die Parent-ID in der Datenbank
            const { data: parent } = await supabase
              .from('categories')
              .select('id')
              .eq('slug', parentSlug)
              .maybeSingle(); // maybeSingle verhindert Fehler, wenn nicht gefunden
              
            if (parent) {
              parentId = parent.id;
            } else {
              console.warn(`   ⚠️ Parent '${parentSlug}' not found for '${slug}' (Level ${level})`);
              // Optional: Überspringen, wenn Parent fehlt?
              // continue; 
            }
          }
        }

        // Prepare DB Payload
        const payload = {
          slug,
          label, // Main label (English usually)
          i18n,  // JSONB column
          level,
          parent_id: parentId,
        };

        if (isDryRun) {
            // Im Dry-Run zeigen wir nur, was passieren würde
            const parentInfo = parentKeyField ? `-> Parent: ${details[parentKeyField]}` : '(Root)';
            console.log(`   [DRY] Upsert: ${slug.padEnd(25)} ${parentInfo}`);
        } else {
          const { error } = await supabase
            .from('categories')
            .upsert(payload, { onConflict: 'slug' });

          if (error) {
            console.error(`   ❌ Error upserting ${slug}:`, error.message);
          }
        }
        count++;
      }
      return count;
    };

    // 2. Process Level 1 (Main Categories)
    console.log('\nProcessing Level 1 (Categories)...');
    const l1Count = await processItems(1, data.categories);
    console.log(`>> Processed ${l1Count} main categories.`);

    // 3. Process Level 2 (Subcategories)
    console.log('\nProcessing Level 2 (Subcategories)...');
    const l2Count = await processItems(2, data.subcategories, 'categoryId');
    console.log(`>> Processed ${l2Count} subcategories.`);

    // 4. Process Level 3 (Product Types)
    console.log('\nProcessing Level 3 (Product Types)...');
    const l3Count = await processItems(3, data.productTypes, 'subcategoryId');
    console.log(`>> Processed ${l3Count} product types.`);

    console.log('\n========================================');
    console.log('✅ Seed Complete!');
    console.log('========================================');

  } catch (error) {
    console.error('\n❌ CRITICAL ERROR:', error);
    process.exit(1);
  }
}

seedOntology();
