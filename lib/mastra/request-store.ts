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
 * Request-scoped context values.
 * Mirrors GearshackRequestContext from mastra-agent.ts.
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
 * @param context - Request-scoped values to make available
 * @param fn - Async callback to execute within the context
 * @returns The callback's return value
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
