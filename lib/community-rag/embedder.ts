/**
 * Embedding Service for Community RAG
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Generates vector embeddings for community content chunks using
 * the Vercel AI Gateway (text-embedding-3-small via OpenAI).
 * Stores embeddings in the community_knowledge_chunks table in Supabase.
 */

import { embed, embedMany } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import type { CommunityChunk, IndexingResult } from './types';
import { COMMUNITY_RAG_CONFIG } from './types';

// ============================================================================
// Gateway Configuration
// ============================================================================

let gatewayInstance: ReturnType<typeof createGateway> | null = null;

function getGateway() {
  if (!gatewayInstance) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) {
      throw new Error(
        'AI_GATEWAY_API_KEY is required for embedding generation. ' +
        'Set AI_GATEWAY_API_KEY or AI_GATEWAY_KEY in your environment.'
      );
    }
    gatewayInstance = createGateway({ apiKey });
  }
  return gatewayInstance;
}

// ============================================================================
// Embedding Functions
// ============================================================================

/**
 * Generate a single embedding for a text query.
 * Used for search queries at runtime.
 */
export async function generateQueryEmbedding(text: string): Promise<number[]> {
  const gateway = getGateway();
  const model = gateway.textEmbeddingModel(COMMUNITY_RAG_CONFIG.EMBEDDING_MODEL);

  const { embedding } = await embed({
    model,
    value: text,
  });

  return embedding;
}

/**
 * Generate embeddings for multiple text chunks.
 * Used for batch indexing during content ingestion.
 */
export async function generateChunkEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const gateway = getGateway();
  const model = gateway.textEmbeddingModel(COMMUNITY_RAG_CONFIG.EMBEDDING_MODEL);

  const { embeddings } = await embedMany({
    model,
    values: texts,
  });

  return embeddings;
}

// ============================================================================
// Supabase Upsert Functions
// ============================================================================

/**
 * Upsert community knowledge chunks with their embeddings into Supabase.
 *
 * @param supabase - Supabase service role client (bypasses RLS)
 * @param chunks - Chunk metadata
 * @param embeddings - Corresponding embedding vectors
 * @returns Indexing result with success/failure counts
 */
export async function upsertChunksWithEmbeddings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  chunks: CommunityChunk[],
  embeddings: number[][]
): Promise<IndexingResult> {
  const result: IndexingResult = {
    indexed: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  if (chunks.length !== embeddings.length) {
    result.errors.push(
      `Chunk/embedding count mismatch: ${chunks.length} chunks, ${embeddings.length} embeddings`
    );
    result.failed = chunks.length;
    return result;
  }

  // Process in batches
  const batchSize = COMMUNITY_RAG_CONFIG.BATCH_SIZE;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchChunks = chunks.slice(i, i + batchSize);
    const batchEmbeddings = embeddings.slice(i, i + batchSize);

    const records = batchChunks.map((chunk, idx) => ({
      source_type: chunk.source_type,
      source_id: chunk.source_id,
      chunk_text: chunk.chunk_text,
      chunk_index: chunk.chunk_index,
      author_id: chunk.author_id,
      tags: chunk.tags,
      gear_names: chunk.gear_names,
      brand_names: chunk.brand_names,
      source_created_at: chunk.source_created_at,
      embedding: `[${batchEmbeddings[idx].join(',')}]`,
      indexed_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('community_knowledge_chunks')
      .upsert(records, {
        onConflict: 'source_type,source_id,chunk_index',
      });

    if (error) {
      result.failed += batchChunks.length;
      result.errors.push(`Batch upsert error: ${error.message}`);
    } else {
      result.indexed += batchChunks.length;
    }
  }

  return result;
}

/**
 * Delete all chunks for a given source (e.g., when a post is deleted).
 */
export async function deleteChunksForSource(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  sourceType: string,
  sourceId: string
): Promise<void> {
  const { error } = await supabase
    .from('community_knowledge_chunks')
    .delete()
    .eq('source_type', sourceType)
    .eq('source_id', sourceId);

  if (error) {
    console.error(`[Community RAG] Failed to delete chunks for ${sourceType}/${sourceId}:`, error.message);
  }
}
