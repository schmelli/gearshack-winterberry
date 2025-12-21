/**
 * Mastra Agent Module
 * Feature: 001-mastra-agentic-voice
 *
 * This module provides the public API for the Mastra AI agent configuration.
 * All exports are re-exported from this index file for clean imports.
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
