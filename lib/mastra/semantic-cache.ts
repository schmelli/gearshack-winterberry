/**
 * Semantic Response Cache
 * Feature: Intelligent Response Caching (Vorschlag 19, Kap. 31)
 *
 * Uses pgvector cosine similarity to match incoming queries against
 * previously cached AI responses. Factual questions like
 * "What's the difference between Gore-Tex and eVent?" are served
 * from cache instead of making a full LLM call.
 *
 * Architecture:
 *   - Embedding model: text-embedding-3-small (1536 dims) via AI Gateway
 *   - Storage: Supabase PostgreSQL with pgvector HNSW index
 *   - Similarity threshold: 0.95 (very strict — near-identical questions)
 *   - TTL: 48 hours for general_knowledge intents
 *   - Global cache (not per-user) — factual answers are user-independent
 *
 * @see supabase/migrations/20260225000001_response_cache.sql
 */

import { embed } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { createClient } from '@/lib/supabase/server';
import { logInfo, logDebug, logWarn, logError, createTimer } from './logging';
import {
  recordCacheHit,
  recordCacheMiss,
  recordCacheStore,
  recordCacheLatency,
} from './metrics';

// =============================================================================
// Configuration
// =============================================================================

/** Cosine similarity threshold — only serve cache for near-identical questions */
const SIMILARITY_THRESHOLD = parseFloat(
  process.env.RESPONSE_CACHE_SIMILARITY_THRESHOLD || '0.95'
);

/** Cache TTL in hours */
const CACHE_TTL_HOURS = parseInt(
  process.env.RESPONSE_CACHE_TTL_HOURS || '48',
  10
);

/** Minimum response length to cache (skip very short answers) */
const MIN_RESPONSE_LENGTH = 50;

/** Maximum cached response length to prevent storing huge responses */
const MAX_RESPONSE_LENGTH = 10000;

/** Feature flag to enable/disable response caching */
const CACHE_ENABLED = process.env.RESPONSE_CACHE_ENABLED !== 'false';

/** Intent types that are eligible for caching (factual, user-independent) */
const CACHEABLE_INTENTS = new Set([
  'general_knowledge',
  'gear_comparison',
]);

// Eagerly-initialized gateway constant — fails fast if the API key is missing
// (CACHE_ENABLED guards all public functions, so this is only reached when caching is on)
const embeddingGateway = createGateway({
  apiKey: process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY || '',
});

// =============================================================================
// Public API
// =============================================================================

/**
 * Check if a query intent is eligible for caching.
 *
 * Only factual, user-independent questions should be cached.
 * Personal questions like "How many tents do I have?" must never be cached.
 */
export function isCacheableIntent(intentType: string): boolean {
  return CACHE_ENABLED && CACHEABLE_INTENTS.has(intentType);
}

/**
 * Search for a semantically similar cached response.
 *
 * Generates an embedding for the query, then uses pgvector cosine similarity
 * to find the best matching cached response above the threshold.
 *
 * @param query - The user's question
 * @param locale - User locale (en/de)
 * @param threshold - Similarity threshold (default: 0.95)
 * @returns Cached response string or null if no match
 */
export async function getSemanticCacheHit(
  query: string,
  locale: string = 'en',
  threshold: number = SIMILARITY_THRESHOLD
): Promise<{ response: string; cacheId: string; similarity: number } | null> {
  if (!CACHE_ENABLED) return null;

  const getElapsed = createTimer();

  try {
    // Generate embedding for the incoming query
    const queryEmbedding = await generateQueryEmbedding(query);
    if (!queryEmbedding) return null;

    // Search cache via Supabase RPC
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('search_response_cache', {
      query_embedding: queryEmbedding,
      similarity_threshold: threshold,
      max_age_hours: CACHE_TTL_HOURS,
      query_locale: locale,
    });

    const latencyMs = getElapsed();
    recordCacheLatency(latencyMs);

    if (error) {
      logError('Cache search RPC failed', new Error(error.message));
      recordCacheMiss();
      return null;
    }

    if (data && data.length > 0) {
      const hit = data[0];

      // Increment hit count asynchronously (fire-and-forget)
      supabase.rpc('increment_cache_hit_count', { cache_id: hit.id }).then(
        () => {},
        (err: Error) => logWarn('Failed to increment cache hit count', {
          metadata: { cacheId: hit.id, error: err.message },
        })
      );

      logInfo('Semantic cache hit', {
        metadata: {
          cacheId: hit.id,
          similarity: hit.similarity,
          hitCount: hit.hit_count + 1,
          originalQuery: hit.query_text?.substring(0, 80),
          latencyMs,
        },
      });

      recordCacheHit();
      return {
        response: hit.cached_response,
        cacheId: hit.id,
        similarity: hit.similarity,
      };
    }

    logDebug('Semantic cache miss', {
      metadata: {
        queryPreview: query.substring(0, 80),
        locale,
        threshold,
        latencyMs,
      },
    });

    recordCacheMiss();
    return null;
  } catch (error) {
    logWarn('Semantic cache lookup failed', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });
    recordCacheMiss();
    return null;
  }
}

/**
 * Store a response in the semantic cache.
 *
 * Called after a successful LLM response for a cacheable intent.
 * Generates an embedding and stores the query-response pair.
 *
 * @param query - The original user question
 * @param response - The AI-generated response
 * @param intentType - The classified intent type
 * @param locale - User locale (en/de)
 */
export async function storeInSemanticCache(
  query: string,
  response: string,
  intentType: string,
  locale: string = 'en'
): Promise<void> {
  if (!CACHE_ENABLED) return;
  if (!isCacheableIntent(intentType)) return;

  // Skip caching very short or very long responses
  if (response.length < MIN_RESPONSE_LENGTH || response.length > MAX_RESPONSE_LENGTH) {
    logDebug('Skipping cache store — response length out of range', {
      metadata: { responseLength: response.length, intentType },
    });
    return;
  }

  try {
    const queryEmbedding = await generateQueryEmbedding(query);
    if (!queryEmbedding) return;

    const supabase = await createClient();

    // Calculate expiry based on TTL
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

    const { error } = await supabase.from('response_cache').upsert({
      query_text: query,
      query_embedding: queryEmbedding,
      cached_response: response,
      intent_type: intentType,
      locale,
      expires_at: expiresAt.toISOString(),
    }, { onConflict: 'query_text,locale,intent_type', ignoreDuplicates: true });

    if (error) {
      logError('Failed to store response in cache', new Error(error.message));
      return;
    }

    logInfo('Response stored in semantic cache', {
      metadata: {
        queryPreview: query.substring(0, 80),
        responseLength: response.length,
        intentType,
        locale,
        expiresAt: expiresAt.toISOString(),
      },
    });

    recordCacheStore();
  } catch (error) {
    // Cache storage failures should never break the user experience
    logWarn('Failed to store in semantic cache', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
      },
    });
  }
}

// =============================================================================
// Internal Helpers
// =============================================================================

/**
 * Generate an embedding vector for a query using AI Gateway.
 *
 * Uses the same model (text-embedding-3-small) as the Mastra memory system
 * for consistency.
 */
async function generateQueryEmbedding(query: string): Promise<number[] | null> {
  try {
    const result = await embed({
      model: embeddingGateway.textEmbeddingModel('openai/text-embedding-3-small'),
      value: query,
    });

    return result.embedding;
  } catch (error) {
    logWarn('Failed to generate query embedding for cache', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        queryLength: query.length,
      },
    });
    return null;
  }
}
