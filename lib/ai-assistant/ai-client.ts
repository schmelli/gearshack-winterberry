/**
 * Vercel AI SDK Client Configuration
 * Feature 050: AI Assistant - T058
 *
 * Initializes the Anthropic Claude model via Vercel AI Gateway
 * for conversational AI interactions with tool/function calling support.
 */

import { createGateway } from '@ai-sdk/gateway';
import { generateText, streamText } from 'ai';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { withRetry } from './retry';

// Import Mastra tool definitions - Properly formatted with createTool
import { queryUserDataTool } from '@/lib/mastra/tools/query-user-data';
import { searchCatalogTool } from '@/lib/mastra/tools/search-catalog';
import { searchWebTool } from '@/lib/mastra/tools/search-web';

// Import MCP GearGraph tools (T059 - Register MCP tools with agent)
import {
  findAlternativesTool,
  searchGearTool,
  queryGearGraphTool,
  executeFindAlternatives,
  executeSearchGear,
  executeQueryGearGraph,
  type FindAlternativesInput,
  type SearchGearInput,
  type QueryGearGraphInput,
} from '@/lib/mastra/tools/mcp-graph';
import {
  recordMcpToolCall,
  recordMcpToolLatency,
  recordMcpToolError,
} from '@/lib/mastra/metrics';

// Environment configuration
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4.5';
const AI_CHAT_ENABLED = process.env.AI_CHAT_ENABLED === 'true';
const AI_GATEWAY_BASE_URL = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1/ai';

// Timeout configuration (in milliseconds)
const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10); // 30 seconds default

// Retry configuration
const AI_RETRY_ENABLED = process.env.AI_RETRY_ENABLED !== 'false'; // Default: true
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '2', 10); // Default: 2 retries (3 total attempts)

// Multi-step tool calling configuration
// maxSteps controls how many turns the AI can take when using tools
// - 1 (default in SDK): AI can call tools but CANNOT see results (causes "stuck" behavior)
// - 5 (recommended): AI can call tools, see results, and respond accordingly
const AI_MAX_STEPS = parseInt(process.env.AI_MAX_STEPS || '5', 10);

if (!AI_GATEWAY_API_KEY && AI_CHAT_ENABLED) {
  console.warn('⚠️ AI_GATEWAY_API_KEY not configured - AI features will be disabled');
}

/**
 * Create the Vercel AI Gateway instance
 * This provides a unified interface to multiple AI providers
 */
const gateway = createGateway({
  apiKey: AI_GATEWAY_API_KEY,
  baseURL: AI_GATEWAY_BASE_URL,
});

/**
 * Get the configured AI model instance
 * Uses Vercel AI Gateway for routing and rate limiting
 * Supports multiple providers: Anthropic, Google, etc.
 */
export function getAIModel() {
  if (!AI_CHAT_ENABLED || !AI_GATEWAY_API_KEY) {
    throw new Error('AI features are not enabled. Please check environment configuration.');
  }

  // Use the gateway with the full model ID (e.g., "google/gemini-2.5-flash" or "anthropic/claude-sonnet-4.5")
  return gateway(AI_CHAT_MODEL);
}

// =====================================================
// Mastra Tool Adapter for Vercel AI SDK
// =====================================================

// Mastra tool interface for type safety
interface MastraTool<TInput = unknown, TOutput = unknown> {
  id: string;
  description: string;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  execute: (params: { context: TInput; runtimeContext: Map<string, unknown> }) => Promise<TOutput>;
}

// JSON Schema type for converted schemas
interface JsonSchema {
  type?: string;
  properties?: Record<string, unknown>;
  required?: string[];
  [key: string]: unknown;
}

/**
 * Convert Mastra tool to Vercel AI SDK format
 *
 * Mastra tools use: { id, inputSchema, outputSchema, execute({ context, runtimeContext }) }
 * AI SDK needs: { description, parameters, execute(args) }
 *
 * CRITICAL: Claude requires JSON Schema with explicit type: "object" field.
 * We use zodToJsonSchema to ensure proper conversion with all required fields.
 */
