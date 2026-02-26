/**
 * Catalog Enrichment Script — ReAG Pattern
 *
 * Asynchronous background job that enriches catalog products with LLM-generated
 * semantic metadata for improved search discoverability.
 *
 * The enrichment runs offline (not on the critical request path) and stores
 * structured data in the `search_enrichment` JSONB column of `catalog_products`.
 *
 * Usage:
 *   npx tsx scripts/enrich-catalog-items.ts                # Enrich all unenriched products
 *   npx tsx scripts/enrich-catalog-items.ts --limit 50     # Enrich up to 50 products
 *   npx tsx scripts/enrich-catalog-items.ts --force         # Re-enrich already enriched products
 *   npx tsx scripts/enrich-catalog-items.ts --dry-run       # Preview without writing to DB
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL   - Supabase project URL
 *   SUPABASE_SERVICE_ROLE_KEY  - Service role key (bypasses RLS)
 *   AI_GATEWAY_API_KEY         - Vercel AI Gateway API key
 *   ENRICHMENT_MODEL           - Model to use (default: anthropic/claude-haiku-4-5-20251001)
 *
 * @see specs/060-ai-agent-evolution/analysis.md - Vorschlag 5 (ReAG)
 * @see supabase/migrations/20260226000001_catalog_search_enrichment.sql
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { generateObject } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import type { Json, Database } from '@/types/supabase';
import { EnrichmentSchema, type SearchEnrichment } from '@/lib/enrichment-schema';

// Load environment variables from .env.local
config({ path: '.env.local' });

// =============================================================================
// Configuration
// =============================================================================

/** Cost-efficient model for batch enrichment (Haiku for low cost per item) */
const ENRICHMENT_MODEL = process.env.ENRICHMENT_MODEL ?? 'anthropic/claude-haiku-4-5-20251001';

/** Maximum items to process per run (prevents runaway costs) */
const DEFAULT_BATCH_LIMIT = 100;

/**
 * Absolute upper bound on --limit to prevent runaway API costs from typos.
 * Prevents accidental `--limit 10000` from generating thousands of LLM calls.
 * Use multiple sequential runs for larger batches.
 */
const MAX_SAFE_LIMIT = 1000;

/** Delay between API calls to avoid rate limiting (ms) */
const THROTTLE_DELAY_MS = 500;

/** Maximum retries for transient errors */
const MAX_RETRIES = 2;

/** Timeout per enrichment call (ms) */
const ENRICHMENT_TIMEOUT_MS = 15000;

// =============================================================================
// Enrichment Schema (Zod)
// =============================================================================

// EnrichmentSchema and SearchEnrichment type are imported from @/lib/enrichment-schema
// — the single source of truth shared by this script and types/catalog.ts.
// Editing lib/enrichment-schema.ts propagates to both the runtime Zod validation
// (here) and the TypeScript type (CatalogProduct.searchEnrichment) automatically.

// =============================================================================
// CLI Argument Parsing
// =============================================================================

interface CliArgs {
  limit: number;
  force: boolean;
  dryRun: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  let limit = DEFAULT_BATCH_LIMIT;
  let force = false;
  let dryRun = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--limit') {
      if (i + 1 >= args.length || !args[i + 1]) {
        console.error('Error: --limit requires a value (e.g. --limit 50)');
        process.exit(1);
      }
      limit = parseInt(args[i + 1], 10);
      if (isNaN(limit) || limit < 1) {
        console.error('Error: --limit must be a positive integer');
        process.exit(1);
      }
      if (limit > MAX_SAFE_LIMIT) {
        console.error(`Error: --limit cannot exceed ${MAX_SAFE_LIMIT}. Use multiple sequential runs for larger batches.`);
        process.exit(1);
      }
      i++; // skip next arg
    } else if (args[i] === '--force') {
      force = true;
    } else if (args[i] === '--dry-run') {
      dryRun = true;
    } else if (args[i] === '--help') {
      console.log(`
Usage: npx tsx scripts/enrich-catalog-items.ts [options]

Options:
  --limit <n>   Maximum products to enrich (default: ${DEFAULT_BATCH_LIMIT}, max: ${MAX_SAFE_LIMIT})
  --force       Re-enrich products that already have enrichment data
  --dry-run     Preview which products would be enriched without writing to DB
  --help        Show this help message
`);
      process.exit(0);
    }
  }

  return { limit, force, dryRun };
}

