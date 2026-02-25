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
  // Tool definitions
  DEFAULT_MCP_TOOLS,
  // Prompt builder (re-exported from config.ts)
  buildMastraSystemPrompt,
  LOCALIZED_CONTENT,
  type PromptContext,
} from './config';

// Three-tier memory system (Feature 002)
export { GearshackUserProfileSchema, type GearshackUserProfile } from './schemas/working-memory';

// Mastra Framework Instance & Workflows
export { mastra } from './instance';
export {
  gearAssistantWorkflow,
  type GearAssistantWorkflowOutput,
} from './workflows/gear-assistant-workflow';

// NOTE: Eval APIs are intentionally NOT exported from this root index.
// They are CI/server-only tooling and should not enter the client bundle.
// Import directly: import { ... } from '@/lib/mastra/evals'