function adaptMastraTool<TInput, TOutput>(
  mastraTool: MastraTool<TInput, TOutput>,
  userId: string
) {
  // Convert Zod schema to JSON Schema with proper type field for Claude
  const jsonSchema = zodToJsonSchema(mastraTool.inputSchema as any, {
    target: 'jsonSchema7',
    $refStrategy: 'none', // Don't use $ref, inline all definitions
  }) as JsonSchema;

  // Ensure type: "object" is at the root level (required by Claude)
  if (!jsonSchema.type) {
    jsonSchema.type = 'object';
  }

  // DEBUG: Log the schemas for debugging
  if (mastraTool.id === 'queryUserData') {
    console.log('[adaptMastraTool] DEBUG - Full tool object keys:', Object.keys(mastraTool));
    console.log('[adaptMastraTool] DEBUG - inputSchema type:', typeof mastraTool.inputSchema);
    console.log('[adaptMastraTool] DEBUG - inputSchema constructor:', mastraTool.inputSchema?.constructor?.name);
    // Access _def through type assertion for Zod internal structure
    const zodSchema = mastraTool.inputSchema as unknown as { _def?: { typeName?: string } };
    console.log('[adaptMastraTool] DEBUG - Is Zod schema?:', zodSchema._def !== undefined);

    // Try to get the schema shape
    if (zodSchema._def) {
      console.log('[adaptMastraTool] DEBUG - Zod _def.typeName:', zodSchema._def.typeName);
      console.log('[adaptMastraTool] DEBUG - Zod _def keys:', Object.keys(zodSchema._def));
    }

    console.log('[adaptMastraTool] DEBUG - Generated JSON Schema:', JSON.stringify(jsonSchema, null, 2));
  }

  return {
    description: mastraTool.description,
    parameters: jsonSchema, // JSON Schema format for Claude compatibility
    execute: async (args: TInput): Promise<TOutput> => {
      // Create runtime context with userId
      const runtimeContext = new Map<string, unknown>();
      runtimeContext.set('userId', userId);

      // Call Mastra tool's execute with proper format
      return await mastraTool.execute({
        context: args,
        runtimeContext,
      });
    },
  };
}

// =====================================================
// T058: AI Tool Definitions
// =====================================================

/**
 * Get all available tools for AI with execution functions
 *
 * Uses Mastra tools with proper schema conversion and runtimeContext
 *
 * @param userId - Current user ID for tool execution
 * @returns Tool definitions with execute functions
 */
export function getAITools(userId: string) {
  return {
    // =========================================================================
    // Data Access Tools (Mastra format with adapter)
    // =========================================================================

    // Query user's database (gear, loadouts, categories, etc.)
    queryUserData: adaptMastraTool(queryUserDataTool as any, userId),

    // Search product catalog
    searchCatalog: adaptMastraTool(searchCatalogTool as any, userId),

    // Search the web for real-time information
    searchWeb: adaptMastraTool(searchWebTool as any, userId),

    // =========================================================================
    // Action Tools
    // =========================================================================

    // Add item to wishlist
    addToWishlist: {
      description: 'Add a gear item to the user\'s wishlist for future purchase consideration',
      parameters: z.object({
        gearItemId: z.string().uuid().describe('The UUID of the gear item to add to wishlist'),
      }),
      execute: async (args: { gearItemId: string }) => {
        // Return tool result - client will handle actual wishlist addition via action
        return { action: 'add_to_wishlist', gearItemId: args.gearItemId };
      },
    },

    // Send message to user
    sendMessage: {
      description: 'Send a message to another user in the community (for buying, borrowing, trading gear)',
      parameters: z.object({
        recipientUserId: z.string().uuid().describe('The UUID of the user to send a message to'),
        messagePreview: z.string().max(100).describe('Preview of the message content (first 50-100 chars)'),
      }),
      execute: async (args: { recipientUserId: string; messagePreview: string }) => {
        // Return tool result - client will handle actual message sending via action
        return { action: 'send_message', ...args };
      },
    },

    // Navigate to page
    navigate: {
      description: 'Navigate the user to a specific page in the app',
      parameters: z.object({
        destination: z.string().describe('The destination page (e.g., "inventory", "loadouts", "wishlist")'),
      }),
      execute: async (args: { destination: string }) => {
        // Return tool result - client will handle actual navigation via action
        return { action: 'navigate', destination: args.destination };
      },
    },

    // =========================================================================
    // MCP GearGraph Tools (T059 - US3: MCP Client Integration)
    // =========================================================================

    // Find gear alternatives via GearGraph MCP
    findAlternatives: {
      description: findAlternativesTool.description,
      parameters: findAlternativesTool.parameters,
      execute: async (args: FindAlternativesInput) => {
        const startTime = Date.now();
        try {
          const result = await executeFindAlternatives(args);
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('findAlternatives', result.success ? 'success' : 'error');
          recordMcpToolLatency('findAlternatives', latencyMs);
          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('findAlternatives', 'error');
          recordMcpToolLatency('findAlternatives', latencyMs);
          recordMcpToolError('findAlternatives', error instanceof Error ? error.message : 'unknown');
          throw error;
        }
      },
    },

    // Search gear catalog via GearGraph MCP
    searchGear: {
      description: searchGearTool.description,
      parameters: searchGearTool.parameters,
      execute: async (args: SearchGearInput) => {
        const startTime = Date.now();
        try {
          const result = await executeSearchGear(args);
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('searchGear', result.success ? 'success' : 'error');
          recordMcpToolLatency('searchGear', latencyMs);
          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('searchGear', 'error');
          recordMcpToolLatency('searchGear', latencyMs);
          recordMcpToolError('searchGear', error instanceof Error ? error.message : 'unknown');
          throw error;
        }
      },
    },

    // Direct Cypher query on GearGraph via MCP
    queryGearGraph: {
      description: queryGearGraphTool.description,
      parameters: queryGearGraphTool.parameters,
      execute: async (args: QueryGearGraphInput) => {
        const startTime = Date.now();
        try {
          const result = await executeQueryGearGraph(args);
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('queryGearGraph', result.success ? 'success' : 'error');
          recordMcpToolLatency('queryGearGraph', latencyMs);
          return result;
        } catch (error) {
          const latencyMs = Date.now() - startTime;
          recordMcpToolCall('queryGearGraph', 'error');
          recordMcpToolLatency('queryGearGraph', latencyMs);
          recordMcpToolError('queryGearGraph', error instanceof Error ? error.message : 'unknown');
          throw error;
        }
      },
    },
  };
}

