/**
 * Mastra Agent Configuration
 * Feature: 001-mastra-agentic-voice
 * Task: T011 - Create Mastra agent configuration
 *
 * This module provides the core configuration for the Mastra AI agent,
 * including model settings, tool definitions, workflow definitions,
 * and observability settings.
 *
 * Architecture: Server-only - uses Supabase for memory persistence
 */

import { z } from 'zod';
import type {
  MastraAgent,
  MCPTool,
} from '@/types/mastra';

// Re-export prompt builder utilities
export {
  buildMastraSystemPrompt,
  LOCALIZED_CONTENT,
  type PromptContext,
} from './prompt-builder';

// =============================================================================
// Environment Configuration with Zod Validation
// =============================================================================

/**
 * Zod schema for Mastra environment variables
 * Validates required variables at startup to prevent runtime errors
 */
const mastraEnvSchema = z.object({
  /** AI model identifier (required for AI operations) */
  MASTRA_MODEL: z.string().default('anthropic/claude-sonnet-4-5'),
  /** Vercel AI Gateway API key - required for AI operations */
  AI_GATEWAY_API_KEY: z.string().min(1, 'AI_GATEWAY_API_KEY is required for AI operations').optional(),
  /** Days to retain conversation memory */
  MASTRA_MEMORY_RETENTION_DAYS: z.coerce.number().int().positive().default(90),
  /** Logging level */
  MASTRA_LOG_LEVEL: z.enum(['info', 'debug', 'warn', 'error']).default('info'),
  /** Enable Prometheus metrics */
  MASTRA_METRICS_ENABLED: z.string().default('true').transform(v => v !== 'false'),
  /** Enable distributed tracing */
  MASTRA_TRACING_ENABLED: z.string().default('true').transform(v => v !== 'false'),
  /** Maximum audio file size in MB */
  MASTRA_MAX_AUDIO_SIZE_MB: z.coerce.number().int().positive().default(25),
  /** Memory history limit for context */
  MASTRA_MEMORY_HISTORY_LIMIT: z.coerce.number().int().positive().default(50),
});

/**
 * Validated Mastra environment configuration
 * Throws descriptive error at startup if required variables are missing
 */
