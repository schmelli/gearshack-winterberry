/**
 * Semantic Recall Service
 * Feature: 002-mastra-memory-system
 *
 * Provides vector-based similarity search across a user's conversation history.
 * Uses pgvector in Supabase for cosine similarity matching.
 *
 * Architecture:
 * - Resource-scoped: searches across ALL conversations for a user
 * - Returns top-K matches with surrounding context (messageRange)
 * - Uses text-embedding-3-small (1536 dimensions) via Vercel AI Gateway
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { generateEmbedding, isEmbeddingAvailable } from './embedding-service';

// =============================================================================
// Types
// =============================================================================

export interface SemanticRecallConfig {
  /** Number of similar messages to retrieve */
  topK: number;
  /** Number of context messages before/after each match */
  messageRange: number;
  /** Minimum similarity score (0-1, cosine) */
  threshold: number;
}

export interface SemanticMatch {
  messageId: string;
  conversationId: string;
  role: string;
  content: string;
  similarity: number;
  createdAt: string;
  context: ContextMessage[];
}

export interface ContextMessage {
  messageId: string;
  role: string;
  content: string;
  createdAt: string;
  position: 'before' | 'match' | 'after';
}

// =============================================================================
// Default Configuration
// =============================================================================

export const DEFAULT_SEMANTIC_CONFIG: SemanticRecallConfig = {
  topK: 5,
  messageRange: 2,
  threshold: 0.7,
};

// =============================================================================
// Public API
// =============================================================================

/**
 * Search for semantically similar messages across all user conversations
 *
 * Flow:
 * 1. Generate embedding for the query text
 * 2. Search pgvector for similar messages (cosine distance)
 * 3. Fetch surrounding context for each match
 * 4. Return matches with context, sorted by similarity
 *
 * @param supabase - Supabase client (authenticated)
 * @param userId - User ID to search within
 * @param query - Natural language query text
 * @param config - Search configuration (topK, threshold, messageRange)
 * @returns Array of semantic matches with surrounding context
 */
export async function searchSimilarMessages(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  config: SemanticRecallConfig = DEFAULT_SEMANTIC_CONFIG
): Promise<SemanticMatch[]> {
  if (!isEmbeddingAvailable()) {
    console.warn('[Semantic Recall] Embedding service not available, skipping');
    return [];
  }

  try {
    // Step 1: Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Step 2: Search pgvector for similar messages
    const { data: matches, error: searchError } = await supabase.rpc(
      'search_similar_messages',
      {
        p_user_id: userId,
        p_query_embedding: JSON.stringify(queryEmbedding),
        p_limit: config.topK,
        p_threshold: config.threshold,
      }
    );

    if (searchError) {
      console.error('[Semantic Recall] Search failed:', searchError.message);
      return [];
    }

    if (!matches || matches.length === 0) {
      return [];
    }

    // Step 3: Fetch surrounding context for each match
    const matchesWithContext: SemanticMatch[] = await Promise.all(
      matches.map(
        async (match: {
          message_id: string;
          conversation_id: string;
          message_role: string;
          message_content: string;
          similarity: number;
          created_at: string;
        }) => {
          const context = await fetchMessageContext(
            supabase,
            userId,
            match.conversation_id,
            match.message_id,
            config.messageRange
          );

          return {
            messageId: match.message_id,
            conversationId: match.conversation_id,
            role: match.message_role,
            content: match.message_content,
            similarity: match.similarity,
            createdAt: match.created_at,
            context,
          };
        }
      )
    );

    console.log(
      `[Semantic Recall] Found ${matchesWithContext.length} matches for user ${userId}`
    );

    return matchesWithContext;
  } catch (error) {
    console.error(
      '[Semantic Recall] Error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return [];
  }
}

/**
 * Embed and store a new message for future semantic recall
 *
 * @param supabase - Supabase client
 * @param messageId - UUID of the conversation_memory row
 * @param content - Message content to embed
 */
export async function embedAndStoreMessage(
  supabase: SupabaseClient,
  messageId: string,
  content: string
): Promise<void> {
  if (!isEmbeddingAvailable()) return;

  try {
    const embedding = await generateEmbedding(content);

    const { error } = await supabase
      .from('conversation_memory')
      .update({ embedding: JSON.stringify(embedding) })
      .eq('message_id', messageId);

    if (error) {
      console.error(
        `[Semantic Recall] Failed to store embedding for message ${messageId}:`,
        error.message
      );
    }
  } catch (error) {
    // Non-blocking: log but don't fail the request
    console.error(
      '[Semantic Recall] Embedding generation failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

/**
 * Format semantic matches for inclusion in a system prompt
 *
 * @param matches - Array of semantic matches
 * @param locale - User's locale ('en' | 'de')
 * @returns Formatted string for system prompt, or empty string if no matches
 */
export function formatSemanticRecallForPrompt(
  matches: SemanticMatch[],
  locale: string = 'en'
): string {
  if (matches.length === 0) return '';

  const isGerman = locale === 'de';
  const header = isGerman
    ? '**Relevante fruehere Gespraeche:**'
    : '**Relevant past conversations:**';
  const note = isGerman
    ? 'HINWEIS: Diese Nachrichten stammen aus frueheren Gespraechen und koennten fuer die aktuelle Frage relevant sein. Beziehe dich natuerlich auf diesen Kontext, aber erwaehne nicht explizit, dass du in frueheren Gespraechen gesucht hast.'
    : "NOTE: These messages are from past conversations and may be relevant to the current question. Naturally reference this context but don't explicitly mention that you searched previous conversations.";

  const formattedMatches = matches.map((match, i) => {
    const contextBefore = match.context
      .filter((c) => c.position === 'before')
      .map((c) => `  ${c.role}: ${c.content}`)
      .join('\n');

    const contextAfter = match.context
      .filter((c) => c.position === 'after')
      .map((c) => `  ${c.role}: ${c.content}`)
      .join('\n');

    const parts = [`${i + 1}. [similarity: ${match.similarity.toFixed(2)}]`];
    if (contextBefore) parts.push(contextBefore);
    parts.push(`  **${match.role}**: ${match.content}`);
    if (contextAfter) parts.push(contextAfter);

    return parts.join('\n');
  });

  return `\n${header}\n${formattedMatches.join('\n\n')}\n\n**${note}**`;
}

// =============================================================================
// Private Helpers
// =============================================================================

/**
 * Fetch surrounding context messages for a matched message
 */
async function fetchMessageContext(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string,
  messageId: string,
  contextRange: number
): Promise<ContextMessage[]> {
  try {
    const { data, error } = await supabase.rpc('get_message_with_context', {
      p_user_id: userId,
      p_conversation_id: conversationId,
      p_message_id: messageId,
      p_context_range: contextRange,
    });

    if (error || !data) {
      return [];
    }

    return data.map(
      (row: {
        out_message_id: string;
        out_message_role: string;
        out_message_content: string;
        out_created_at: string;
        out_position: string;
      }) => ({
        messageId: row.out_message_id,
        role: row.out_message_role,
        content: row.out_message_content,
        createdAt: row.out_created_at,
        position: row.out_position as 'before' | 'match' | 'after',
      })
    );
  } catch {
    return [];
  }
}
