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
import { TokenLimiter, ToolCallFilter } from '@mastra/core/processors';
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
// Critic agent: budget-conscious review for expensive recommendations (Kap. 21)
import { reviewExpensiveRecommendationTool } from './tools/review-recommendation';
// Legacy tools kept as fallback for edge cases
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';
// Multilingual embedding configuration (Vorschlag 16)
import { createEmbedder, getEmbeddingModelId, getEmbeddingDimensions } from './embeddings';
// Three-tier memory system
import {
  GearshackUserProfileSchema,
} from './schemas/working-memory';
import { COMPLEXITY_ROUTING_CONFIG, SUPERVISOR_CONFIG } from './config';
import type { QueryComplexity } from './intent-router';
import type { Domain } from './supervisor';
import { logWarn, logInfo } from './logging';
// Agent Middleware — defense-in-depth guardrails
import { beforeGenerate, afterGenerate, createSanitizedTextStream } from './agent-middleware';
// AsyncLocalStorage bridge for tool execution context
// @mastra/core v1.0.4 creates a new empty RequestContext inside its agentic loop,
// discarding the one passed to agent.stream(). This store bridges that gap.
import { runWithRequestStore } from './request-store';
import type { RequestStoreContext } from './request-store';

// =============================================================================
// Request Context Type Definition
// =============================================================================

/**
 * Type-safe request context for the Gearshack agent.
 * Passed via requestContext to dynamic instructions and tools callbacks.
 *
 * Extends RequestStoreContext (the tool-visible subset) with agent-level
 * fields that only the dynamic instructions/tools callbacks need.
 * RequestStoreContext is the single source of truth for userId,
 * subscriptionTier, lang, and currentLoadoutId — see request-store.ts.
 *
 * In Mastra v1.0+, DynamicArgument callbacks receive { requestContext }
 * which is the RequestContext instance passed to agent.stream()/generate().
 *
 * @see https://mastra.ai/docs/agents/runtime-context
 */
