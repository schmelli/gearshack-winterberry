/**
 * Embedding Backfill Script
 * Feature: 002-mastra-memory-system
 *
 * Generates vector embeddings for existing conversation_memory messages
 * that don't have embeddings yet.
 *
 * Usage:
 *   npx tsx scripts/backfill-embeddings.ts
 *
 * Requires:
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY (for bulk operations bypassing RLS)
 *   - AI_GATEWAY_API_KEY (for embedding generation)
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

// Dynamic import for ESM module
async function loadEmbeddingService() {
  const { generateEmbeddings } = await import('../lib/mastra/memory/embedding-service');
  return { generateEmbeddings };
}

// =============================================================================
// Configuration
// =============================================================================

const BATCH_SIZE = 50; // Conservative batch size for rate limiting
const DELAY_MS = 1000; // Delay between batches (ms)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// =============================================================================
// Validation
// =============================================================================

if (!SUPABASE_URL) {
  console.error('ERROR: NEXT_PUBLIC_SUPABASE_URL is required');
  process.exit(1);
}

if (!SUPABASE_SERVICE_KEY) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is required');
  process.exit(1);
}

if (!process.env.AI_GATEWAY_API_KEY && !process.env.AI_GATEWAY_KEY) {
  console.error('ERROR: AI_GATEWAY_API_KEY is required for embedding generation');
  process.exit(1);
}

// =============================================================================
// Main
// =============================================================================

async function backfillEmbeddings() {
  const { generateEmbeddings } = await loadEmbeddingService();

  const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_KEY!);

  console.log('=== Embedding Backfill Script ===');
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Delay between batches: ${DELAY_MS}ms`);
  console.log('');

  // Step 1: Count messages without embeddings
  const { count, error: countError } = await supabase
    .from('conversation_memory')
    .select('*', { count: 'exact', head: true })
    .is('embedding', null);

  if (countError) {
    console.error('Failed to count messages:', countError.message);

    // Check if the embedding column exists
    if (countError.message.includes('embedding')) {
      console.error('');
      console.error('The "embedding" column may not exist yet.');
      console.error('Please run the migration first:');
      console.error('  supabase migration up');
    }
    process.exit(1);
  }

  const totalMessages = count || 0;
  console.log(`Found ${totalMessages} messages without embeddings`);

  if (totalMessages === 0) {
    console.log('Nothing to backfill!');
    return;
  }

  // Step 2: Process in batches
  let processed = 0;
  let failed = 0;
  let batchNumber = 0;
  const startTime = Date.now();

  while (processed + failed < totalMessages) {
    batchNumber++;

    // Fetch batch of messages without embeddings
    const { data: messages, error: fetchError } = await supabase
      .from('conversation_memory')
      .select('id, message_id, message_content')
      .is('embedding', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error(`Batch ${batchNumber}: Fetch error:`, fetchError.message);
      break;
    }

    if (!messages || messages.length === 0) {
      break;
    }

    console.log(`\nBatch ${batchNumber}: Processing ${messages.length} messages...`);

    try {
      // Generate embeddings in batch
      const texts = messages.map((m) => m.message_content);
      const embeddings = await generateEmbeddings(texts);

      // Update each message with its embedding
      let batchSuccess = 0;
      let batchFailed = 0;

      for (let i = 0; i < messages.length; i++) {
        const { error: updateError } = await supabase
          .from('conversation_memory')
          .update({ embedding: JSON.stringify(embeddings[i]) })
          .eq('id', messages[i].id);

        if (updateError) {
          console.error(
            `  Failed to update message ${messages[i].message_id}:`,
            updateError.message
          );
          batchFailed++;
          failed++;
        } else {
          batchSuccess++;
          processed++;
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (processed / parseFloat(elapsed)).toFixed(1);
      console.log(
        `  Batch ${batchNumber}: ${batchSuccess} success, ${batchFailed} failed ` +
          `| Total: ${processed}/${totalMessages} (${rate} msg/s, ${elapsed}s elapsed)`
      );
    } catch (error) {
      console.error(
        `Batch ${batchNumber}: Embedding generation failed:`,
        error instanceof Error ? error.message : 'Unknown error'
      );
      failed += messages.length;

      // If batch fails, skip those messages to avoid infinite loop
      // Mark them in the queue for retry
      for (const msg of messages) {
        await supabase.from('embedding_queue').upsert(
          {
            message_id: msg.id,
            user_id: '00000000-0000-0000-0000-000000000000', // Placeholder - backfill
            content: msg.message_content,
            error_message: error instanceof Error ? error.message : 'Unknown error',
          },
          { onConflict: 'message_id' }
        );
      }
    }

    // Rate limiting delay
    if (processed + failed < totalMessages) {
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  // Step 3: Summary
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('');
  console.log('=== Backfill Complete ===');
  console.log(`Processed: ${processed} messages`);
  console.log(`Failed: ${failed} messages`);
  console.log(`Total time: ${totalTime}s`);

  if (failed > 0) {
    console.log('');
    console.log(`${failed} messages failed. Check embedding_queue table for retry.`);
  }
}

// Run
backfillEmbeddings().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
