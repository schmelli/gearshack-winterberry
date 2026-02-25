/**
 * Shared utilities for Mastra composite tools
 * Feature: 060-ai-agent-evolution, Dynamic Agent Pattern
 *
 * Supports both runtimeContext (Dynamic Agent Pattern) and
 * legacy requestContext for backward compatibility.
 */

/**
 * Resolve the context Map from Mastra execution context.
 * Checks runtimeContext first (Dynamic Agent Pattern), then
 * falls back to requestContext (legacy) for backward compatibility.
 */
function resolveContextMap(executionContext: unknown): Map<string, unknown> | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = executionContext as any;
  // Prefer runtimeContext (Dynamic Agent Pattern via RuntimeContext class)
  const runtimeCtx = ctx?.runtimeContext;
  if (runtimeCtx && typeof runtimeCtx.get === 'function') {
    return runtimeCtx as Map<string, unknown>;
  }
  // Fall back to requestContext (legacy Map-based approach)
  const requestCtx = ctx?.requestContext;
  if (requestCtx && typeof requestCtx.get === 'function') {
    return requestCtx as Map<string, unknown>;
  }
  return undefined;
}

/**
 * Extract userId from Mastra execution context
 *
 * In production, userId is injected by `streamMastraResponse` via `requestContext`.
 * In Mastra Studio (local dev), no requestContext is set — fall back to the
 * MASTRA_STUDIO_USER_ID environment variable so tools function during Studio sessions.
 *
 * The fallback is guarded by NODE_ENV to ensure it is never active in production,
 * preventing accidental identity adoption if the env var is misconfigured.
 *
 * @param executionContext - Mastra tool execution context
 * @returns userId string or null if not authenticated
 */
export function extractUserId(executionContext: unknown): string | null {
  const ctxMap = resolveContextMap(executionContext);
  const userId = (ctxMap?.get('userId') as string | undefined) || null;
  // Studio fallback: only active outside production to prevent accidental identity
  // adoption if MASTRA_STUDIO_USER_ID is ever set in a production environment.
  const studioFallback =
    process.env.NODE_ENV !== 'production' ? (process.env.MASTRA_STUDIO_USER_ID ?? null) : null;
  return userId || studioFallback || null;
}

/**
 * Extract currentLoadoutId from Mastra execution context
 *
 * @param executionContext - Mastra tool execution context
 * @returns currentLoadoutId string or null if not in loadout context
 */
export function extractCurrentLoadoutId(executionContext: unknown): string | null {
  const ctxMap = resolveContextMap(executionContext);
  return (ctxMap?.get('currentLoadoutId') as string | undefined) || null;
}

/**
 * Extract subscriptionTier from Mastra execution context
 *
 * @param executionContext - Mastra tool execution context
 * @returns subscriptionTier or 'standard' as default
 */
export function extractSubscriptionTier(executionContext: unknown): 'standard' | 'trailblazer' {
  const ctxMap = resolveContextMap(executionContext);
  const tier = ctxMap?.get('subscriptionTier') as string | undefined;
  return tier === 'trailblazer' ? 'trailblazer' : 'standard';
}

/**
 * Format weight in grams to human-readable string
 *
 * @param grams - Weight in grams
 * @returns Formatted weight string (e.g., "1.23kg" or "450g")
 */
export function formatWeight(grams: number | null | undefined): string {
  if (grams == null || grams === 0) return '?';
  if (grams < 1000) return `${Math.round(grams)}g`;
  return `${(grams / 1000).toFixed(2)}kg`;
}

/**
 * Standard error response for composite tools
 */
export interface ToolErrorResponse {
  success: false;
  error: string;
}

/**
 * Create a standardized error response
 *
 * @param error - Error message
 * @returns Standardized error object
 */
export function createErrorResponse(error: string): ToolErrorResponse {
  return { success: false, error };
}
