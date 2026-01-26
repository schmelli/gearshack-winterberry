/**
 * Embedding Service for Semantic Recall
 * Feature: 002-mastra-memory-system
 *
 * Generates vector embeddings using Vercel AI Gateway with
 * OpenAI's text-embedding-3-small model (1536 dimensions).
 *
 * Used for:
 * - Embedding new conversation messages for future recall
 * - Embedding search queries for similarity matching
 * - Batch embedding for backfilling historical messages
 */

import { embed, embedMany } from 'ai';
import { createGateway } from '@ai-sdk/gateway';

// =============================================================================
// Configuration
// =============================================================================

const AI_GATEWAY_KEY =
  process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;

/**
 * Embedding model: OpenAI text-embedding-3-small via Vercel AI Gateway
 * - 1536 dimensions
 * - $0.00002 per 1K tokens (~negligible cost)
 * - Fast inference (~50ms per embedding)
 */
const EMBEDDING_MODEL = 'openai/text-embedding-3-small';

/**
 * Embedding vector dimensions (must match pgvector column definition)
 */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Maximum batch size for embedMany (API limit)
 */
export const MAX_BATCH_SIZE = 100;

// =============================================================================
// Gateway Setup
// =============================================================================

function getGateway() {
  if (!AI_GATEWAY_KEY) {
    throw new Error(
      'AI_GATEWAY_API_KEY is required for embedding generation. ' +
        'Set AI_GATEWAY_API_KEY or AI_GATEWAY_KEY in your environment.'
    );
  }
  return createGateway({ apiKey: AI_GATEWAY_KEY });
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Generate embedding for a single text string
 *
 * @param text - Text to embed (message content)
 * @returns 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const gateway = getGateway();
  const { embedding } = await embed({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });
  return embedding;
}

/**
 * Generate embeddings for multiple texts in a single batch
 *
 * More efficient than calling generateEmbedding() in a loop.
 * Used for backfilling historical messages.
 *
 * @param texts - Array of texts to embed
 * @returns Array of 1536-dimensional vectors (same order as input)
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const gateway = getGateway();
  const { embeddings } = await embedMany({
    model: gateway.textEmbeddingModel(EMBEDDING_MODEL),
    values: texts,
  });
  return embeddings;
}

/**
 * Check if embedding service is available
 * (API key configured)
 */
export function isEmbeddingAvailable(): boolean {
  return !!AI_GATEWAY_KEY;
}
