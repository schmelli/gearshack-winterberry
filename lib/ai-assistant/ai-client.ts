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
import { withRetry } from './retry';

// Import tool definitions - Lean & powerful set
import {
  queryUserDataTool,
  executeQueryUserData,
  searchCatalogTool,
  executeSearchCatalog,
  searchWebTool,
  executeSearchWeb,
  type QueryUserDataParameters,
} from './tools';

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
// T058: AI Tool Definitions
// =====================================================

/**
 * Get all available tools for AI with execution functions
 *
 * Lean set of 6 powerful tools:
 * - 3 Data Access tools (query, search catalog, search web)
 * - 3 Action tools (wishlist, message, navigate)
 *
 * Philosophy: Flexible tools > Fixed schemas
 *
 * @param userId - Current user ID for tool execution
 * @returns Tool definitions with execute functions
 */
export function getAITools(userId: string) {
  return {
    // =========================================================================
    // Data Access Tools
    // =========================================================================

    // Query user's database (gear, loadouts, categories, etc.)
    queryUserData: {
      description: queryUserDataTool.description,
      parameters: queryUserDataTool.parameters,
      execute: async (args: QueryUserDataParameters) => {
        return await executeQueryUserData(args, userId);
      },
    },

    // Search product catalog
    searchCatalog: {
      description: searchCatalogTool.description,
      parameters: searchCatalogTool.parameters,
      execute: async (args: any) => {
        return await executeSearchCatalog(args);
      },
    },

    // Search the web for real-time information
    searchWeb: {
      description: searchWebTool.description,
      parameters: searchWebTool.parameters,
      execute: async (args: any) => {
        return await executeSearchWeb(args);
      },
    },

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
  toolCalls: any[];
}> {
  const model = getAIModel();

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
    const config: any = {
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
    if (enableTools && userId) {
      config.tools = getAITools(userId);
    }

    const result = await generateText(config);

    return {
      text: result.text,
      tokensUsed: result.usage?.totalTokens || 0,
      finishReason: result.finishReason,
      toolCalls: result.toolCalls || [], // T058: Return tool calls for action extraction
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
  toolCalls: any[];
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
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
    // Build config with optional tools
    // Note: Using `any` for config to work around Vercel AI SDK type complexities
    // This matches the pattern used in generateAIResponseInternal
    const config: any = {
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
    if (enableTools && userId) {
      config.tools = getAITools(userId);
    }

    const result = streamText(config);

    // Clear timeout when stream completes
    result.text.finally(() => clearTimeout(timeoutId));

    return {
      textStream: result.textStream,
      toolCalls: result.toolCalls.then((calls: any[]) =>
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
      throw new Error(`AI request timed out after ${timeout}ms`);
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
