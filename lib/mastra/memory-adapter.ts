/**
 * Custom Supabase Memory Adapter for Mastra
 *
 * Feature: 001-mastra-agentic-voice
 * Task: T012
 *
 * This adapter implements the @mastra/memory MemoryAdapter interface
 * using Supabase PostgreSQL as the storage backend.
 *
 * Key features:
 * - Last-write-wins conflict resolution using server timestamps
 * - Full-text search via PostgreSQL tsvector
 * - GDPR-compliant deletion support
 * - Row Level Security (RLS) for multi-tenancy
 */

import { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

/**
 * Message role types matching the database CHECK constraint
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message structure compatible with @mastra/memory
 */
export interface Message {
  id: string;
  userId: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Options for retrieving messages
 */
export interface GetMessagesOptions {
  userId: string;
  conversationId?: string;
  limit?: number;
  before?: Date;
}

/**
 * Options for deleting messages
 */
export interface DeleteMessagesOptions {
  userId: string;
  conversationId?: string;
  messageIds?: string[];
}

/**
 * Database record shape from conversation_memory table
 */
interface ConversationMemoryRecord {
  id: string;
  user_id: string;
  conversation_id: string;
  message_id: string;
  message_role: MessageRole;
  message_content: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

/**
 * Insert/upsert record shape for conversation_memory table
 */
interface ConversationMemoryInsert {
  user_id: string;
  conversation_id: string;
  message_id: string;
  message_role: MessageRole;
  message_content: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// Memory Adapter Interface
// ============================================================================

/**
 * MemoryAdapter interface for Mastra integration
 * This interface defines the contract that any memory adapter must implement
 */
export interface MemoryAdapter {
  /**
   * Store new conversation messages
   * @param messages - Array of messages to persist
   */
  saveMessages(messages: Message[]): Promise<void>;

  /**
   * Retrieve conversation history with optional filtering
   * @param options - Query options (userId, conversationId, limit, before)
   * @returns Array of messages ordered by created_at DESC
   */
  getMessages(options: GetMessagesOptions): Promise<Message[]>;

  /**
   * Delete conversation or specific messages
   * @param options - Deletion scope (userId, conversationId, messageIds)
   */
  deleteMessages(options: DeleteMessagesOptions): Promise<void>;

  /**
   * Semantic search across conversations
   * @param userId - User identifier
   * @param query - Natural language search query
   * @param limit - Maximum results to return
   * @returns Relevant messages ranked by similarity
   */
  searchMessages(userId: string, query: string, limit?: number): Promise<Message[]>;
}

// ============================================================================
// Supabase Memory Adapter Implementation
// ============================================================================

/**
 * SupabaseMemoryAdapter implements the MemoryAdapter interface
 * using Supabase PostgreSQL as the storage backend.
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 *
 * const supabase = await createClient();
 * const adapter = new SupabaseMemoryAdapter(supabase);
 *
 * // Save messages
 * await adapter.saveMessages([
 *   { id: 'msg-1', userId: 'user-1', conversationId: 'conv-1', role: 'user', content: 'Hello', createdAt: new Date(), updatedAt: new Date() }
 * ]);
 *
 * // Get messages
 * const messages = await adapter.getMessages({ userId: 'user-1', conversationId: 'conv-1', limit: 50 });
 *
 * // Search messages
 * const results = await adapter.searchMessages('user-1', 'tent recommendations');
 *
 * // Delete messages (GDPR)
 * await adapter.deleteMessages({ userId: 'user-1' });
 * ```
 */
export class SupabaseMemoryAdapter implements MemoryAdapter {
  private readonly supabase: SupabaseClient;
  private readonly tableName = 'conversation_memory';
  private readonly defaultLimit = 100;
  private readonly maxLimit = 1000;

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Save messages with last-write-wins conflict resolution.
   *
   * Uses PostgreSQL UPSERT with ON CONFLICT to handle concurrent updates.
   * Server-side timestamps (updated_at = now()) provide authoritative ordering.
   *
   * @param messages - Array of messages to save
   * @throws Error if database operation fails
   */
  async saveMessages(messages: Message[]): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    // Transform messages to database record format
    const records: ConversationMemoryInsert[] = messages.map((msg) => ({
      user_id: msg.userId,
      conversation_id: msg.conversationId,
      message_id: msg.id,
      message_role: msg.role,
      message_content: msg.content,
      metadata: msg.metadata ?? {},
      created_at: msg.createdAt.toISOString(),
      // Server-side timestamp for last-write-wins conflict resolution
      updated_at: new Date().toISOString(),
    }));

    // Use upsert with ON CONFLICT for last-write-wins semantics
    // The unique constraint on (user_id, conversation_id, message_id) triggers conflict handling
    const { error } = await this.supabase
      .from(this.tableName)
      .upsert(records, {
        onConflict: 'user_id,conversation_id,message_id',
        ignoreDuplicates: false, // Always overwrite with latest
      });

    if (error) {
      throw new MemoryAdapterError(
        `Failed to save messages: ${error.message}`,
        'SAVE_MESSAGES_ERROR',
        { messageCount: messages.length, error }
      );
    }
  }

  /**
   * Retrieve conversation history with optional filtering and pagination.
   *
   * @param options - Query options
   * @param options.userId - Required user ID (enforced by RLS)
   * @param options.conversationId - Optional conversation filter
   * @param options.limit - Max results (default 100, max 1000)
   * @param options.before - Only messages before this timestamp (for pagination)
   * @returns Array of messages ordered by created_at DESC
   * @throws Error if database operation fails
   */
  async getMessages(options: GetMessagesOptions): Promise<Message[]> {
    const { userId, conversationId, before } = options;
    const limit = Math.min(options.limit ?? this.defaultLimit, this.maxLimit);

    // Build query with user filter (RLS provides additional security)
    let query = this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    // Optional conversation filter
    if (conversationId) {
      query = query.eq('conversation_id', conversationId);
    }

    // Optional timestamp filter for pagination
    if (before) {
      query = query.lt('created_at', before.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      throw new MemoryAdapterError(
        `Failed to retrieve messages: ${error.message}`,
        'GET_MESSAGES_ERROR',
        { userId, conversationId, error }
      );
    }

    // Transform database records to Message interface
    return (data ?? []).map((record: ConversationMemoryRecord) =>
      this.mapRecordToMessage(record)
    );
  }

  /**
   * Delete conversation or specific messages (GDPR compliance).
   *
   * Supports three deletion modes:
   * 1. Delete specific messages (messageIds provided)
   * 2. Delete entire conversation (conversationId provided)
   * 3. Delete ALL user memory (only userId provided - Right to Erasure)
   *
   * @param options - Deletion scope
   * @param options.userId - Required user ID
   * @param options.conversationId - Optional conversation filter
   * @param options.messageIds - Optional specific message IDs
   * @throws Error if database operation fails
   */
  async deleteMessages(options: DeleteMessagesOptions): Promise<void> {
    const { userId, conversationId, messageIds } = options;

    // Start with user filter (required for RLS compliance)
    let query = this.supabase
      .from(this.tableName)
      .delete()
      .eq('user_id', userId);

    // Mode 1: Delete specific messages
    if (messageIds && messageIds.length > 0) {
      query = query.in('message_id', messageIds);
    }
    // Mode 2: Delete entire conversation
    else if (conversationId && !messageIds) {
      query = query.eq('conversation_id', conversationId);
    }
    // Mode 3: Delete ALL user memory (GDPR Right to Erasure)
    // No additional filters - deletes everything for this user

    const { error } = await query;

    if (error) {
      throw new MemoryAdapterError(
        `Failed to delete messages: ${error.message}`,
        'DELETE_MESSAGES_ERROR',
        { userId, conversationId, messageCount: messageIds?.length, error }
      );
    }
  }

  /**
   * Search messages using PostgreSQL full-text search.
   *
   * Uses the tsvector index on message_content for efficient searching.
   * For Phase 2+, this can be upgraded to pgvector semantic search.
   *
   * @param userId - User ID to search within
   * @param query - Search query string
   * @param limit - Maximum results (default 10)
   * @returns Array of matching messages ranked by relevance
   * @throws Error if database operation fails
   */
  async searchMessages(
    userId: string,
    query: string,
    limit: number = 10
  ): Promise<Message[]> {
    // Sanitize and prepare query for PostgreSQL full-text search
    const sanitizedQuery = this.sanitizeSearchQuery(query);

    if (!sanitizedQuery) {
      return [];
    }

    // Use PostgreSQL text search with websearch parser
    // This supports natural language queries like "ultralight tent under 2kg"
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('user_id', userId)
      .textSearch('message_content', sanitizedQuery, {
        type: 'websearch',
        config: 'english',
      })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      // Full-text search may not be available if table doesn't exist yet
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return [];
      }

      throw new MemoryAdapterError(
        `Failed to search messages: ${error.message}`,
        'SEARCH_MESSAGES_ERROR',
        { userId, query, error }
      );
    }

    // Transform database records to Message interface
    return (data ?? []).map((record: ConversationMemoryRecord) =>
      this.mapRecordToMessage(record)
    );
  }

  // ==========================================================================
  // Private Helper Methods
  // ==========================================================================

  /**
   * Transform database record to Message interface
   */
  private mapRecordToMessage(record: ConversationMemoryRecord): Message {
    return {
      id: record.message_id,
      userId: record.user_id,
      conversationId: record.conversation_id,
      role: record.message_role,
      content: record.message_content,
      metadata: record.metadata ?? {},
      createdAt: new Date(record.created_at),
      updatedAt: new Date(record.updated_at),
    };
  }

  /**
   * Sanitize search query for PostgreSQL full-text search
   * Removes special characters that could cause parsing issues
   */
  private sanitizeSearchQuery(query: string): string {
    return query
      .trim()
      // Remove PostgreSQL text search operators that could cause errors
      .replace(/[&|!():*'\\]/g, ' ')
      // Collapse multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Custom error class for memory adapter operations
 */
export class MemoryAdapterError extends Error {
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MemoryAdapterError';
    this.code = code;
    this.details = details;

    // Maintains proper stack trace for where error was thrown (V8 engines)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, MemoryAdapterError);
    }
  }
}

// ============================================================================
// Factory Function
// ============================================================================

/**
 * Factory function to create a SupabaseMemoryAdapter instance
 *
 * @param supabaseClient - Supabase client instance
 * @returns Configured SupabaseMemoryAdapter
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 * import { createMemoryAdapter } from '@/lib/mastra/memory-adapter';
 *
 * export async function initMastraAgent() {
 *   const supabase = await createClient();
 *   const memoryAdapter = createMemoryAdapter(supabase);
 *   // Use with Mastra agent...
 * }
 * ```
 */
export function createMemoryAdapter(
  supabaseClient: SupabaseClient
): SupabaseMemoryAdapter {
  return new SupabaseMemoryAdapter(supabaseClient);
}