function validateEnv() {
  const result = mastraEnvSchema.safeParse({
    MASTRA_MODEL: process.env.MASTRA_MODEL,
    AI_GATEWAY_API_KEY: process.env.AI_GATEWAY_API_KEY,
    MASTRA_MEMORY_RETENTION_DAYS: process.env.MASTRA_MEMORY_RETENTION_DAYS,
    MASTRA_LOG_LEVEL: process.env.MASTRA_LOG_LEVEL,
    MASTRA_METRICS_ENABLED: process.env.MASTRA_METRICS_ENABLED,
    MASTRA_TRACING_ENABLED: process.env.MASTRA_TRACING_ENABLED,
    MASTRA_MAX_AUDIO_SIZE_MB: process.env.MASTRA_MAX_AUDIO_SIZE_MB,
    MASTRA_MEMORY_HISTORY_LIMIT: process.env.MASTRA_MEMORY_HISTORY_LIMIT,
  });

  if (!result.success) {
    const errors = result.error.issues
      .map((e) => `  - ${e.path.join('.')}: ${e.message}`)
      .join('\n');
    console.error(`[Mastra Config] Environment validation failed:\n${errors}`);

    // In production, fail fast for missing required variables
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[Mastra Config] Missing required environment variables:\n${errors}`);
    }
    // In development, allow graceful degradation with defaults
  }

  return result.success ? result.data : mastraEnvSchema.parse({});
}

const validatedEnv = validateEnv();

/**
 * Exported configuration values (validated)
 */
export const MASTRA_MODEL = validatedEnv.MASTRA_MODEL;
export const MEMORY_RETENTION_DAYS = validatedEnv.MASTRA_MEMORY_RETENTION_DAYS;
export const LOG_LEVEL = validatedEnv.MASTRA_LOG_LEVEL;
export const METRICS_ENABLED = validatedEnv.MASTRA_METRICS_ENABLED;
export const TRACING_ENABLED = validatedEnv.MASTRA_TRACING_ENABLED;
export const MAX_AUDIO_SIZE_MB = validatedEnv.MASTRA_MAX_AUDIO_SIZE_MB;
export const MEMORY_HISTORY_LIMIT = validatedEnv.MASTRA_MEMORY_HISTORY_LIMIT;

/**
 * Check if AI features are available (API key configured)
 */
export function isAIAvailable(): boolean {
  return !!process.env.AI_GATEWAY_API_KEY;
}

// =============================================================================
// MCP Tool Definitions
// =============================================================================

/**
 * Default MCP tools for the Mastra agent
 * These are discovered dynamically from the GearGraph MCP server
 */
export const DEFAULT_MCP_TOOLS: MCPTool[] = [
  {
    name: 'queryUserData',
    description:
      'Query user data from the database (gear_items, loadouts, categories, profiles)',
    inputSchema: {
      type: 'object',
      properties: {
        table: {
          type: 'string',
          enum: ['gear_items', 'loadouts', 'categories', 'profiles'],
          description: 'The table to query',
        },
        search: {
          type: 'object',
          properties: {
            column: { type: 'string', description: 'Column to search' },
            value: { type: 'string', description: 'Search value' },
          },
          description: 'Text search parameters',
        },
        filters: {
          type: 'object',
          additionalProperties: true,
          description: 'Exact match filters',
        },
        limit: {
          type: 'number',
          default: 20,
          description: 'Maximum results to return',
        },
      },
      required: ['table'],
    },
    transport: 'http',
  },
  {
    name: 'searchCatalog',
    description:
      'Search the GearGraph product catalog with filters for weight, price, category, and brands',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query text' },
        category: { type: 'string', description: 'Category filter' },
        maxWeight: { type: 'number', description: 'Maximum weight in grams' },
        maxPrice: { type: 'number', description: 'Maximum price in USD' },
        brands: {
          type: 'array',
          items: { type: 'string' },
          description: 'Brand filters',
        },
        limit: { type: 'number', default: 10, description: 'Maximum results' },
      },
    },
    transport: 'http',
  },
  {
    name: 'searchWeb',
    description:
      'Search the web for real-time information about trails, weather, gear reviews, and news',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
        type: {
          type: 'string',
          enum: ['general', 'news', 'images'],
          default: 'general',
        },
        limit: { type: 'number', default: 5, description: 'Maximum results' },
      },
      required: ['query'],
    },
    transport: 'http',
  },
  {
    name: 'addToWishlist',
    description: "Add a gear item to the user's wishlist",
    inputSchema: {
      type: 'object',
      properties: {
        gearItemId: {
          type: 'string',
          format: 'uuid',
          description: 'UUID of the gear item',
        },
      },
      required: ['gearItemId'],
    },
    transport: 'http',
  },
  {
    name: 'sendMessage',
    description: 'Send a message to another community member',
    inputSchema: {
      type: 'object',
      properties: {
        recipientUserId: {
          type: 'string',
          format: 'uuid',
          description: 'Recipient user UUID',
        },
        messagePreview: {
          type: 'string',
          maxLength: 100,
          description: 'Message preview (first 100 chars)',
        },
      },
      required: ['recipientUserId', 'messagePreview'],
    },
    transport: 'http',
  },
  {
    name: 'navigate',
    description: 'Navigate the user to a specific page in the app',
    inputSchema: {
      type: 'object',
      properties: {
        destination: {
          type: 'string',
          description: 'Destination page (e.g., "inventory", "loadouts")',
        },
      },
      required: ['destination'],
    },
    transport: 'http',
  },
];



// =============================================================================
// Agent Configuration Factory
// =============================================================================

/**
 * Create the Mastra agent configuration
 *
 * @param overrides - Optional configuration overrides
 * @returns Complete MastraAgent configuration
 */
export function createMastraAgentConfig(
  overrides?: Partial<MastraAgent>
): MastraAgent {
  return {
    name: 'gearshack-assistant',
    model: MASTRA_MODEL,
    instructions: '', // Dynamic - built per request via buildMastraSystemPrompt
    tools: DEFAULT_MCP_TOOLS,
    memory: {
      adapter: 'supabase',
      retentionDays: MEMORY_RETENTION_DAYS,
    },
    observability: {
      logging: {
        enabled: true,
        format: 'json',
        level: LOG_LEVEL,
      },
      metrics: {
        enabled: METRICS_ENABLED,
        endpoint: '/api/mastra/metrics',
      },
      tracing: {
        enabled: TRACING_ENABLED,
      },
    },
    ...overrides,
  };
}

/**
 * Default Mastra agent configuration
 * Exported for use by agent initialization
 */
export const mastraAgentConfig = createMastraAgentConfig();

// =============================================================================
// AI Agent Evolution Configuration (Feature 060)
// =============================================================================

/**
 * Intent Router Configuration
 * Feature: 060-ai-agent-evolution
 */
export const INTENT_ROUTER_CONFIG = {
  /** Timeout for intent classification (milliseconds) */
  TIMEOUT_MS: 3000,
  /** Model to use for intent classification (Gemini Flash) */
  MODEL: 'gemini-2.0-flash-exp',
} as const;

/**
 * Parallel Pre-Fetch Configuration
 * Feature: 060-ai-agent-evolution
 */
export const PREFETCH_CONFIG = {
  /** Timeout for individual pre-fetch operations (milliseconds) */
  TIMEOUT_MS: 4000,
  /** Maximum concurrent pre-fetch operations to prevent connection pool exhaustion */
  MAX_CONCURRENT: 5,
} as const;

/**
 * Fast Answer Generation Configuration
 * Feature: 060-ai-agent-evolution
 */
export const FAST_ANSWER_CONFIG = {
  /** Timeout for fast answer generation (milliseconds) */
  TIMEOUT_MS: 5000,
  /** Model to use for fast answers (Gemini Flash) */
  MODEL: 'gemini-2.0-flash-exp',
  /** Maximum tokens for fast answers */
  MAX_TOKENS: 500,
} as const;

/**
 * Complexity-Based Model Routing Configuration
 *
 * Routes simple queries (inventory lookups, factual questions) to a cheaper/faster
 * model (Haiku) while keeping complex analysis on the full model (Sonnet).
 * Achieves 60-80% cost savings on simple queries that make up the majority of traffic.
 *
 * @see Chapter 2: "Start with more expensive models when prototyping — once you get
 * something working, you can tweak cost."
 */
export const COMPLEXITY_ROUTING_CONFIG = {
  /** Model for simple queries: inventory counts, item lookups, general knowledge (10x cheaper, 5x faster) */
  SIMPLE_MODEL: process.env.AI_SIMPLE_MODEL || 'anthropic/claude-haiku-4-5',
  /** Model for complex queries: shakedown analysis, trip planning, gear comparison */
  COMPLEX_MODEL: process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5',
  /** Enable/disable complexity routing (set to 'false' to always use the complex model) */
  ENABLED: process.env.COMPLEXITY_ROUTING_ENABLED !== 'false',
} as const;
