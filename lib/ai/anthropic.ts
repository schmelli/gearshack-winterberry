/**
 * Shared Anthropic Provider Configuration
 *
 * Centralizes the Anthropic SDK provider instantiation so all AI routes
 * share the same key-resolution logic. Accepts either:
 * - ANTHROPIC_API_KEY (direct Anthropic access)
 * - AI_GATEWAY_API_KEY (Vercel AI Gateway)
 *
 * The default `anthropic` singleton from `@ai-sdk/anthropic` only reads
 * ANTHROPIC_API_KEY, so gateway-only deployments would fail without this.
 */

import { createAnthropic } from '@ai-sdk/anthropic';

/**
 * Pre-configured Anthropic provider instance.
 * Import this instead of calling `createAnthropic()` in each route.
 */
export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? process.env.AI_GATEWAY_API_KEY,
});

/**
 * Check whether at least one AI API key is configured.
 * Call this at the top of route handlers to return 503 early.
 */
export function isAIConfigured(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.AI_GATEWAY_API_KEY);
}
