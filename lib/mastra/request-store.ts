/**
 * AsyncLocalStorage-based request context store
 *
 * Bridges the gap between the chat route (where userId is known) and
 * Mastra tool execution (where @mastra/core v1.0.4 does NOT propagate
 * the agent's RequestContext to tool execute() callbacks).
 *
 * The agentic loop in @mastra/core creates a brand-new empty
 * RequestContext() internally, discarding the one passed to
 * agent.stream(). This means tools receive an execution context
 * without userId, subscriptionTier, or any other request-scoped data.
 *
 * AsyncLocalStorage propagates across the entire async call chain
 * without relying on Mastra's internal context wiring. The chat route
 * calls `runWithRequestStore()` before streaming, and tools call
 * `getRequestStore()` as a fallback when the Mastra execution context
 * is empty.
 *
 * @see https://nodejs.org/api/async_context.html#class-asynclocalstorage
 */

import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped context values propagated via AsyncLocalStorage.
 *
 * This is the **single source of truth** for the subset of request context
 * fields that tools need at execution time. GearshackRequestContext in
 * mastra-agent.ts extends this interface with agent-level fields
 * (promptContext, enrichedPromptSuffix, domain) that tools don't need.
 *
 * When adding new tool-visible context fields, add them here first —
 * GearshackRequestContext will inherit them automatically.
 */
export interface RequestStoreContext {
  userId: string;
  subscriptionTier: 'standard' | 'trailblazer';
  lang: string;
  currentLoadoutId?: string;
}

const requestStore = new AsyncLocalStorage<RequestStoreContext>();

/**
 * Run a callback within a request-scoped context.
 * All async operations inside the callback (including Mastra tool
 * executions) can retrieve the context via `getRequestStore()`.
 *
 * Supports both sync and async callbacks. When `fn` returns a Promise,
 * callers should `await runWithRequestStore(ctx, fn)` to ensure the
 * async chain completes within the storage scope.
 *
 * @param context - Request-scoped values to make available
 * @param fn - Callback to execute within the context (may be sync or async)
 * @returns The callback's return value (or Promise if fn is async)
 *
 * @example
 * // Async usage (typical):
 * const stream = await runWithRequestStore(ctx, () => agent.stream(messages));
 *
 * // Sync usage:
 * const result = runWithRequestStore(ctx, () => computeSync());
 */
export function runWithRequestStore<T>(
  context: RequestStoreContext,
  fn: () => T,
): T {
  return requestStore.run(context, fn);
}

/**
 * Retrieve the current request-scoped context.
 * Returns undefined when called outside of `runWithRequestStore()`.
 */
export function getRequestStore(): RequestStoreContext | undefined {
  return requestStore.getStore();
}