export type GearshackRequestContext = RequestStoreContext & {
  /** Pre-built prompt context for system prompt generation (optional when enrichedPromptSuffix is the full prompt) */
  promptContext?: PromptContext;
  /** Optional pre-fetched data to append to the system prompt */
  enrichedPromptSuffix: string | undefined;
  /**
   * Domain classification from the Supervisor Agent (Kapitel 22).
   * Used to reduce tool set from 10 to 3–4 per request.
   * When undefined or supervisor routing is disabled, falls back to full tier-based toolset.
   */
  domain: Domain | undefined;
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

// Token limiter configuration
// Claude Sonnet context window is 200k tokens; keep headroom for system prompt + generation
const parsedTokenLimit = parseInt(process.env.MASTRA_TOKEN_LIMIT || '180000', 10);
const TOKEN_LIMIT = Number.isFinite(parsedTokenLimit) && parsedTokenLimit > 0 ? parsedTokenLimit : 180_000;
if (TOKEN_LIMIT > 195_000) {
  console.warn(`[Mastra Agent] TOKEN_LIMIT (${TOKEN_LIMIT}) exceeds recommended headroom for Claude Sonnet's 200k context window`);
}

// Input processors (module-level to avoid repeated allocation per request)
// Order matters: ToolCallFilter first to reduce noise, TokenLimiter last to enforce budget
const INPUT_PROCESSORS = [
  // ToolCallFilter: Strips call+result pairs for the two largest tools from conversation history.
  //
  // WHY analyzeLoadout and inventoryInsights specifically:
  //   - `analyzeLoadout` returns full loadout JSON (can be 10–50 KB per call)
  //   - `inventoryInsights` returns aggregated stats over all gear items (similarly large)
  //   Keeping these in history would exhaust the 180k token budget after only a few turns,
  //   even though the actual answers fit in a few sentences.
  //
  // TRADE-OFF: The agent cannot see prior tool results in its context window on follow-up turns.
  // It may re-invoke these tools if the user asks a follow-up; this is acceptable because:
  //   1. The incremental token cost of a repeat call is lower than carrying the full result forward
  //   2. Data may have changed between turns (e.g. user added a gear item)
  //   3. Sonnet can reconstruct context from its own text replies rather than raw tool output
  new ToolCallFilter({ exclude: ['analyzeLoadout', 'inventoryInsights'] }),
  new TokenLimiter({ limit: TOKEN_LIMIT }),
];

// Lazy-loaded storage instances (initialized on first use)
let pgStoreInstance: PostgresStore | null = null;
let pgVectorInstance: PgVector | null = null;

// Module-level persistence memory singleton for cache-hit exchanges.
// Shared across all calls to persistCacheHitToMemory() — avoids creating a
// new Memory instance (and potentially a new DB connection) on every cache hit.
// Uses history-only mode: no vector store or embedder needed since cache-hit
// messages are not indexed for semantic recall.
let persistenceMemoryInstance: Memory | null = null;

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
    // Include dimensions in the id so each embedding model gets its own internal
    // Mastra vector table. Without this, switching from openai/text-embedding-3-small
    // (1536d) to cohere/embed-multilingual-v3.0 (1024d) would cause a dimension
    // mismatch error when Mastra tries to insert 1024-dim vectors into the table
    // previously created for 1536-dim vectors.
    //   openai/text-embedding-3-small  → gearshack-memory-vector-1536d
    //   cohere/embed-multilingual-v3.0 → gearshack-memory-vector-1024d
    pgVectorInstance = new PgVector({
      id: `gearshack-memory-vector-${getEmbeddingDimensions()}d`,
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
 * Trailblazer tier tools: Full access to all 10 tools including
 * advanced analysis, actions, graph relationships, budget review, and web search.
 *
 * 10 tools: 3 composite + 1 action + 2 GearGraph MCP + 1 critic + 3 legacy
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
  // Critic Agent: budget-conscious review for expensive recommendations (>€300)
  // Call AFTER identifying a recommendation, BEFORE presenting it to the user
  reviewExpensiveRecommendation: reviewExpensiveRecommendationTool,
  // Legacy tools (fallback for edge cases + direct Cypher)
  queryUserData: queryUserDataSqlTool,
  queryGearGraph: queryGearGraphTool,
  searchWeb: searchWebTool,
};

// =============================================================================
// Domain-Based Tool Subsets (Supervisor-Agent-Pattern, Kapitel 22)
// =============================================================================

/**
 * A subset of the Trailblazer tool collection.
 * Using Partial<typeof TRAILBLAZER_TOOLS> constrains each domain entry to only
 * reference tools that actually exist in TRAILBLAZER_TOOLS, surfacing accidental
 * tool name mismatches at compile time rather than silently at runtime.
 */
type DomainToolSubset = Partial<typeof TRAILBLAZER_TOOLS>;

/**
 * Domain-specific tool subsets for the Trailblazer tier.
 * The Supervisor Agent classifies each message into a domain, then only the
 * relevant tools are passed to the LLM — reducing prompt size by ~40% for
 * non-gear queries.
 *
 * Tool counts per domain:
 * - gear:        10 tools (full set — >70% of queries, prompt references queryGearGraph + searchWeb)
 * - community:   3 tools (search + web + SQL fallback)
 * - marketplace: 4 tools (catalog search + alternatives + web + SQL)
 * - profile:     2 tools (SQL + inventory stats)
 *
 * Gear keeps the full 10-tool set because the system prompt's GearGraph guidance
 * and loadout analysis sections reference queryGearGraph and searchWeb. Excluding
 * them would create a prompt-tool mismatch. The token savings come from the ~30%
 * of non-gear queries that drop from 10 to 2–4 tools.
 *
 * Standard tier users always get STANDARD_TOOLS (4) regardless of domain,
 * since their toolset is already minimal.
 */
const DOMAIN_TOOLS_TRAILBLAZER: Record<Domain, DomainToolSubset> = {
  gear: {
    // Full toolset — system prompt's GearGraph guidance and loadout analysis
    // sections reference queryGearGraph and searchWeb explicitly.
    // reviewExpensiveRecommendation is included because the system prompt instructs
    // the model to call it for any gear recommendation over €300 — omitting it would
    // create a silent mismatch between instructions and available tools.
    analyzeLoadout: analyzeLoadoutTool,
    inventoryInsights: inventoryInsightsTool,
    searchGearKnowledge: searchGearKnowledgeTool,
    addToLoadout: addToLoadoutTool,
    searchGear: searchGearTool,
    findAlternatives: findAlternativesTool,
    reviewExpensiveRecommendation: reviewExpensiveRecommendationTool,
    queryUserData: queryUserDataSqlTool,
    queryGearGraph: queryGearGraphTool,
    searchWeb: searchWebTool,
  },
  community: {
    searchGearKnowledge: searchGearKnowledgeTool, // includes communityInsights via RAG
    searchWeb: searchWebTool,
    queryUserData: queryUserDataSqlTool,
  },
  marketplace: {
    searchGear: searchGearTool,
    findAlternatives: findAlternativesTool,
    searchWeb: searchWebTool,
    queryUserData: queryUserDataSqlTool,
  },
  profile: {
    queryUserData: queryUserDataSqlTool,
    inventoryInsights: inventoryInsightsTool,
  },
};

/**
 * Select tools based on subscription tier and domain classification.
 *
 * Priority: tier → domain
 * - Standard tier: always STANDARD_TOOLS (4 tools) — already minimal
 * - Trailblazer tier + domain: DOMAIN_TOOLS_TRAILBLAZER[domain]
 * - Trailblazer tier + no domain: full TRAILBLAZER_TOOLS (10 tools, legacy path)
 *
 * Return type is `typeof STANDARD_TOOLS | Partial<typeof TRAILBLAZER_TOOLS>` rather
 * than the broad `Record<string, unknown>` so that compile-time type checking still
 * applies at call sites. `typeof TRAILBLAZER_TOOLS` satisfies `Partial<typeof TRAILBLAZER_TOOLS>`,
 * so all three branches are covered by this union without losing the `DomainToolSubset`
 * safety guarantee established by the type alias above.
 */
function selectToolsForRequest(
  tier: 'standard' | 'trailblazer',
  domain?: Domain,
): typeof STANDARD_TOOLS | Partial<typeof TRAILBLAZER_TOOLS> {
  // Standard tier is already minimal (4 tools) — domain filtering adds no benefit
  if (tier !== 'trailblazer') {
    return { ...STANDARD_TOOLS };
  }

  // Trailblazer: apply domain-based filtering if supervisor routing is enabled
  if (SUPERVISOR_CONFIG.ENABLED && domain) {
    return { ...DOMAIN_TOOLS_TRAILBLAZER[domain] };
  }

  // Fallback: full trailblazer toolset (supervisor disabled or domain not classified)
  return { ...TRAILBLAZER_TOOLS };
}

/**
 * Get the tool names that will be used for a given tier + domain combination.
 * Used by the chat route to pass domainToolNames to the workflow for prompt building.
 *
 * @param tier - Subscription tier
 * @param domain - Classified domain (optional)
 * @returns Array of tool name strings
 */
export function getToolNamesForRequest(
  tier: 'standard' | 'trailblazer',
  domain?: Domain,
): string[] {
  const tools = selectToolsForRequest(tier, domain);
  return Object.keys(tools);
}

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
 *   - Configurable embedder via EMBEDDING_MODEL env var:
 *     - openai/text-embedding-3-small (1536d, default)
 *     - cohere/embed-multilingual-v3.0 (1024d, DE/EN parity)
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
    // Supports multilingual (DE/EN) via EMBEDDING_MODEL env var
    embedder: createEmbedder(getGateway()),
    options: memoryOptions,
  });

  return memory;
}

