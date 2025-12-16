/**
 * Vercel AI SDK Client Configuration
 * Feature 050: AI Assistant
 *
 * Initializes the Anthropic Claude model via Vercel AI Gateway
 * for conversational AI interactions.
 */

import { createAnthropic } from '@ai-sdk/anthropic';
import { generateText, streamText } from 'ai';

// Environment configuration
const AI_GATEWAY_API_KEY = process.env.AI_GATEWAY_API_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4.5';
const AI_CHAT_ENABLED = process.env.AI_CHAT_ENABLED === 'true';

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

  // Extract model name from gateway format (e.g., "anthropic/claude-sonnet-4.5" -> "claude-sonnet-4.5")
  const modelName = AI_CHAT_MODEL.split('/').pop() || 'claude-sonnet-4.5';

  // Create Anthropic provider with custom API key (for AI Gateway)
  const anthropic = createAnthropic({
    apiKey: AI_GATEWAY_API_KEY,
  });

  return anthropic(modelName);
}

/**
 * Generate a complete AI response (non-streaming)
 *
 * @param systemPrompt - The system instructions for the AI
 * @param userMessage - The user's query
 * @returns Generated text response and metadata
 */
export async function generateAIResponse(systemPrompt: string, userMessage: string) {
  const model = getAIModel();

  const result = await generateText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  return {
    text: result.text,
    tokensUsed: result.usage?.totalTokens || 0,
    finishReason: result.finishReason,
  };
}

/**
 * Generate a streaming AI response (for real-time UI updates)
 *
 * @param systemPrompt - The system instructions for the AI
 * @param userMessage - The user's query
 * @returns Streaming text response
 */
export async function generateStreamingAIResponse(systemPrompt: string, userMessage: string) {
  const model = getAIModel();

  const result = await streamText({
    model,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  return result.textStream;
}

/**
 * Check if AI features are currently available
 * Used for graceful degradation to cached responses
 */
export function isAIAvailable(): boolean {
  return AI_CHAT_ENABLED && Boolean(AI_GATEWAY_API_KEY);
}
