/**
 * Mastra Agent with Dynamic Agent Pattern & Three-Tier Memory System
 * Feature: 002-mastra-memory-system, Dynamic Agent Pattern
 *
 * Uses Mastra's Dynamic Agent pattern with RequestContext:
 * - Dynamic instructions: System prompt built at runtime based on subscription tier & locale
 * - Dynamic tools: Tool selection varies by subscription tier (standard vs trailblazer)
 * - Three-tier memory: Working Memory, Conversation History, Semantic Recall
 *
 * Storage: Supabase PostgreSQL with pgvector via @mastra/pg
 *
 * @see https://mastra.ai/docs/agents/dynamic-agents
 * @see https://mastra.ai/docs/agents/runtime-context
 * @see https://mastra.ai/docs/memory/overview
 */

import { Agent } from '@mastra/core/agent';
import { RequestContext } from '@mastra/core/request-context';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { createGateway } from '@ai-sdk/gateway';
import { buildMastraSystemPrompt, type PromptContext } from './prompt-builder';
// Composite Domain Tools (Feature 060: AI Agent Evolution)
import { analyzeLoadoutTool } from './tools/analyze-loadout';
import { inventoryInsightsTool } from './tools/inventory-insights';
import { searchGearKnowledgeTool } from './tools/search-gear-knowledge';
// Action tools (Feature: AI Add to Loadout)
import { addToLoadoutTool } from './tools/add-to-loadout';
// GearGraph MCP tools (searchGear + findAlternatives via GearGraph MCP server)
import { searchGearTool, findAlternativesTool } from './tools/mcp-graph';
// Legacy tools kept as fallback for edge cases
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';
// Three-tier memory system
import {
  GearshackUserProfileSchema,
} from './schemas/working-memory';

// =============================================================================
// Request Context Type Definition
// =============================================================================

/**
 * Type-safe request context for the Gearshack agent.
 * Passed via requestContext to dynamic instructions and tools callbacks.
 *
 * In Mastra v1.0+, DynamicArgument callbacks receive { requestContext }
 * which is the RequestContext instance passed to agent.stream()/generate().
 *
 * @see https://mastra.ai/docs/agents/runtime-context
 */
export type GearshackRequestContext = {
  /** Authenticated user ID */
  userId: string;
  /** User's subscription tier — determines available tools */
  subscriptionTier: 'standard' | 'trailblazer';
  /** User's locale (e.g., 'en', 'de') */
  lang: string;
  /** Pre-built prompt context for system prompt generation */
  promptContext: PromptContext;
  /** Optional pre-fetched data to append to the system prompt */
  enrichedPromptSuffix: string | undefined;
  /** Current loadout ID for loadout-aware tools */
  currentLoadoutId: string | undefined;
};

// =============================================================================
// Environment Configuration
// =============================================================================

// Lazy-loaded gateway instance (initialized on first use to avoid build-time errors)
let gatewayInstance: ReturnType<typeof createGateway> | null = null;

function getGateway() {
  if (!gatewayInstance) {
    const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!AI_GATEWAY_KEY) {
      throw new Error(
        'AI_GATEWAY_KEY is required for Mastra Agent. ' +
        'Please set AI_GATEWAY_API_KEY or AI_GATEWAY_KEY in your environment.'
      );
    }
    gatewayInstance = createGateway({
      apiKey: AI_GATEWAY_KEY,
    });
  }
  return gatewayInstance;
}

// Configuration constants (safe to read at module load)
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';

// Database configuration for Mastra storage
// Uses Supabase's direct PostgreSQL connection string
// Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const DATABASE_URL = process.env.DATABASE_URL;

// Memory configuration
const parsedMessages = parseInt(process.env.MASTRA_MEMORY_LAST_MESSAGES || '20', 10);
const MEMORY_LAST_MESSAGES = Number.isFinite(parsedMessages) && parsedMessages > 0 ? parsedMessages : 20;

// Semantic recall configuration
const SEMANTIC_TOP_K = parseInt(process.env.SEMANTIC_RECALL_TOP_K || '5', 10);
const SEMANTIC_THRESHOLD = parseFloat(process.env.SEMANTIC_RECALL_THRESHOLD || '0.7');
const SEMANTIC_MESSAGE_RANGE = parseInt(process.env.SEMANTIC_RECALL_MESSAGE_RANGE || '2', 10);

// Working memory feature flag
const WORKING_MEMORY_ENABLED = process.env.WORKING_MEMORY_ENABLED !== 'false';

// Lazy-loaded storage instances (initialized on first use)
let pgStoreInstance: PostgresStore | null = null;
let pgVectorInstance: PgVector | null = null;

function getPgStore(): PostgresStore {
  if (!pgStoreInstance) {
    if (!DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required for Mastra Memory storage. ' +
        'Get the PostgreSQL connection string from your Supabase dashboard: ' +
        'Settings > Database > Connection string (URI)'
      );
    }
    pgStoreInstance = new PostgresStore({
      id: 'gearshack-memory-storage',
      connectionString: DATABASE_URL,
    });
  }
  return pgStoreInstance;
}