// =============================================================================
// AI Gateway Setup
// =============================================================================

function getGateway() {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) {
    throw new Error('AI_GATEWAY_API_KEY environment variable is required');
  }
  return createGateway({ apiKey });
}

// =============================================================================
// Enrichment Logic
// =============================================================================

interface CatalogProductRow {
  id: string;
  name: string;
  description: string | null;
  product_type: string | null;
  weight_grams: number | null;
  price_usd: number | null;
  brand_name: string | null;
}

/**
 * Generate structured enrichment for a single catalog product using an LLM.
 * @param gateway - AI Gateway instance
 * @param item - Product data to enrich
 * @param abortSignal - Optional abort signal for timeout cancellation
 */
async function enrichItem(
  gateway: ReturnType<typeof createGateway>,
  item: CatalogProductRow,
  abortSignal?: AbortSignal
): Promise<SearchEnrichment> {
  const promptParts = [
    `Gear item: ${item.name}`,
    item.brand_name ? `Brand: ${item.brand_name}` : null,
    item.description ? `Description: ${item.description}` : null,
    item.weight_grams ? `Weight: ${item.weight_grams}g` : null,
    item.price_usd ? `Price: $${item.price_usd}` : null,
    item.product_type ? `Category: ${item.product_type}` : null,
  ].filter((x): x is string => x !== null).join('\n');

  const { object } = await generateObject({
    model: gateway(ENRICHMENT_MODEL),
    schema: EnrichmentSchema,
    messages: [
      {
        role: 'system',
        content: `You are an outdoor gear expert. Generate structured enrichment metadata for a gear product to improve search discoverability. Include both English and German search terms where applicable. Be specific about conditions, use cases, and compatibility. Keep each array entry concise (under 60 characters).`,
      },
      {
        role: 'user',
        content: `Generate structured enrichment for better search discoverability:\n\n${promptParts}`,
      },
    ],
    abortSignal,
  });

  return object;
}

/**
 * Retry wrapper with exponential backoff for transient errors.
 */
