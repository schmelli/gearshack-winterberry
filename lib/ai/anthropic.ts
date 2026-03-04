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

const resolvedKey = process.env.ANTHROPIC_API_KEY ?? process.env.AI_GATEWAY_API_KEY;

/**
 * Pre-configured Anthropic provider instance.
 * Import this instead of calling `createAnthropic()` in each route.
 */
export const anthropic = createAnthropic({
  apiKey: resolvedKey,
});

/**
 * Check whether at least one AI API key is configured.
 * Call this at the top of route handlers to return 503 early.
 * Also logs a diagnostic warning when only the gateway key is set,
 * since the gateway key format may not be accepted by the Anthropic SDK
 * directly — helps operators diagnose 401 errors in production.
 */
export function isAIConfigured(): boolean {
  const hasDirectKey = !!process.env.ANTHROPIC_API_KEY;
  const hasGatewayKey = !!process.env.AI_GATEWAY_API_KEY;

  if (!hasDirectKey && hasGatewayKey) {
    // Log once per cold start — gateway keys work via Vercel AI Gateway proxy
    // but may fail if passed directly to the Anthropic SDK without a gateway.
    console.warn(
      '[AI Config] Using AI_GATEWAY_API_KEY (no ANTHROPIC_API_KEY set). ' +
      'Ensure requests are routed through the AI Gateway, or set ANTHROPIC_API_KEY for direct access.'
    );
  }

  return hasDirectKey || hasGatewayKey;
}