function getPgVector(): PgVector {
  if (!pgVectorInstance) {
    if (!DATABASE_URL) {
      throw new Error(
        'DATABASE_URL is required for Mastra Vector storage. ' +
        'Get the PostgreSQL connection string from your Supabase dashboard: ' +
        'Settings > Database > Connection string (URI)'
      );
    }
    pgVectorInstance = new PgVector({
      id: 'gearshack-memory-vector',
      connectionString: DATABASE_URL,
    });
  }
  return pgVectorInstance;
}

// =============================================================================
// Tier-Based Tool Sets
// =============================================================================

/**
 * Standard tier tools: Basic inventory browsing and search capabilities.
 * Available to all users (free/standard tier).
 *
 * 4 tools: inventory stats, unified search, catalog search, direct SQL fallback
 */
const STANDARD_TOOLS = {
  inventoryInsights: inventoryInsightsTool,
  searchGearKnowledge: searchGearKnowledgeTool,
  searchGear: searchGearTool,
  queryUserData: queryUserDataSqlTool,
};

/**
 * Trailblazer tier tools: Full access to all 9 tools including
 * advanced analysis, actions, graph relationships, and web search.
 *
 * 9 tools: 3 composite + 1 action + 2 GearGraph MCP + 3 legacy
 */
const TRAILBLAZER_TOOLS = {
  // Composite Domain Tools (Feature 060: preferred for most queries)
  analyzeLoadout: analyzeLoadoutTool,
  inventoryInsights: inventoryInsightsTool,
  searchGearKnowledge: searchGearKnowledgeTool,
  // Action tools
  addToLoadout: addToLoadoutTool,
  // GearGraph MCP Tools: catalog search + alternatives via graph relationships
  // findAlternatives uses graph edges (LIGHTER_THAN, SIMILAR_TO, etc.) — NOT replaceable with SQL
  searchGear: searchGearTool,
  findAlternatives: findAlternativesTool,
  // Legacy tools (fallback for edge cases + direct Cypher)
  queryUserData: queryUserDataSqlTool,
  queryGearGraph: queryGearGraphTool,
  searchWeb: searchWebTool,
};

// =============================================================================
// Three-Tier Memory Configuration
// =============================================================================

/**
 * Create Memory instance with three-tier configuration
 *
 * Tier 1: Working Memory (resource-scoped)
 *   - Structured user profile the agent can read/update
 *   - Persists across all conversations
 *   - Uses Zod schema for type safety
 *
 * Tier 2: Conversation History (thread-scoped)
 *   - Last N messages from current conversation
 *   - Provides immediate dialogue context
 *
 * Tier 3: Semantic Recall (resource-scoped)
 *   - Vector similarity search across ALL past conversations
 *   - Finds relevant context from weeks/months ago
 *   - Uses text-embedding-3-small via Vercel AI Gateway
 *   - Powered by pgvector in Supabase PostgreSQL
 *
 * Storage Architecture:
 * - PostgresStore: Message history, conversation metadata
 * - PgVector: Embedding storage with HNSW index for fast similarity search
 * - Both use the same Supabase PostgreSQL database via DATABASE_URL
 *
 * @see https://mastra.ai/docs/memory/semantic-recall
 * @see https://mastra.ai/reference/vectors/pg
 */
function createAgentMemory(): Memory {
  // Build memory options
  const memoryOptions: Record<string, unknown> = {
    lastMessages: MEMORY_LAST_MESSAGES,
  };

  // Enable semantic recall with pgvector backend
  // Uses HNSW index with dotproduct metric (optimal for OpenAI embeddings)
  memoryOptions.semanticRecall = {
    topK: SEMANTIC_TOP_K,
    messageRange: SEMANTIC_MESSAGE_RANGE,
    threshold: SEMANTIC_THRESHOLD,
  };

  // Enable working memory with Zod schema
  if (WORKING_MEMORY_ENABLED) {
    memoryOptions.workingMemory = {
      enabled: true,
      schema: GearshackUserProfileSchema,
    };
  }

  const memory = new Memory({
    // PostgreSQL storage for message history and metadata
    storage: getPgStore(),
    // pgvector for semantic recall embeddings
    vector: getPgVector(),
    // Embedder for semantic recall via Vercel AI Gateway
    embedder: getGateway().textEmbeddingModel('openai/text-embedding-3-small'),
    options: memoryOptions,
  });

  return memory;
}

// =============================================================================
// Agent Creation — Dynamic Agent Pattern
// =============================================================================

/**
 * Create Mastra Agent with dynamic instructions, tools, and three-tier memory.
 *
 * Uses Mastra's Dynamic Agent Pattern (DynamicArgument<T>): instructions and
 * tools are async functions that receive { requestContext } and resolve at
 * runtime, enabling tier-based tool restriction and locale-aware prompt
 * generation directly in the Agent definition.
 *
 * IMPORTANT: Creates a NEW memory instance for each agent to avoid
 * cross-user data leakage in serverless/multi-user environments.
 *
 * @see https://mastra.ai/docs/agents/dynamic-agents
 */