/**
 * Internal function to generate AI response (without retry)
 * Used by the public generateAIResponse which wraps this with retry logic
 */
async function generateAIResponseInternal(
  systemPrompt: string,
  userMessage: string,
  enableTools: boolean,
  timeout: number,
  userId?: string
): Promise<{
  text: string;
  tokensUsed: number;
  finishReason: string;
  toolCalls: ToolCallResult[];
}> {
  const model = getAIModel();

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
    // Build config object - using Record for dynamic tool assignment
    const config: {
      model: ReturnType<typeof getAIModel>;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
      abortSignal: AbortSignal;
      tools?: ReturnType<typeof getAITools>;
      maxSteps?: number;
    } = {
      model,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      abortSignal: abortController.signal,
    };

    // T058: Add tools if enabled
    // CRITICAL: maxSteps must be set to allow AI to see tool results and respond
    // Without maxSteps > 1, AI can call tools but cannot process results (appears "stuck")
    if (enableTools && userId) {
      config.tools = getAITools(userId);
      config.maxSteps = AI_MAX_STEPS;
    }

    const result = await generateText(config as any);

    // Map tool calls to our ToolCallResult format
    const mappedToolCalls: ToolCallResult[] = (result.toolCalls || []).map((call: any) => ({
      toolCallId: call.toolCallId,
      toolName: call.toolName,
      args: call.args as Record<string, unknown>,
    }));

    return {
      text: result.text,
      tokensUsed: result.usage?.totalTokens || 0,
      finishReason: result.finishReason,
      toolCalls: mappedToolCalls, // T058: Return tool calls for action extraction
    };
  } catch (error) {
    // Check if error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI request timed out after ${timeout}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Generate a complete AI response (non-streaming) with tool support
 * Includes automatic retry logic with exponential backoff for transient failures
 *
 * @param systemPrompt - The system instructions for the AI
 * @param userMessage - The user's query
 * @param enableTools - Whether to enable tool calling (default: true)
 * @param timeout - Request timeout in milliseconds (default: from env or 30s)
 * @param userId - Current user ID for tool execution (required if enableTools is true)
 * @returns Generated text response, metadata, and tool calls
 */
export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string,
  enableTools: boolean = true,
  timeout: number = AI_REQUEST_TIMEOUT,
  userId?: string
): Promise<{
  text: string;
  tokensUsed: number;
  finishReason: string;
  toolCalls: ToolCallResult[];
}> {
  // Wrap with retry logic if enabled
  if (AI_RETRY_ENABLED) {
    return withRetry(
      () => generateAIResponseInternal(systemPrompt, userMessage, enableTools, timeout, userId),
      {
        maxAttempts: AI_MAX_RETRIES + 1, // +1 because maxAttempts includes the initial attempt
        initialDelayMs: 1000, // 1 second
        maxDelayMs: 10000, // 10 seconds
        backoffMultiplier: 2,
      }
    );
  }

  // No retry - call directly
  return generateAIResponseInternal(systemPrompt, userMessage, enableTools, timeout, userId);
}

