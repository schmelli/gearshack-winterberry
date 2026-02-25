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
  } = options;

  try {
    // Generate embedding for the search query
    const queryEmbedding = await generateQueryEmbedding(query);

    // Call the Supabase RPC function for vector search
    const supabase = createServiceRoleClient();

    const { data, error } = await supabase.rpc('search_community_knowledge', {
      query_embedding: `[${queryEmbedding.join(',')}]`,
      similarity_threshold: threshold,
      max_results: topK,
      filter_source_type: sourceType,
      filter_tags: tags,
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
