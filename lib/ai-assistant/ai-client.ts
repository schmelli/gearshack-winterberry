/**
 * Vercel AI SDK Client Configuration
 * Feature 050: AI Assistant - T058
 *
 * Initializes the Anthropic Claude model via Vercel AI Gateway
 * for conversational AI interactions with tool/function calling support.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';
import { z } from 'zod';
import { withRetry } from './retry';

// Environment configuration
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4.5';
const AI_CHAT_ENABLED = process.env.AI_CHAT_ENABLED === 'true';

// Timeout configuration (in milliseconds)
const AI_REQUEST_TIMEOUT = parseInt(process.env.AI_REQUEST_TIMEOUT || '30000', 10); // 30 seconds default

// Retry configuration
const AI_RETRY_ENABLED = process.env.AI_RETRY_ENABLED !== 'false'; // Default: true
const AI_MAX_RETRIES = parseInt(process.env.AI_MAX_RETRIES || '2', 10); // Default: 2 retries (3 total attempts)

if (!AI_GATEWAY_API_KEY && AI_CHAT_ENABLED) {
  console.warn('⚠️ AI_GATEWAY_API_KEY not configured - AI features will be disabled');
}

/**
 * Get the configured AI model instance
 * Uses Vercel AI Gateway for routing and rate limiting
 */
export function getAIModel() {
  if (!AI_CHAT_ENABLED || !AI_GATEWAY_API_KEY) {
    throw new Error('AI features are not enabled. Please check environment configuration.');
  }

  // For Vercel AI Gateway, extract just the model name (e.g., "anthropic/claude-sonnet-4.5" -> "claude-sonnet-4.5")
  // For direct Anthropic API, use the full model name
  const modelName = AI_CHAT_MODEL.includes('/')
    ? AI_CHAT_MODEL.split('/').pop() || 'claude-sonnet-4.5'
    : AI_CHAT_MODEL;

  // Create Anthropic provider with custom API key (for AI Gateway)
  const anthropic = createAnthropic({
    apiKey: AI_GATEWAY_API_KEY,
    // Vercel AI Gateway base URL (defaults to standard Anthropic API if not set)
    baseURL: process.env.AI_GATEWAY_BASE_URL,
  });

  return anthropic(modelName);
}

// =====================================================
// T058: AI Tool Definitions
// =====================================================

/**
 * Get all available tools for AI
 * Tools are defined as objects with description and Zod schema parameters
 */
export function getAITools() {
  return {
    addToWishlist: {
      description: 'Add a gear item to the user\'s wishlist for future purchase consideration',
      parameters: z.object({
        gearItemId: z.string().describe('The UUID of the gear item to add to wishlist'),
      }),
    },
    compareGear: {
      description: 'Compare 2-4 gear items side-by-side to help user make decisions',
      parameters: z.object({
        gearItemIds: z.array(z.string()).min(2).max(4).describe('Array of 2-4 gear item UUIDs to compare'),
      }),
    },
    sendMessage: {
      description: 'Send a message to another user in the community (for buying, borrowing, trading gear)',
      parameters: z.object({
        recipientUserId: z.string().describe('The UUID of the user to send a message to'),
        messagePreview: z.string().max(100).describe('Preview of the message content (first 50-100 chars)'),
      }),
    },
    navigate: {
      description: 'Navigate the user to a specific page in the app',
      parameters: z.object({
        destination: z.string().describe('The destination page (e.g., "inventory", "loadouts", "wishlist")'),
      }),
    },
    searchCommunity: {
      description: 'Search for gear available from other users (for sale, borrow, or trade)',
      parameters: z.object({
        query: z.string().describe('Search query (gear name, brand, model)'),
        maxPrice: z.number().optional().describe('Maximum price filter (optional)'),
        maxWeight: z.number().optional().describe('Maximum weight in grams (optional)'),
      }),
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
  timeout: number
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
    if (enableTools) {
      config.tools = getAITools();
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
 * @returns Generated text response, metadata, and tool calls
 */
export async function generateAIResponse(
  systemPrompt: string,
  userMessage: string,
  enableTools: boolean = true,
  timeout: number = AI_REQUEST_TIMEOUT
): Promise<{
  text: string;
  tokensUsed: number;
  finishReason: string;
  toolCalls: any[];
}> {
  // Wrap with retry logic if enabled
  if (AI_RETRY_ENABLED) {
    return withRetry(
      () => generateAIResponseInternal(systemPrompt, userMessage, enableTools, timeout),
      {
        maxAttempts: AI_MAX_RETRIES + 1, // +1 because maxAttempts includes the initial attempt
        initialDelayMs: 1000, // 1 second
        maxDelayMs: 10000, // 10 seconds
        backoffMultiplier: 2,
      }
    );
  }

  // No retry - call directly
  return generateAIResponseInternal(systemPrompt, userMessage, enableTools, timeout);
}

/**
 * Generate a streaming AI response (for real-time UI updates)
 *
 * @param systemPrompt - The system instructions for the AI
 * @param userMessage - The user's query
 * @param timeout - Request timeout in milliseconds (default: from env or 30s)
 * @returns Streaming text response
 */
export async function generateStreamingAIResponse(
  systemPrompt: string,
  userMessage: string,
  timeout: number = AI_REQUEST_TIMEOUT
) {
  const model = getAIModel();

  // Create abort controller for timeout
  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), timeout);

  try {
    const result = await streamText({
      model,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
      abortSignal: abortController.signal,
    });

    return result.textStream;
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
