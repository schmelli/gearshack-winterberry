/**
 * Mastra Agent Initialization
 * Feature: 001-mastra-agentic-voice
 * Task: T014 - Create Mastra agent initialization
 *
 * This module provides the unified agent initialization for the Mastra AI assistant.
 * It connects all the components: memory adapter, auth adapter, config, tools, and observability.
 *
 * Architecture: Server-side only, integrates with Next.js API routes
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { mastraAgentConfig, buildMastraSystemPrompt, type PromptContext } from './config';
import { SupabaseMemoryAdapter, createMemoryAdapter } from './memory-adapter';
import { SupabaseAuthProvider, createAuthProvider } from './auth-adapter';
import { logInfo, logError, logDebug, setLogContext, clearLogContext, createTimer } from './logging';
import { recordChatRequest, recordAgentLatency, recordChatError, classifyQuery, recordTokenUsage } from './metrics';
import { traceWorkflowStep, addSpanAttributes, getTraceId } from './tracing';
import type { Database } from '@/types/supabase';

// ==================== Types ====================

/**
 * Options for generating a response from the Mastra agent
 */
export interface GenerateOptions {
  /** User ID for memory isolation */
  userId: string;
  /** Conversation ID for thread isolation */
  conversationId: string;
  /** User message to process */
  message: string;
  /** Prompt context for dynamic system prompt building */
  promptContext: PromptContext;
  /** Maximum tokens for response */
  maxTokens?: number;
}

/**
 * Result from agent generation
 */
export interface GenerateResult {
  /** The generated response text */
  text: string;
  /** Tool calls made during generation */
  toolCalls?: ToolCallResult[];
  /** Latency in milliseconds */
  latencyMs: number;
  /** Trace ID for observability */
  traceId: string;
}

/**
 * Tool call result
 */
export interface ToolCallResult {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

/**
 * Agent context containing initialized adapters
 */
export interface AgentContext {
  memoryAdapter: SupabaseMemoryAdapter;
  authProvider: SupabaseAuthProvider;
  config: typeof mastraAgentConfig;
}

// ==================== Agent Factory ====================

/**
 * Create an agent context with all required adapters
 *
 * @param supabaseClient - Authenticated Supabase client
 * @returns Initialized agent context
 *
 * @example
 * ```typescript
 * import { createClient } from '@/lib/supabase/server';
 * import { createAgentContext } from '@/lib/mastra/agent';
 *
 * const supabase = await createClient();
 * const agentContext = createAgentContext(supabase);
 * ```
 */
export function createAgentContext(
  supabaseClient: SupabaseClient<Database>
): AgentContext {
  return {
    memoryAdapter: createMemoryAdapter(supabaseClient),
    authProvider: createAuthProvider(supabaseClient),
    config: mastraAgentConfig,
  };
}

// ==================== Memory Functions ====================

/**
 * Fetch conversation history from memory
 *
 * @param agentContext - Initialized agent context
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @param limit - Maximum messages to retrieve (default: 50)
 * @returns Array of messages ordered by created_at DESC
 */
export async function fetchConversationHistory(
  agentContext: AgentContext,
  userId: string,
  conversationId: string,
  limit: number = 50
): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
  try {
    const messages = await agentContext.memoryAdapter.getMessages({
      userId,
      conversationId,
      limit,
    });

    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));
  } catch (error) {
    logError('Failed to fetch conversation history', error, {
      userId,
      conversationId,
    });
    // Return empty array on failure - allows graceful degradation
    return [];
  }
}

/**
 * Save messages to memory
 *
 * @param agentContext - Initialized agent context
 * @param userId - User ID
 * @param conversationId - Conversation ID
 * @param userMessage - User's message
 * @param assistantResponse - Assistant's response
 */
export async function saveToMemory(
  agentContext: AgentContext,
  userId: string,
  conversationId: string,
  userMessage: string,
  assistantResponse: string
): Promise<void> {
  try {
    const now = new Date();
    await agentContext.memoryAdapter.saveMessages([
      {
        id: `user-${Date.now()}`,
        userId,
        conversationId,
        role: 'user',
        content: userMessage,
        createdAt: now,
        updatedAt: now,
      },
      {
        id: `assistant-${Date.now() + 1}`,
        userId,
        conversationId,
        role: 'assistant',
        content: assistantResponse,
        createdAt: new Date(now.getTime() + 1), // Ensure ordering
        updatedAt: new Date(now.getTime() + 1),
      },
    ]);

    logDebug('Messages saved to memory', {
      userId,
      conversationId,
    });
  } catch (error) {
    // Log but don't fail the main request
    logError('Failed to save messages to memory', error, {
      userId,
      conversationId,
    });
  }
}

