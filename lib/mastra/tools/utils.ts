/**
 * Shared utilities for Mastra composite tools
 * Feature: 060-ai-agent-evolution, Dynamic Agent Pattern
 *
 * Supports both runtimeContext (Dynamic Agent Pattern) and
 * legacy requestContext for backward compatibility.
 *
 * IMPORTANT: @mastra/core v1.0.4 does NOT propagate the agent's
 * RequestContext to tool execute() callbacks. The agentic loop creates
 * a brand-new empty RequestContext internally. As a workaround, all
 * extract* functions fall back to AsyncLocalStorage (request-store.ts)
 * which IS propagated across the full async call chain.
 */

import { getRequestStore } from '../request-store';

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
 * Resolution order:
 * 1. Mastra execution context (runtimeContext or requestContext)
 * 2. AsyncLocalStorage request store (workaround for @mastra/core v1.0.4 bug)
 * 3. MASTRA_STUDIO_USER_ID env var (dev-only fallback for Mastra Studio)
 *
 * @param executionContext - Mastra tool execution context
 * @returns userId string or null if not authenticated
 */
export function extractUserId(executionContext: unknown): string | null {
  // 1. Try Mastra execution context (works if Mastra propagates requestContext)
  const ctxMap = resolveContextMap(executionContext);
  const userId = ctxMap?.get('userId');
  if (typeof userId === 'string' && userId) return userId;

  // 2. AsyncLocalStorage fallback — bridges the @mastra/core v1.0.4 gap where
  //    the agentic loop creates a new empty RequestContext, discarding the one
  //    passed to agent.stream().
  const store = getRequestStore();
  if (store?.userId) return store.userId;

  // 3. Studio fallback: only active outside production to prevent accidental identity
  //    adoption if MASTRA_STUDIO_USER_ID is ever set in a production environment.
  if (process.env.NODE_ENV !== 'production') {
    return process.env.MASTRA_STUDIO_USER_ID ?? null;
  }

  return null;
}

/**
 * Extract currentLoadoutId from Mastra execution context
 *
 * Resolution order:
 * 1. Mastra execution context (runtimeContext or requestContext)
 * 2. AsyncLocalStorage request store
 *
 * @param executionContext - Mastra tool execution context
 * @returns currentLoadoutId string or null if not in loadout context
 */
export function extractCurrentLoadoutId(executionContext: unknown): string | null {
  const ctxMap = resolveContextMap(executionContext);
  const loadoutId = ctxMap?.get('currentLoadoutId');
  if (typeof loadoutId === 'string' && loadoutId) return loadoutId;

  // AsyncLocalStorage fallback
  // Use || instead of ?? to treat empty string as null (semantically meaningless)
  const store = getRequestStore();
  return store?.currentLoadoutId || null;
}

/**
 * Extract subscriptionTier from Mastra execution context
 *
 * Resolution order:
 * 1. Mastra execution context (runtimeContext or requestContext) — accepts both 'standard' and 'trailblazer'
 * 2. AsyncLocalStorage request store
 * 3. Default: 'standard'
 *
 * @param executionContext - Mastra tool execution context
 * @returns subscriptionTier or 'standard' as default
 */
export function extractSubscriptionTier(executionContext: unknown): 'standard' | 'trailblazer' {
  const ctxMap = resolveContextMap(executionContext);
  const tier = ctxMap?.get('subscriptionTier');
  // Accept BOTH valid tiers from execution context — previously only checked
  // for 'trailblazer', causing 'standard' to fall through to ALS which could
  // incorrectly return 'trailblazer' if a different request had set it.
  if (tier === 'standard' || tier === 'trailblazer') {
    return tier;
  }

  // AsyncLocalStorage fallback
  const store = getRequestStore();
  if (store?.subscriptionTier) {
    return store.subscriptionTier;
  }

  return 'standard';
}

/**
 * Extract lang (locale) from Mastra execution context
 *
 * Resolution order:
 * 1. Mastra execution context (runtimeContext or requestContext)
 * 2. AsyncLocalStorage request store
 * 3. Default: 'en'
 *
 * @param executionContext - Mastra tool execution context
 * @returns Language code string (e.g., 'en', 'de')
 */
export function extractLang(executionContext: unknown): string {
  const ctxMap = resolveContextMap(executionContext);
  const lang = ctxMap?.get('lang');
  if (typeof lang === 'string' && lang) return lang;

  // AsyncLocalStorage fallback
  const store = getRequestStore();
  if (store?.lang) return store.lang;

  return 'en';
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