async function enrichItemWithRetry(
  gateway: ReturnType<typeof createGateway>,
  item: CatalogProductRow,
  maxRetries: number = MAX_RETRIES
): Promise<SearchEnrichment | null> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), ENRICHMENT_TIMEOUT_MS);

      try {
        const result = await enrichItem(gateway, item, controller.signal);
        return result;
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error: unknown) {
      const isLastAttempt = attempt === maxRetries;
      const statusCode = error && typeof error === 'object' && 'status' in error
        ? (error as { status: number }).status
        : null;

      // Don't retry non-transient errors
      if (statusCode && statusCode >= 400 && statusCode < 500 && statusCode !== 429) {
        console.error(`  [SKIP] Non-retryable error for "${item.name}": ${statusCode}`);
        return null;
      }

      if (isLastAttempt) {
        console.error(`  [FAIL] "${item.name}" after ${maxRetries + 1} attempts:`,
          error instanceof Error ? error.message : String(error));
        return null;
      }

      const backoffMs = Math.pow(2, attempt) * 1000;
      console.warn(`  [RETRY] "${item.name}" attempt ${attempt + 1}/${maxRetries + 1}, waiting ${backoffMs}ms...`);
      await sleep(backoffMs);
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  const { limit, force, dryRun } = parseArgs();

  // Validate environment
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Missing Supabase environment variables');
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  // AI_GATEWAY_API_KEY is validated inside getGateway(), which throws with an
  // informative error if absent. No need to duplicate the check here — the
  // main().catch() handler below will surface the error and exit(1) cleanly.
  const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const gateway = getGateway();

  console.log('=== Catalog Enrichment (ReAG) ===');
  console.log(`Model: ${ENRICHMENT_MODEL}`);
  console.log(`Limit: ${limit}`);
  console.log(`Force re-enrich: ${force}`);
  console.log(`Dry run: ${dryRun}`);
  console.log('');

  // Fetch products to enrich.
  // - Normal mode: only unenriched products, oldest-created first (most likely to be canonical products)
  // - Force mode:  all products, ordered by enriched_at ASC NULLS FIRST so items with no enrichment
  //               come first, then the most stale enrichments are refreshed next. This is more useful
  //               than ordering by created_at when re-enriching, because the goal is to keep enrichment
  //               fresh across the catalog rather than re-process the same oldest items repeatedly.
  let query = supabase
    .from('catalog_products')
    .select('id, name, description, product_type, weight_grams, price_usd, catalog_brands(name)')
    .limit(limit);

  if (!force) {
    query = query
      .is('search_enrichment', null)
      .order('created_at', { ascending: true });
  } else {
    // enriched_at ASC NULLS FIRST: unenriched products first, then oldest-enriched products
    query = query.order('enriched_at', { ascending: true, nullsFirst: true });
  }

  const { data: products, error: fetchError } = await query;

  if (fetchError) {
    console.error('Error fetching products:', fetchError.message);
    process.exit(1);
  }

  if (!products || products.length === 0) {
    console.log('No products to enrich. All products are already enriched.');
    console.log('Use --force to re-enrich existing products.');
    process.exit(0);
  }

  console.log(`Found ${products.length} products to enrich.`);

  if (dryRun) {
    // Estimated cost: ~$0.0003 per product (Claude Haiku: ~300 input + ~200 output tokens,
    // at $0.25/M input + $1.25/M output = ~$0.000075 + ~$0.00025 ≈ $0.00033 per item).
    const estimatedCostUsd = (products.length * 0.00033).toFixed(4);
    console.log(`\n--- Dry Run: ${products.length} product(s) would be enriched (est. ~$${estimatedCostUsd} using ${ENRICHMENT_MODEL}) ---`);
    for (const product of products) {
      // catalog_brands is a many-to-one FK; Supabase typed client returns a single
      // object (not an array) for this join direction. Access as `.name` directly.
      const brandName = product.catalog_brands?.name ?? 'Unknown';
      console.log(`  - ${product.name} (${brandName}) [${product.product_type ?? 'uncategorized'}]`);
    }
    console.log('\nNo changes written. Remove --dry-run to execute.');
    process.exit(0);
  }

  // Process products
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;
  const startTime = Date.now();

  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    // catalog_brands is a many-to-one FK; Supabase typed client returns a single
    // object (not an array) for this join direction. Access as `.name` directly.
    const brandName = product.catalog_brands?.name ?? null;
    const progress = `[${i + 1}/${products.length}]`;

    console.log(`${progress} Enriching: ${product.name} (${brandName ?? 'no brand'})...`);

    const item: CatalogProductRow = {
      id: product.id,
      name: product.name,
      description: product.description,
      product_type: product.product_type,
      weight_grams: product.weight_grams,
      price_usd: product.price_usd,
      brand_name: brandName,
    };

    const enrichment = await enrichItemWithRetry(gateway, item);

    if (!enrichment) {
      errorCount++;
      continue;
    }

    // Validate enrichment has meaningful content
    if (enrichment.useCases.length === 0 && enrichment.alternativeSearchTerms.length === 0) {
      console.warn(`  [SKIP] Empty enrichment for "${product.name}"`);
      skipCount++;
      continue;
    }

    // Write to database
    const { error: updateError } = await supabase
      .from('catalog_products')
      .update({
        // SearchEnrichment is a plain object with string/string[] fields — structurally
        // compatible with Json. Cast via `as unknown as Json` avoids the intermediate
        // `Record<string, unknown>` which loses type information.
        search_enrichment: enrichment as unknown as Json,
        enriched_at: new Date().toISOString(),
      })
      .eq('id', product.id);

    if (updateError) {
      console.error(`  [DB ERROR] "${product.name}": ${updateError.message}`);
      errorCount++;
      continue;
    }

    successCount++;
    console.log(`  OK: ${enrichment.useCases.length} use cases, ${enrichment.alternativeSearchTerms.length} search terms, ${enrichment.conditions.length} conditions`);

    // Throttle between API calls
    if (i < products.length - 1) {
      await sleep(THROTTLE_DELAY_MS);
    }
  }

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  console.log('=== Enrichment Complete ===');
  console.log(`Enriched: ${successCount}`);
  console.log(`Skipped:  ${skipCount}`);
  console.log(`Failed:   ${errorCount}`);
  console.log(`Duration: ${elapsedSec}s`);

  if (errorCount > 0) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
