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

import type {
  MastraAgent,
  MCPTool,
  WorkflowDefinition,
  WorkflowStep,
} from '@/types/mastra';

// Re-export prompt builder utilities
export {
  buildMastraSystemPrompt,
  LOCALIZED_CONTENT,
  type PromptContext,
} from './prompt-builder';

// =============================================================================
// Environment Configuration
// =============================================================================

/**
 * Mastra-specific environment variables
 *
 * Required:
 * - MASTRA_MODEL: AI model identifier (default: anthropic/claude-sonnet-4-5)
 * - AI_GATEWAY_API_KEY: Vercel AI Gateway API key
 *
 * Optional:
 * - MASTRA_MEMORY_RETENTION_DAYS: Days to retain conversation memory (default: 90)
 * - MASTRA_LOG_LEVEL: Logging level (default: info)
 * - MASTRA_METRICS_ENABLED: Enable Prometheus metrics (default: true)
 * - MASTRA_TRACING_ENABLED: Enable distributed tracing (default: true)
 */
export const MASTRA_MODEL =
  process.env.MASTRA_MODEL || 'anthropic/claude-sonnet-4-5';
export const MEMORY_RETENTION_DAYS = parseInt(
  process.env.MASTRA_MEMORY_RETENTION_DAYS || '90',
  10
);
export const LOG_LEVEL = (process.env.MASTRA_LOG_LEVEL || 'info') as
  | 'info'
  | 'debug'
  | 'warn'
  | 'error';
export const METRICS_ENABLED = process.env.MASTRA_METRICS_ENABLED !== 'false';
export const TRACING_ENABLED = process.env.MASTRA_TRACING_ENABLED !== 'false';

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
// Workflow Definitions
// =============================================================================

/**
 * Trip planner workflow steps
 * Multi-step reasoning process for trip planning
 */
const tripPlannerSteps: WorkflowStep[] = [
  {
    id: 'analyze_environment',
    type: 'api_request',
    dependencies: [],
    config: {
      description: 'Fetch weather and trail conditions for the destination',
      endpoint: '/api/mastra/workflows/trip-planner/environment',
    },
  },
  {
    id: 'analyze_inventory',
    type: 'tool_call',
    dependencies: [],
    config: {
      toolName: 'queryUserData',
      description: 'Analyze user inventory for trip requirements',
    },
  },
  {
    id: 'identify_gaps',
    type: 'llm_reasoning',
    dependencies: ['analyze_environment', 'analyze_inventory'],
    config: {
      description: 'Identify gear gaps based on environment and inventory',
      prompt: 'Compare the environmental requirements with the user inventory',
    },
  },
  {
    id: 'search_recommendations',
    type: 'tool_call',
    dependencies: ['identify_gaps'],
    config: {
      toolName: 'searchCatalog',
      description: 'Search catalog for gear recommendations to fill gaps',
    },
  },
  {
    id: 'generate_plan',
    type: 'llm_reasoning',
    dependencies: ['search_recommendations'],
    config: {
      description: 'Generate final trip plan with gear recommendations',
    },
  },
];

/**
 * Default workflow definitions for the Mastra agent
 */
export const DEFAULT_WORKFLOWS: WorkflowDefinition[] = [
  {
    name: 'trip_planner',
    description:
      'Multi-step workflow for planning a trip with gear recommendations',
    steps: tripPlannerSteps,
    maxDurationMs: 60000, // 1 minute timeout
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
    workflows: DEFAULT_WORKFLOWS,
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