/**
 * Result type for streaming AI responses with tool support
 * Phase 1: Enable tools in streaming endpoint
 */
export interface StreamingAIResult {
  /** Async iterator for text chunks */
  textStream: AsyncIterable<string>;
  /** Promise that resolves to tool calls when complete */
  toolCalls: Promise<ToolCallResult[]>;
  /** Promise that resolves to full text when complete */
  fullText: Promise<string>;
  /** Promise that resolves to finish reason */
  finishReason: Promise<string>;
}

/**
 * Tool call result structure from Vercel AI SDK
 */
export interface ToolCallResult {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

/**
 * Generate a streaming AI response (for real-time UI updates)
 * Phase 1: Added enableTools parameter for tool calling during streaming
 *
 * @param systemPrompt - The system instructions for the AI
 * @param userMessage - The user's query
 * @param enableTools - Whether to enable tool calling (default: false for backwards compatibility)
 * @param timeout - Request timeout in milliseconds (default: from env or 30s)
 * @param userId - Current user ID for tool execution (required if enableTools is true)
 * @returns Streaming result with text stream and tool calls promise
 */
export async function generateStreamingAIResponse(
  systemPrompt: string,
  userMessage: string,
  enableTools: boolean = false,
  timeout: number = AI_REQUEST_TIMEOUT,
  userId?: string
): Promise<StreamingAIResult> {
  const model = getAIModel();

  // Create abort controller for timeout
  // Use longer timeout when tools are enabled to allow for multi-step execution
  const effectiveTimeout = enableTools ? Math.max(timeout, 60000) : timeout;
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), effectiveTimeout);

  try {
    // Build config with optional tools
    // Define explicit type for config with optional fields
    const config: {
      model: ReturnType<typeof getAIModel>;
      system: string;
      messages: Array<{ role: 'user'; content: string }>;
      abortSignal: AbortSignal;
      tools?: ReturnType<typeof getAITools>;
      maxSteps?: number;
      onStepFinish?: (step: {
        stepType: string;
        text: string;
        toolCalls?: unknown[];
        toolResults?: unknown[];
        finishReason: string;
      }) => void;
    } = {
      model,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      abortSignal: abortController.signal,
    };

    // Phase 1: Add tools if enabled
    // CRITICAL: maxSteps must be set to allow AI to see tool results and respond
    // Without maxSteps > 1, AI can call tools but cannot process results (appears "stuck")
    // This was the root cause of the "stuck agent" bug - the AI would say
    // "let me check your inventory" but never get to see the tool results
    if (enableTools && userId) {
      config.tools = getAITools(userId);
      config.maxSteps = AI_MAX_STEPS;

      console.log('[AI Config] Tools enabled with maxSteps:', {
        maxSteps: config.maxSteps,
        toolCount: Object.keys(config.tools).length,
        userId,
      });

      // AI SDK 5: onStepFinish callback for debugging multi-step execution
      config.onStepFinish = (step) => {
        console.log('[AI Multi-Step] Step finished:', {
          stepType: step.stepType,
          finishReason: step.finishReason,
          textLength: step.text?.length || 0,
          toolCallCount: step.toolCalls?.length || 0,
          toolResultCount: step.toolResults?.length || 0,
        });
      };
    }

    const result = streamText(config as any);

    // Clear timeout when stream completes
    result.text.finally(() => clearTimeout(timeoutId));

    // Define type for raw tool call from AI SDK
    type RawToolCall = {
      toolCallId: string;
      toolName: string;
      args?: Record<string, unknown>;
      input?: Record<string, unknown>;
    };

    return {
      textStream: result.textStream,
      toolCalls: result.toolCalls.then((calls: any) =>
        (calls || []).map((call: any) => ({
          toolCallId: call.toolCallId,
          toolName: call.toolName,
          args: (call.args || call.input || {}) as Record<string, unknown>,
        }))
      ),
      fullText: result.text,
      finishReason: result.finishReason,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    // Check if error is due to timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`AI request timed out after ${effectiveTimeout}ms`);
    }
    throw error;
  }
}

/**
 * Check if AI features are currently available
 * Used for graceful degradation to cached responses
 */
export function isAIAvailable(): boolean {
  return AI_CHAT_ENABLED && Boolean(AI_GATEWAY_API_KEY);
}
