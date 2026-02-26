/**
 * Shared AI Gateway Singleton
 *
 * Provides a single lazy-initialized Vercel AI Gateway instance shared across
 * all Mastra modules that need LLM access (tools, intent router, semantic cache, etc.).
 *
 * Eliminates duplicate gateway singletons that were previously created independently
 * in each consumer module. The gateway itself is stateless (thin HTTP wrapper around
 * the AI Gateway API), so sharing one instance has no concurrency issues.
 *
 * Usage:
 *   import { getSharedGateway } from '../gateway';
 *   const model = getSharedGateway()(modelId);
 *
 * For consumers that need graceful degradation when the API key is missing
 * (e.g., optional features like query reformulation), use getSharedGatewayOrNull().
 *
 * @see https://sdk.vercel.ai/docs/ai-sdk-core/settings#providers-and-models
 */

import { createGateway } from '@ai-sdk/gateway';

// =============================================================================
// Types
// =============================================================================

/** Return type of createGateway — the gateway callable + utility methods */
export type AIGateway = ReturnType<typeof createGateway>;

// =============================================================================
// Lazy Singleton
// =============================================================================

let instance: AIGateway | null = null;

/**
 * Returns the shared AI Gateway instance, creating it lazily on first call.
 *
 * Throws if neither AI_GATEWAY_API_KEY nor AI_GATEWAY_KEY is set.
 * This is intentional — callers that require the gateway should fail loudly
 * rather than silently producing broken model references.
 *
 * The instance is cached for the lifetime of the process (module-level singleton).
 * In serverless environments (Vercel), this means one instance per cold start.
 */
export function getSharedGateway(): AIGateway {
  if (!instance) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) {
      throw new Error(
        'AI_GATEWAY_API_KEY or AI_GATEWAY_KEY is required for AI operations. ' +
        'Set one of these in your .env.local file.'
      );
    }
    instance = createGateway({ apiKey });
  }
  return instance;
}

/**
 * Returns the shared AI Gateway instance, or null if the API key is not configured.
 *
 * Use this for optional features that should gracefully degrade when AI is unavailable
 * (e.g., query reformulation in searchGearKnowledge, semantic caching).
 */
export function getSharedGatewayOrNull(): AIGateway | null {
  try {
    return getSharedGateway();
  } catch {
    return null;
  }
}
