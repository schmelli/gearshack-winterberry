/**
 * Mastra Agent with Four-Tier Memory System
 * Feature: 002-mastra-memory-system + Observational Memory
 *
 * Uses Mastra's Agent class with:
 * 1. Working Memory: Structured user profile (Zod schema) - resource-scoped
 * 2. Conversation History: Last N messages - thread-scoped
 * 3. Semantic Recall: Vector similarity search - resource-scoped
 * 4. Observational Memory: Observer + Reflector for long-context compression - thread-scoped
 *
 * Storage: Supabase PostgreSQL with pgvector via @mastra/pg
 *
 * @see https://mastra.ai/docs/memory/overview
 * @see https://mastra.ai/docs/memory/semantic-recall
 * @see https://mastra.ai/docs/memory/observational-memory
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { createGateway } from '@ai-sdk/gateway';
// Composite Domain Tools (Feature 060: AI Agent Evolution)
import { analyzeLoadoutTool } from './tools/analyze-loadout';
import { inventoryInsightsTool } from './tools/inventory-insights';
import { searchGearKnowledgeTool } from './tools/search-gear-knowledge';
// Legacy tools kept as fallback for edge cases
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';
// Working memory persistence
import { updateWorkingMemoryTool } from './tools/update-working-memory';
// Three-tier memory system
import {
  GearshackUserProfileSchema,
} from './schemas/working-memory';

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

// Observational Memory configuration
const OM_ENABLED = process.env.OBSERVATIONAL_MEMORY_ENABLED !== 'false'; // enabled by default
const OM_MODEL = process.env.OM_MODEL || 'google/gemini-2.5-flash';
const OM_MESSAGE_TOKENS = parseInt(process.env.OM_MESSAGE_TOKENS || '20000', 10);
const OM_OBSERVATION_TOKENS = parseInt(process.env.OM_OBSERVATION_TOKENS || '40000', 10);

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
// Three-Tier Memory Configuration
// =============================================================================

/**
 * Create Memory instance with four-tier configuration
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
 * Tier 4: Observational Memory (thread-scoped)
 *   - Observer compresses tool results and messages into dense observations
 *   - Reflector condenses observations when they grow too large
 *   - Ideal for tool-heavy conversations (SQL queries, catalog searches, GearGraph)
 *   - Provides 5-40× compression ratio
 *   - Uses google/gemini-2.5-flash for Observer and Reflector
 *
 * Storage Architecture:
 * - PostgresStore: Message history, conversation metadata, observations
 * - PgVector: Embedding storage with HNSW index for fast similarity search
 * - Both use the same Supabase PostgreSQL database via DATABASE_URL
 *
 * @see https://mastra.ai/docs/memory/semantic-recall
 * @see https://mastra.ai/docs/memory/observational-memory
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
    // HNSW index configuration for optimized vector search
    indexConfig: {
      type: 'hnsw',
      metric: 'dotproduct', // Recommended for OpenAI text-embedding-3-small
      m: 16,
      efConstruction: 64,
    },
  };

  // Enable working memory with Zod schema
  if (WORKING_MEMORY_ENABLED) {
    memoryOptions.workingMemory = {
      enabled: true,
      schema: GearshackUserProfileSchema,
    };
  }

  // Enable Observational Memory for long-context compression
  // Ideal for tool-heavy conversations (SQL, Catalog, GearGraph results)
  if (OM_ENABLED) {
    memoryOptions.observationalMemory = {
      scope: 'thread', // thread-scoped to avoid slow migration of existing conversations
      model: OM_MODEL, // google/gemini-2.5-flash by default (1M token context)
      observation: {
        // Trigger Observer when messages exceed this token count
        // Lower threshold (20k vs 30k default) because our tools generate many tokens
        messageTokens: OM_MESSAGE_TOKENS,
      },
      reflection: {
        // Trigger Reflector when observations exceed this token count
        observationTokens: OM_OBSERVATION_TOKENS,
      },
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
// Agent Creation
// =============================================================================

/**
 * Create Mastra Agent with three-tier memory and tools
 *
 * IMPORTANT: Creates a NEW memory instance for each agent to avoid
 * cross-user data leakage in serverless/multi-user environments.
 *
 * @param userId - Current user ID for runtimeContext
 * @param systemPrompt - Dynamic system prompt (includes working memory context)
 */
export function createGearAgent(userId: string, systemPrompt: string) {
  // BUGFIX: Create a new memory instance for each agent to prevent
  // shared state between users in serverless environments
  const agentMemory = createAgentMemory();

  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',
    instructions: systemPrompt,
    model: getGateway()(AI_CHAT_MODEL),
    memory: agentMemory,
    tools: {
      // Composite Domain Tools (Feature 060: preferred for most queries)
      analyzeLoadout: analyzeLoadoutTool,
      inventoryInsights: inventoryInsightsTool,
      searchGearKnowledge: searchGearKnowledgeTool,
      // Legacy tools (fallback for edge cases + GearGraph Cypher)
      queryUserData: queryUserDataSqlTool,
      queryGearGraph: queryGearGraphTool,
      searchWeb: searchWebTool,
      // Working memory persistence (fix: agent can now actually write the profile)
      updateWorkingMemory: updateWorkingMemoryTool,
    },
  });

  console.log(
    `[Mastra Agent] Created for user ${userId} with ${AI_CHAT_MODEL}, 7 tools (3 composite + 3 legacy + updateWorkingMemory), four-tier memory (OM: ${OM_ENABLED ? 'enabled' : 'disabled'})`
  );
  return agent;
}

// =============================================================================
// Streaming Interface
// =============================================================================

/**
 * Stream response from Mastra Agent
 * Compatible interface with our current streaming setup
 *
 * @param agent - Mastra Agent instance
 * @param message - Current user message
 * @param userId - User ID for tool execution context
 * @param conversationHistory - Previous messages for context continuity
 * @param currentLoadoutId - Current loadout ID for loadout-specific queries
 */
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  conversationHistory?: Array<{ role: string; content: string }>,
  currentLoadoutId?: string
) {
  // Set request context for tool execution (renamed from runtimeContext in Mastra v1.0+)
  const requestContext = new Map<string, unknown>();
  requestContext.set('userId', userId);

  // Add currentLoadoutId to context for loadout-aware tools
  if (currentLoadoutId) {
    requestContext.set('currentLoadoutId', currentLoadoutId);
  }

  // Build messages array with conversation history for context continuity.
  // Include last 20 messages (10 turns) to maintain recent context without
  // overloading the context window.
  const MAX_HISTORY_MESSAGES = 20;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const messages: any[] = [];

  if (conversationHistory && conversationHistory.length > 0) {
    const recentHistory = conversationHistory.slice(-MAX_HISTORY_MESSAGES);
    for (const msg of recentHistory) {
      if (msg.role === 'user') {
        messages.push({ role: 'user' as const, content: msg.content });
      } else if (msg.role === 'assistant') {
        messages.push({ role: 'assistant' as const, content: msg.content });
      }
    }
  }

  // Add the current message
  messages.push({ role: 'user' as const, content: message });

  // Stream with full message history for context continuity
  const stream = await agent.stream(messages, {
    resourceId: userId,
    threadId: conversationId,
    requestContext: requestContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return {
    textStream: stream.textStream,
    toolCalls: stream.toolCalls || Promise.resolve([]),
    fullText: stream.text || Promise.resolve(''),
    finishReason: stream.finishReason || Promise.resolve('stop'),
  };
}
