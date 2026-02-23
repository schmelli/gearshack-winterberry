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
    authProvider: createAuthProvider(supabaseClient),
    config: mastraAgentConfig,
  };
}

// ==================== Memory Functions ====================
// Note: Conversation memory is now handled by Mastra native (PostgresStore + PgVector).
// These legacy functions are kept as stubs for backward compatibility.

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
    auth: boolean;
    config: boolean;
  };
  error?: string;
}> {
  const checks = {
    auth: false,
    config: false,
  };

  try {
    // Check config
    checks.config = !!agentContext.config && !!agentContext.config.model;

    // Check auth provider by verifying it's initialized
    checks.auth = !!agentContext.authProvider;

    return {
      healthy: checks.config && checks.auth,
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
