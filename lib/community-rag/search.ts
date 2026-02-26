/**
 * Community Knowledge Search Service
 * Feature: Community-RAG Integration (Vorschlag 15)
 *
 * Performs semantic search across community knowledge (bulletin posts,
 * replies, shakedowns) using pgvector embeddings in Supabase.
 * Called by the searchGearKnowledge tool to enrich agent responses
 * with real community experiences.
 */

import { createServiceRoleClient } from '@/lib/supabase/server';
import { generateQueryEmbedding } from './embedder';
import type { CommunitySearchResult, CommunitySearchOptions } from './types';
import { COMMUNITY_RAG_CONFIG } from './types';

// ============================================================================
// Quality Filter Helpers
// ============================================================================

/**
 * Compute the effective minimum reply count for quality filtering.
 *
 * Merges `minReplies` and the `excludeNoEngagement` shorthand into a single
 * value that can be passed to the database RPC.
 *
 * Rules:
 * - Both absent → `null` (no filter applied)
 * - `minReplies` only → use that value
 * - `excludeNoEngagement: true` → require at least 1 reply
 * - Both set → `Math.max(minReplies, 1)` (more restrictive wins)
 *
 * Exported for direct unit testing — the pure function is easier to test than
 * going through the full search stack with mocked Supabase clients.
 *
 * @example
 * computeEffectiveMinReplies({})                                    // null
 * computeEffectiveMinReplies({ minReplies: 3 })                     // 3
 * computeEffectiveMinReplies({ excludeNoEngagement: true })         // 1
 * computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 3 }) // 3
 * computeEffectiveMinReplies({ excludeNoEngagement: true, minReplies: 0 }) // 1
 */
export function computeEffectiveMinReplies(options: {
  minReplies?: number | null;
  excludeNoEngagement?: boolean;
}): number | null {
  const { minReplies = null, excludeNoEngagement = false } = options;

  if (excludeNoEngagement) {
    return Math.max(minReplies ?? 0, 1);
  }

  return minReplies ?? null;
}

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search community knowledge using semantic similarity.
 *
 * @param query - Natural language search query
 * @param options - Search options (topK, threshold, filters)
 * @returns Array of relevant community knowledge results
 */
export async function searchCommunityKnowledge(
  query: string,
  options: CommunitySearchOptions = {}
): Promise<CommunitySearchResult[]> {
  const {
    topK = COMMUNITY_RAG_CONFIG.DEFAULT_TOP_K,
    threshold = COMMUNITY_RAG_CONFIG.DEFAULT_THRESHOLD,
    sourceType = null,
    tags = null,
    minReplies = null,
    maxAgeMonths = null,
    excludeNoEngagement = false,
  } = options;

  const effectiveMinReplies = computeEffectiveMinReplies({ minReplies, excludeNoEngagement });

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Call the Supabase RPC function for vector search
    const supabase = createServiceRoleClient();

    // Normalize 0 → null for both filter params before sending to DB:
    //   - minReplies: 0 → `reply_count >= 0` (always true) === `null` (no filter applied),
    //     but sends an unnecessary WHERE predicate. Normalise for canonical behaviour.
    //   - maxAgeMonths: 0 → `NOW() - 0 months = NOW()`, which returns zero results since no
    //     content is timestamped in the future. 0 should mean "disabled" (= null), not empty.
    // The tool layer already guards against this for env-var paths; this normalisation ensures
    // direct callers of searchCommunityKnowledge also get consistent semantics.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC function not yet in generated Supabase types
    const { data, error } = await (supabase as any).rpc('search_community_knowledge', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      similarity_threshold: threshold,
      max_results: topK,
      filter_source_type: sourceType,
      filter_tags: tags,
      filter_max_age_months: maxAgeMonths === 0 ? null : (maxAgeMonths ?? null),
      filter_min_replies: effectiveMinReplies === 0 ? null : effectiveMinReplies,
    });

    if (error) {
      console.error('[Community RAG] Search error:', error.message);
      return [];
    }

    return (data || []) as CommunitySearchResult[];
  } catch (error) {
    // Graceful degradation - community knowledge is enrichment, not critical
    console.error(
      '[Community RAG] Search failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

/**
 * Format community search results for inclusion in agent tool responses.
 * Creates human-readable summaries that the agent can incorporate into answers.
 *
 * @param results - Raw search results from searchCommunityKnowledge
 * @returns Formatted array of community insights
 */
export function formatCommunityResults(
  results: CommunitySearchResult[]
): Array<{ source: string; content: string; similarity: number }> {
  return results.map(result => {
    const sourceLabel = result.source_type === 'bulletin_post'
      ? 'Community Post'
      : result.source_type === 'bulletin_reply'
        ? 'Community Reply'
        : result.source_type === 'shakedown'
          ? 'Shakedown Review'
          : 'Community Feedback';

    // Include tag context if available
    const tagSuffix = result.tags.length > 0
      ? ` [${result.tags.join(', ')}]`
      : '';

    return {
      source: `${sourceLabel}${tagSuffix}`,
      content: result.chunk_text,
      similarity: Math.round(result.similarity * 100) / 100,
    };
  });
}