/**
 * Search conversation memory for relevant context
 *
 * @param agentContext - Initialized agent context
 * @param userId - User ID
 * @param query - Search query
 * @param limit - Maximum results (default: 10)
 * @returns Relevant messages
 */
export async function searchMemory(
  agentContext: AgentContext,
  userId: string,
  query: string,
  limit: number = 10
): Promise<Array<{ role: string; content: string; createdAt: Date }>> {
  try {
    const results = await agentContext.memoryAdapter.searchMessages(userId, query, limit);
    return results.map(msg => ({
      role: msg.role,
      content: msg.content,
      createdAt: msg.createdAt,
    }));
  } catch (error) {
    logError('Failed to search memory', error, { userId });
    return [];
  }
}

/**
 * Delete user memory (GDPR compliance)
 *
 * @param agentContext - Initialized agent context
 * @param userId - User ID
 * @param conversationId - Optional specific conversation to delete
 */
export async function deleteMemory(
  agentContext: AgentContext,
  userId: string,
  conversationId?: string
): Promise<void> {
  await agentContext.memoryAdapter.deleteMessages({
    userId,
    conversationId,
  });

  logInfo('Memory deleted', {
    userId,
    conversationId,
  });
}

// ==================== Agent Utilities ====================

/**
 * Build system prompt for a chat request
 *
 * @param promptContext - Context for prompt building
 * @returns Formatted system prompt
 */
export function buildSystemPrompt(promptContext: PromptContext): string {
  return buildMastraSystemPrompt(promptContext);
}

/**
 * Get the current agent configuration
 */
export function getAgentConfig(): typeof mastraAgentConfig {
  return mastraAgentConfig;
}

/**
 * Record metrics for a chat request
 *
 * @param message - User message
 * @param latencyMs - Request latency
 * @param success - Whether the request succeeded
 */
export function recordChatMetrics(
  message: string,
  latencyMs: number,
  success: boolean
): void {
  const queryType = classifyQuery(message);
  recordChatRequest(queryType === 'complex' ? 'workflow' : 'simple_query');
  recordAgentLatency(latencyMs / 1000, queryType);

  if (!success) {
    recordChatError('agent_failure');
  }
}

// ==================== Health Check ====================

/**
 * Check if the agent dependencies are healthy
 *
 * @param agentContext - Initialized agent context
 * @returns Health check result
 */
export async function checkAgentHealth(agentContext: AgentContext): Promise<{
  healthy: boolean;
  checks: {
    memory: boolean;
    auth: boolean;
    config: boolean;
  };
  error?: string;
}> {
  const checks = {
    memory: false,
    auth: false,
    config: false,
  };

  try {
    // Check config
    checks.config = !!agentContext.config && !!agentContext.config.model;

    // Check memory adapter by attempting a read
    try {
      await agentContext.memoryAdapter.getMessages({
        userId: 'health-check',
        limit: 1,
      });
      checks.memory = true;
    } catch {
      // Memory check failed but we continue
    }

    // Check auth provider by verifying it's initialized
    checks.auth = !!agentContext.authProvider;

    return {
      healthy: checks.config && checks.memory && checks.auth,
      checks,
    };
  } catch (error) {
    return {
      healthy: false,
      checks,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// ==================== Logging Utilities ====================

export {
  setLogContext,
  clearLogContext,
  createTimer,
  logInfo,
  logError,
  logDebug,
};

// ==================== Tracing Utilities ====================

export {
  traceWorkflowStep,
  addSpanAttributes,
  getTraceId,
};

// ==================== Re-exports ====================

export {
  SupabaseMemoryAdapter,
  createMemoryAdapter,
} from './memory-adapter';

export {
  SupabaseAuthProvider,
  createAuthProvider,
  type SupabaseAuthUser,
} from './auth-adapter';

export {
  mastraAgentConfig,
  buildMastraSystemPrompt,
  type PromptContext,
} from './config';

export { recordTokenUsage };
