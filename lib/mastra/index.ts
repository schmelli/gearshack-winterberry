/**
 * Mastra Agent Module
 * Feature: 001-mastra-agentic-voice, 002-mastra-memory-system
 *
 * This module provides the public API for the Mastra AI agent configuration.
 * All exports are re-exported from this index file for clean imports.
 *
 * Storage: Supabase PostgreSQL only (LibSQL removed in Feature 002)
 *
 * Usage:
 * ```typescript
 * import {
 *   mastraAgentConfig,
 *   buildMastraSystemPrompt,
 *   createMastraAgentConfig,
 * } from '@/lib/mastra';
 * ```
 */

// Main configuration exports
export {
  // Agent configuration
  mastraAgentConfig,
  createMastraAgentConfig,
  // Environment constants
  MASTRA_MODEL,
  MEMORY_RETENTION_DAYS,
  LOG_LEVEL,
  METRICS_ENABLED,
  TRACING_ENABLED,
  // Tool and workflow definitions
  DEFAULT_MCP_TOOLS,
  DEFAULT_WORKFLOWS,
  // Prompt builder (re-exported from config.ts)
  buildMastraSystemPrompt,
  LOCALIZED_CONTENT,
  type PromptContext,
} from './config';

// Three-tier memory system (Feature 002)
export { GearshackUserProfileSchema, type GearshackUserProfile } from './schemas/working-memory';
export { getWorkingMemory, saveWorkingMemory, deleteWorkingMemory } from './memory/working-memory-adapter';
export { searchSimilarMessages, embedAndStoreMessage } from './memory/semantic-recall';
export { generateEmbedding, generateEmbeddings, isEmbeddingAvailable } from './memory/embedding-service';