// =============================================================================
// Agent Creation — Dynamic Agent Pattern
// =============================================================================

/**
 * Select the appropriate model based on query complexity.
 *
 * Simple queries (inventory counts, item lookups, general knowledge) → Haiku (10x cheaper, 5x faster)
 * Complex queries (shakedown analysis, trip planning, comparisons) → Sonnet (full reasoning)
 *
 * @param queryComplexity - Complexity derived from intent classification
 * @returns Object with AI Gateway model instance and resolved model ID
 */
function selectModel(queryComplexity?: QueryComplexity) {
  const gateway = getGateway();

  if (!COMPLEXITY_ROUTING_CONFIG.ENABLED || !queryComplexity) {
    return { model: gateway(AI_CHAT_MODEL), modelId: AI_CHAT_MODEL };
  }

  const modelId = queryComplexity === 'simple'
    ? COMPLEXITY_ROUTING_CONFIG.SIMPLE_MODEL
    : COMPLEXITY_ROUTING_CONFIG.COMPLEX_MODEL;

  return { model: gateway(modelId), modelId };
}

/**
 * Create Mastra Agent with Dynamic Agent Pattern, three-tier memory, and input processors.
 *
 * Uses Mastra's Dynamic Agent Pattern (DynamicArgument<T>): instructions and
 * tools are async functions that receive { requestContext } and resolve at
 * runtime, enabling tier-based tool restriction and locale-aware prompt
 * generation without recreating the agent per-variant.
 *
 * IMPORTANT: Creates a NEW memory instance for each agent to avoid
 * cross-user data leakage in serverless/multi-user environments.
 *
 * Voice (TTS/STT) is handled independently by the dedicated voice API routes
 * (/api/mastra/voice/synthesize and /api/mastra/voice/transcribe) via Mastra's
 * MastraVoice abstraction — it does not need to be attached to the agent.
 *
 * Input Processors (applied to memory-injected messages before LLM call):
 * 1. ToolCallFilter: Strips verbose tool call/result pairs from history
 *    (analyzeLoadout, inventoryInsights return large JSON payloads)
 * 2. TokenLimiter: Enforces a hard token budget (default 180k) to stay
 *    safely within Claude Sonnet's 200k context window
 *
 * @param queryComplexity - Optional complexity for model routing (simple → Haiku, complex → Sonnet)
 * @see https://mastra.ai/docs/agents/dynamic-agents
 */
