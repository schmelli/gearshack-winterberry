/**
 * Re-embedding Script: Populate multilingual (1024-dim) embedding columns
 * Feature: Vorschlag 16 - Multilinguale Embeddings für Deutsch/Englisch-Suche
 *
 * Run this after switching EMBEDDING_MODEL to cohere/embed-multilingual-v3.0
 * to backfill the `embedding_ml` column for existing rows in:
 * - conversation_memory (message content → semantic recall)
 * - catalog_products    (name + description → product search)
 *
 * Usage:
 *   EMBEDDING_MODEL=cohere/embed-multilingual-v3.0 npx tsx scripts/reembed-multilingual.ts
 *
 * Requires:
 *   AI_GATEWAY_API_KEY  — Vercel AI Gateway key
 *   DATABASE_URL        — Direct PostgreSQL connection string (from Supabase dashboard)
 *
 * Progress is logged to stdout. The script is idempotent: rows that already
 * have embedding_ml populated are skipped.
 */

import 'dotenv/config';
import { createGateway } from '@ai-sdk/gateway';
import { embedMany } from 'ai';
import { createClient } from '@supabase/supabase-js';

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 50; // rows per embedding batch (stay within rate limits)
const TARGET_MODEL = 'cohere/embed-multilingual-v3.0';
const TARGET_DIMS = 1024;

// =============================================================================
// Helpers
// =============================================================================

async function embedBatch(
  gateway: ReturnType<typeof createGateway>,
  texts: string[]
): Promise<number[][]> {
  const model = gateway.textEmbeddingModel(TARGET_MODEL);
  const { embeddings } = await embedMany({ model, values: texts });
  return embeddings;
}

function formatProgress(done: number, total: number): string {
  const pct = total > 0 ? ((done / total) * 100).toFixed(1) : '0.0';
  return `${done}/${total} (${pct}%)`;
}

// =============================================================================
// conversation_memory backfill
// =============================================================================

async function backfillConversationMemory(
  supabase: ReturnType<typeof createClient>,
  gateway: ReturnType<typeof createGateway>
): Promise<void> {
  console.log('\n[conversation_memory] Starting backfill...');

  // Count rows needing backfill
  const { count, error: countErr } = await supabase
    .from('conversation_memory')
    .select('*', { count: 'exact', head: true })
    .not('embedding', 'is', null)
    .is('embedding_ml', null);

  if (countErr) throw new Error(`Count failed: ${countErr.message}`);
  const total = count ?? 0;

  if (total === 0) {
    console.log('[conversation_memory] Nothing to backfill — all rows already have embedding_ml.');
    return;
  }

  console.log(`[conversation_memory] ${total} rows need embedding_ml populated.`);

  let processed = 0;
  const offset = 0;

  while (processed < total) {
    const { data: rows, error } = await supabase
      .from('conversation_memory')
      .select('id, message_content')
      .not('embedding', 'is', null)
      .is('embedding_ml', null)
      .range(offset, offset + BATCH_SIZE - 1);

    if (error) throw new Error(`Fetch failed: ${error.message}`);
    if (!rows || rows.length === 0) break;

    const texts = rows.map((r) => r.message_content as string);
    const embeddings = await embedBatch(gateway, texts);

    // Verify dimensions
    if (embeddings[0]?.length !== TARGET_DIMS) {
      throw new Error(
        `Dimension mismatch: expected ${TARGET_DIMS}, got ${embeddings[0]?.length}. ` +
        `Make sure EMBEDDING_MODEL=${TARGET_MODEL} is set.`
      );
    }

    // Update each row
    for (let i = 0; i < rows.length; i++) {
      const { error: updateErr } = await supabase
        .from('conversation_memory')
        .update({ embedding_ml: JSON.stringify(embeddings[i]) })
        .eq('id', rows[i].id);

      if (updateErr) {
        console.error(`  [WARN] Failed to update row ${rows[i].id}: ${updateErr.message}`);
      }
    }

    processed += rows.length;
    console.log(`  ${formatProgress(processed, total)}`);

    // Don't advance offset — we just cleared those rows from the result set
  }

  console.log(`[conversation_memory] Backfill complete. ${processed} rows updated.`);
}