export function createGearAgent() {
  // BUGFIX: Create a new memory instance for each agent to prevent
  // shared state between users in serverless environments
  const agentMemory = createAgentMemory();

  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',

    // Dynamic instructions: built at runtime from requestContext
    // DynamicArgument<AgentInstructions> = string | (({ requestContext }) => string | Promise<string>)
    instructions: async ({ requestContext }) => {
      const tier = (requestContext.get('subscriptionTier') as string) || 'standard';
      const promptContext = requestContext.get('promptContext') as PromptContext | undefined;
      const enrichedSuffix = requestContext.get('enrichedPromptSuffix') as string | undefined;

      // Build base system prompt from pre-computed context
      let prompt = promptContext
        ? buildMastraSystemPrompt(promptContext)
        : 'You are the Gearshack gear assistant. Help users with their outdoor gear questions.';

      // Append tier-specific tool availability note
      if (tier === 'standard') {
        prompt += '\n\n**Your Access Level:** Standard. You have access to inventory insights, gear search, and catalog browsing tools. For advanced features like loadout analysis, gear alternatives, web search, and GearGraph queries, suggest the user upgrade to Trailblazer.';
      }

      // Append pre-fetched data context (intent router results, loadout data, etc.)
      if (enrichedSuffix) {
        prompt = `${prompt}\n\n${enrichedSuffix}`;
      }

      return prompt;
    },

    model: getGateway()(AI_CHAT_MODEL),
    memory: agentMemory,

    // Dynamic tools: selected at runtime based on subscription tier
    // DynamicArgument<TTools> = TTools | (({ requestContext }) => TTools | Promise<TTools>)
    // Standard tier gets basic browse/search tools (4)
    // Trailblazer tier gets full toolset (9) including analysis, actions, and graph
    tools: async ({ requestContext }) => {
      const tier = (requestContext.get('subscriptionTier') as string) || 'standard';
      return tier === 'trailblazer'
        ? { ...TRAILBLAZER_TOOLS }
        : { ...STANDARD_TOOLS };
    },
  });

  console.log(
    `[Mastra Agent] Created with ${AI_CHAT_MODEL}, dynamic tools (tier-based), three-tier memory`
  );
  return agent;
}

// =============================================================================
// Request Context Factory
// =============================================================================

/**
 * Create a RequestContext populated with Gearshack-specific values.
 *
 * This factory builds the typed RequestContext that drives the Dynamic Agent:
 * - subscriptionTier → determines which tools are available
 * - lang → determines prompt language (en/de)
 * - promptContext → provides data for system prompt generation
 * - enrichedPromptSuffix → pre-fetched data to inject into prompt
 * - userId / currentLoadoutId → passed through for tool execution
 *
 * @param params - Context parameters for the current request
 * @returns Populated RequestContext ready for agent.stream()
 */
export function createGearshackRequestContext(params: {
  userId: string;
  subscriptionTier: 'standard' | 'trailblazer';
  lang: string;
  promptContext: PromptContext;
  enrichedPromptSuffix?: string;
  currentLoadoutId?: string;
}): RequestContext<GearshackRequestContext> {
  const requestContext = new RequestContext<GearshackRequestContext>();
  requestContext.set('userId', params.userId);
  requestContext.set('subscriptionTier', params.subscriptionTier);
  requestContext.set('lang', params.lang);
  requestContext.set('promptContext', params.promptContext);
  if (params.enrichedPromptSuffix !== undefined) {
    requestContext.set('enrichedPromptSuffix', params.enrichedPromptSuffix);
  }
  if (params.currentLoadoutId !== undefined) {
    requestContext.set('currentLoadoutId', params.currentLoadoutId);
  }
  return requestContext;
}

// =============================================================================
// Streaming Interface
// =============================================================================

/**
 * Stream response from Mastra Agent with RequestContext
 *
 * The requestContext drives the Dynamic Agent's behavior:
 * - instructions callback reads tier, locale, promptContext → builds system prompt
 * - tools callback reads tier → selects appropriate toolset
 * - Tool execution receives userId, currentLoadoutId for data access
 *
 * @param agent - Mastra Agent instance (created via createGearAgent)
 * @param message - Current user message
 * @param userId - User ID for memory scoping (resourceId)
 * @param conversationId - Conversation/thread ID for Mastra memory persistence
 * @param requestContext - Populated RequestContext with tier, locale, and prompt data
 */
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  requestContext: RequestContext<GearshackRequestContext>
) {
  // Only the current message — Mastra retrieves history via threadId
  const messages = [{ role: 'user' as const, content: message }];

  // Stream with requestContext so dynamic instructions/tools resolve per-request,
  // and threadId so Mastra's PostgresStore injects conversation history
  const stream = await agent.stream(messages, {
    resourceId: userId,
    threadId: conversationId,
    requestContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return {
    textStream: stream.textStream,
    toolCalls: stream.toolCalls || Promise.resolve([]),
    fullText: stream.text || Promise.resolve(''),
    finishReason: stream.finishReason || Promise.resolve('stop'),
  };
}