export function createGearAgent(queryComplexity?: QueryComplexity) {
  // BUGFIX: Create a new memory instance for each agent to prevent
  // shared state between users in serverless environments
  const agentMemory = createAgentMemory();

  const { model: selectedModel, modelId } = selectModel(queryComplexity);

  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',

    // Dynamic instructions: built at runtime from requestContext.
    // When the workflow pipeline pre-builds the full system prompt, it is passed
    // as enrichedPromptSuffix (which IS the complete prompt in that path).
    // When promptContext is provided, buildMastraSystemPrompt generates the base prompt.
    // DynamicArgument<AgentInstructions> = string | (({ requestContext }) => string | Promise<string>)
    instructions: async ({ requestContext }) => {
      const tier = requestContext.get('subscriptionTier') === 'trailblazer' ? 'trailblazer' : 'standard';
      const promptContext = requestContext.get('promptContext') as PromptContext | undefined;
      const enrichedSuffix = requestContext.get('enrichedPromptSuffix') as string | undefined;
      const lang = (requestContext.get('lang') as string) || 'en';

      // If enrichedSuffix is the full pre-built prompt (workflow path), use it directly
      // Otherwise build from promptContext (legacy path)
      let prompt: string;
      if (enrichedSuffix && !promptContext) {
        // Workflow path: enrichedSuffix IS the complete system prompt
        prompt = enrichedSuffix;
      } else if (promptContext) {
        // Legacy path: build from promptContext, then append suffix if present
        prompt = buildMastraSystemPrompt(promptContext);
        if (enrichedSuffix) {
          prompt = `${prompt}\n\n${enrichedSuffix}`;
        }
      } else {
        // Minimal fallback — locale-aware
        prompt = lang === 'de'
          ? 'Du bist der Gearshack Ausrüstungsassistent. Hilf Nutzern mit ihren Outdoor-Ausrüstungsfragen.'
          : 'You are the Gearshack gear assistant. Help users with their outdoor gear questions.';
      }

      // Append tier-specific tool availability note for standard users
      if (tier === 'standard') {
        prompt += '\n\n**Your Access Level:** Standard. You have access to inventory insights, gear search, and catalog browsing tools. For advanced features like loadout analysis, gear alternatives, web search, and GearGraph queries, suggest the user upgrade to Trailblazer.';
      }

      return prompt;
    },

    model: selectedModel,
    memory: agentMemory,
    inputProcessors: INPUT_PROCESSORS,

    // Dynamic tools: selected at runtime based on subscription tier AND domain.
    // DynamicArgument<TTools> = TTools | (({ requestContext }) => TTools | Promise<TTools>)
    //
    // Two-axis selection (Supervisor-Agent-Pattern, Kapitel 22):
    // 1. Tier: standard (4 tools) vs trailblazer (up to 10)
    // 2. Domain: gear/community/marketplace/profile — reduces trailblazer from 10 to 2–9
    //
    // Standard tier gets basic browse/search tools (4).
    // Trailblazer tier gets full toolset (10) including analysis, actions, critic, and graph.
    // Net effect: non-gear queries on trailblazer get 2–4 tools instead of 10,
    // reducing prompt size by ~40% and improving tool selection accuracy.
    tools: async ({ requestContext }) => {
      const tier = requestContext.get('subscriptionTier') === 'trailblazer' ? 'trailblazer' : 'standard';
      const domain = requestContext.get('domain') as Domain | undefined;
      return selectToolsForRequest(tier, domain);
    },
  });

  console.log(
    `[Mastra Agent] Created with ${modelId} (complexity: ${queryComplexity ?? 'default'}), dynamic tools (tier + domain routing), three-tier memory, processors: ToolCallFilter + TokenLimiter(${TOKEN_LIMIT}), embeddings: ${getEmbeddingModelId()} (${getEmbeddingDimensions()}d)`
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
 * - promptContext → (optional) provides data for system prompt generation via buildMastraSystemPrompt
 * - enrichedPromptSuffix → pre-built prompt or pre-fetched data to inject
 * - userId / currentLoadoutId → passed through for tool execution
 *
 * When using the workflow pipeline, pass enrichedPromptSuffix = effectiveSystemPrompt
 * (the full prompt built by the workflow) and omit promptContext.
 *
 * @param params - Context parameters for the current request
 * @returns Populated RequestContext ready for agent.stream()
 */
export function createGearshackRequestContext(params: {
  userId: string;
  subscriptionTier: 'standard' | 'trailblazer';
  lang: string;
  promptContext?: PromptContext;
  enrichedPromptSuffix?: string;
  currentLoadoutId?: string;
  /** Domain from Supervisor Agent classification (Kapitel 22) */
  domain?: Domain;
}): RequestContext<GearshackRequestContext> {
  const requestContext = new RequestContext<GearshackRequestContext>();
  requestContext.set('userId', params.userId);
  requestContext.set('subscriptionTier', params.subscriptionTier);
  requestContext.set('lang', params.lang);
  if (params.promptContext !== undefined) {
    requestContext.set('promptContext', params.promptContext);
  }
  if (params.enrichedPromptSuffix !== undefined) {
    requestContext.set('enrichedPromptSuffix', params.enrichedPromptSuffix);
  }
  if (params.currentLoadoutId !== undefined) {
    requestContext.set('currentLoadoutId', params.currentLoadoutId);
  }
  if (params.domain !== undefined) {
    requestContext.set('domain', params.domain);
  }
  return requestContext;
}

// =============================================================================
// Cache-Hit Memory Persistence
// =============================================================================

/**
 * Returns the shared persistence-only Memory instance, creating it on first call.
 *
 * Uses history-only mode (no vector store / embedder) because cache-hit messages
 * are not indexed for semantic recall — we only need DB write access.
 */
function getPersistenceMemory(): Memory {
  if (!persistenceMemoryInstance) {
    persistenceMemoryInstance = new Memory({
      storage: getPgStore(),
      // No vector or embedder: cache-hit messages are not added to semantic recall index
      options: {
        lastMessages: MEMORY_LAST_MESSAGES,
        semanticRecall: false,
        workingMemory: { enabled: false },
      },
    });
  }
  return persistenceMemoryInstance;
}

/**
 * Persist a cache-hit exchange to Mastra's conversation memory.
 *
 * When a response is served from the semantic cache, `streamMastraResponse`
 * (and therefore `agent.stream()`) is never called, so Mastra's PostgresStore
 * never records the user's message or the cached reply. Without this, the
 * agent loses conversational context for follow-up questions.
 *
 * Fire-and-forget safe: all errors are swallowed and logged, so a failure
 * here never affects the streaming response already sent to the client.
 *
 * @param userId - User ID (Mastra resourceId)
 * @param conversationId - Conversation ID (Mastra threadId)
 * @param userMessage - The user's original question
 * @param cachedResponse - The cached assistant reply that was served
 */
export async function persistCacheHitToMemory(
  userId: string,
  conversationId: string,
  userMessage: string,
  cachedResponse: string
): Promise<void> {
  try {
    const memory = getPersistenceMemory();

    // NOTE: Memory.saveMessages is an internal Mastra API not yet publicly typed.
    // Tested against @mastra/memory ^1.0.0 (see package.json). If this breaks after
    // a Mastra upgrade, check the @mastra/memory CHANGELOG for saveMessages() changes.
    // TECH-DEBT: Track upstream typing at https://github.com/mastra-ai/mastra — once
    // saveMessages is exported from the public API surface, remove the cast below.
    // The runtime typeof guard provides a safety net for API renames in the meantime.
    const memWithSave = memory as unknown as {
      saveMessages: (params: {
        messages: Array<{ role: string; content: string }>;
        threadId: string;
        resourceId: string;
      }) => Promise<unknown>;
    };

    if (typeof memWithSave.saveMessages !== 'function') {
      logWarn('[Cache] Memory.saveMessages not available in this Mastra version — skipping persistence', {
        metadata: { conversationId, userId },
      });
      return;
    }

    await memWithSave.saveMessages({
      messages: [
        { role: 'user', content: userMessage },
        { role: 'assistant', content: cachedResponse },
      ],
      threadId: conversationId,
      resourceId: userId,
    });
  } catch (error) {
    // Log but never throw — cache hit UX must not be affected by persistence failures
    logWarn('[Cache] Failed to persist cache-hit exchange to memory', {
      metadata: { error: error instanceof Error ? error.message : String(error) },
    });
  }
}

// =============================================================================
// Streaming Interface
// =============================================================================

/**
 * Stream response from Mastra Agent with RequestContext and Guardrails
 *
 * The requestContext drives the Dynamic Agent's behavior:
 * - instructions callback reads tier, locale, promptContext → builds system prompt
 * - tools callback reads tier → selects appropriate toolset
 * - Tool execution receives userId, currentLoadoutId for data access
 *
 * Agent Middleware:
 * - beforeGenerate: Prompt injection detection + message length enforcement
 * - afterGenerate: PII redaction from agent output text (stream + fullText)
 *
 * @param agent - Mastra Agent instance (created via createGearAgent)
 * @param message - Current user message
 * @param userId - User ID for memory scoping (resourceId)
 * @param conversationId - Conversation/thread ID for Mastra memory persistence
 * @param requestContext - Populated RequestContext with tier, locale, and prompt data
 * @throws Error if beforeGenerate rejects the message (prompt injection detected)
 */
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  requestContext: RequestContext<GearshackRequestContext>
) {
  // ── beforeGenerate: Input validation & sanitization ──
  const guardResult = beforeGenerate(message, userId, conversationId);

  if (!guardResult.allowed) {
    // Throw so the caller (chat route) can emit an error SSE event.
    // The generic message avoids leaking detection logic to the client.
    throw new Error(guardResult.rejectionReason ?? 'Message blocked by safety filter');
  }

  // Use the sanitized (possibly truncated) message
  const safeMessage = guardResult.sanitizedMessage ?? message;

  if (guardResult.wasTruncated) {
    logInfo('[Agent Middleware] Streaming with truncated message', {
      userId,
      conversationId,
      metadata: { originalLength: message.length, safeLength: safeMessage.length },
    });
  }

  // Only the current message — Mastra retrieves history via threadId
  const messages = [{ role: 'user' as const, content: safeMessage }];

  // Build AsyncLocalStorage context so tools can access userId even though
  // @mastra/core v1.0.4 does not propagate requestContext to tool execute().
  // Runtime validation instead of unsafe `as` casts — values from requestContext.get()
  // are typed as `unknown`, so we validate before assigning.
  const tier = requestContext.get('subscriptionTier');
  const lang = requestContext.get('lang');
  const loadoutId = requestContext.get('currentLoadoutId');

  const storeContext: RequestStoreContext = {
    userId,
    subscriptionTier: tier === 'trailblazer' ? 'trailblazer' : 'standard',
    lang: typeof lang === 'string' && lang ? lang : 'en',
    currentLoadoutId: typeof loadoutId === 'string' ? loadoutId : undefined,
  };

  // Wrap the entire streaming lifecycle in AsyncLocalStorage so that ALL
  // async operations — including deferred tool execute() callbacks triggered
  // by the LLM's agentic loop — inherit the request-scoped context.
  const stream = await runWithRequestStore(storeContext, () =>
    agent.stream(messages, {
      resourceId: userId,
      threadId: conversationId,
      requestContext,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
  );

  // ── afterGenerate: Wrap textStream with PII sanitization ──
  // Transform the async iterable to apply output guardrails on each chunk.
  // Uses a small buffer to catch PII patterns that straddle chunk boundaries.
  const originalTextStream = stream.textStream;
  const sanitizedTextStream = createSanitizedTextStream(originalTextStream, userId, conversationId);

  // Also sanitize the resolved full-text value so callers using fullText
  // (e.g. for persistence or logging) do not receive unredacted PII.
  // The `Promise.resolve('')` fallback when stream.text is falsy is intentional —
  // it mirrors the original `stream.text || Promise.resolve('')` behaviour and
  // ensures callers always receive a settled Promise rather than undefined.
  const sanitizedFullText: Promise<string> = stream.text
    ? stream.text.then((text: string) => afterGenerate(text, userId, conversationId).sanitizedText)
    : Promise.resolve('');

  return {
    textStream: sanitizedTextStream,
    toolCalls: stream.toolCalls || Promise.resolve([]),
    fullText: sanitizedFullText,
    finishReason: stream.finishReason || Promise.resolve('stop'),
  };
}