// =============================================================================
// catalog_products backfill
// =============================================================================

async function backfillCatalogProducts(
  supabase: ReturnType<typeof createClient>,
  gateway: ReturnType<typeof createGateway>
): Promise<void> {
  console.log('\n[catalog_products] Starting backfill...');

  const { count, error: countErr } = await supabase
    .from('catalog_products')
    .select('*', { count: 'exact', head: true })
    .is('embedding_ml', null);

  if (countErr) throw new Error(`Count failed: ${countErr.message}`);
  const total = count ?? 0;

  if (total === 0) {
    console.log('[catalog_products] Nothing to backfill — all rows already have embedding_ml.');
    return;
  }

  console.log(`[catalog_products] ${total} rows need embedding_ml populated.`);

  let processed = 0;

  while (processed < total) {
    const { data: rows, error } = await supabase
      .from('catalog_products')
      .select('id, name, description')
      .is('embedding_ml', null)
      .range(0, BATCH_SIZE - 1);

    if (error) throw new Error(`Fetch failed: ${error.message}`);
    if (!rows || rows.length === 0) break;

    // Combine name + description for richer embedding signal
    const texts = rows.map((r) => {
      const name = (r.name as string) ?? '';
      const desc = (r.description as string) ?? '';
      return [name, desc].filter(Boolean).join('. ');
    });

    const embeddings = await embedBatch(gateway, texts);

    if (embeddings[0]?.length !== TARGET_DIMS) {
      throw new Error(
        `Dimension mismatch: expected ${TARGET_DIMS}, got ${embeddings[0]?.length}.`
      );
    }

    for (let i = 0; i < rows.length; i++) {
      const { error: updateErr } = await supabase
        .from('catalog_products')
        .update({ embedding_ml: JSON.stringify(embeddings[i]) })
        .eq('id', rows[i].id);

      if (updateErr) {
        console.error(`  [WARN] Failed to update row ${rows[i].id}: ${updateErr.message}`);
      }
    }

    processed += rows.length;
    // Don't advance offset — we just cleared those rows from the result set.
    // The query filters for embedding_ml IS NULL, so updated rows drop out of
    // the result set. The next iteration fetches the next unprocessed batch
    // starting from offset 0.
    console.log(`  ${formatProgress(processed, total)}`);
  }

  console.log(`[catalog_products] Backfill complete. ${processed} rows updated.`);
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  // Validate environment
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
  if (!apiKey) {
    console.error('ERROR: AI_GATEWAY_API_KEY is required.');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      'ERROR: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.\n' +
      'Get SUPABASE_SERVICE_ROLE_KEY from: Supabase Dashboard > Settings > API > service_role'
    );
    process.exit(1);
  }

  const activeModel = process.env.EMBEDDING_MODEL;
  if (activeModel !== TARGET_MODEL) {
    console.error(
      `ERROR: EMBEDDING_MODEL must be set to "${TARGET_MODEL}" before running this script.\n` +
      `Current value: ${activeModel ?? '(not set)'}`
    );
    process.exit(1);
  }

  console.log('='.repeat(72));
  console.log('Multilingual Embedding Backfill');
  console.log(`Model: ${TARGET_MODEL} (${TARGET_DIMS} dims)`);
  console.log('='.repeat(72));

  const gateway = createGateway({ apiKey });
  // Use service role to bypass RLS for bulk update
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const startTime = Date.now();

  await backfillConversationMemory(supabase, gateway);
  await backfillCatalogProducts(supabase, gateway);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\n${'='.repeat(72)}`);
  console.log(`Backfill complete in ${elapsed}s.`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Verify results: SELECT COUNT(*) FROM conversation_memory WHERE embedding_ml IS NOT NULL;');
  console.log('  2. Run evaluation: npx tsx scripts/eval-multilingual-embeddings.ts');
  console.log('  3. Deploy with EMBEDDING_MODEL=cohere/embed-multilingual-v3.0');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
