/**
 * Mastra Instance with Storage Configuration
 * Feature: 001-mastra-agentic-voice
 *
 * This module provides the main Mastra storage with LibSQLStore for persistence.
 * The storage adapter enables conversation memory persistence across sessions.
 *
 * @see https://mastra.ai/docs/memory/overview
 */

import { LibSQLStore } from '@mastra/libsql';

// Environment configuration for storage
const LIBSQL_URL = process.env.LIBSQL_URL || ':memory:';
const LIBSQL_AUTH_TOKEN = process.env.LIBSQL_AUTH_TOKEN;

/**
 * LibSQLStore instance for Mastra memory persistence
 *
 * Uses LibSQLStore for persistent memory storage.
 * Falls back to in-memory storage if no LIBSQL_URL is configured.
 *
 * Environment variables:
 * - LIBSQL_URL: LibSQL database URL (default: ':memory:' for in-memory)
 * - LIBSQL_AUTH_TOKEN: Optional auth token for Turso/remote LibSQL
 *
 * @example
 * ```typescript
 * import { mastraStorage } from '@/lib/mastra/instance';
 *
 * // Use with Memory class
 * const memory = new Memory({ storage: mastraStorage });
 * ```
 */
export const mastraStorage = new LibSQLStore({
  id: 'gearshack-agent-memory',
  url: LIBSQL_URL,
  ...(LIBSQL_AUTH_TOKEN && { authToken: LIBSQL_AUTH_TOKEN }),
});

/**
 * Get the configured storage instance
 *
 * Useful for direct storage operations or health checks
 */
export function getMastraStorage() {
  return mastraStorage;
}

/**
 * Check if storage is using persistent mode (not in-memory)
 */
export function isStoragePersistent(): boolean {
  return LIBSQL_URL !== ':memory:';
}

console.log(
  `[Mastra Storage] Initialized with ${isStoragePersistent() ? 'persistent' : 'in-memory'} LibSQL storage`
);
