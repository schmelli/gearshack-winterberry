/**
 * Mastra Agent with Three-Tier Memory System
 * Feature: 002-mastra-memory-system
 *
 * Uses Mastra's Agent class with:
 * 1. Working Memory: Structured user profile (Zod schema) - resource-scoped
 * 2. Conversation History: Last N messages - thread-scoped
 * 3. Semantic Recall: Vector similarity search - resource-scoped
 *
 * Storage: Supabase PostgreSQL with pgvector via @mastra/pg
 *
 * @see https://mastra.ai/docs/memory/overview
 * @see https://mastra.ai/docs/memory/semantic-recall
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { createGateway } from '@ai-sdk/gateway';
// Simplified tools (AI Assistant Simplification feature)
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryCatalogTool } from './tools/query-catalog';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';
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
      queryUserData: queryUserDataSqlTool,
      queryCatalog: queryCatalogTool,
      queryGearGraph: queryGearGraphTool,
      searchWeb: searchWebTool,
    },
  });

  console.log(
    `[Mastra Agent] Created for user ${userId} with ${AI_CHAT_MODEL}, 4 tools, three-tier memory`
  );
  return agent;
}

// =============================================================================
// Streaming Interface
// =============================================================================

/**
 * Stream response from Mastra Agent
 * Compatible interface with our current streaming setup
 */
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string
) {
  // Set runtime context for tool execution
  const runtimeContext = new Map<string, unknown>();
  runtimeContext.set('userId', userId);

  // Generate streaming response
  const stream = await agent.stream(message, {
    resourceId: userId,
    runtimeContext: runtimeContext,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);

  return {
    textStream: stream.textStream,
    toolCalls: stream.toolCalls || Promise.resolve([]),
    fullText: stream.text || Promise.resolve(''),
    finishReason: stream.finishReason || Promise.resolve('stop'),
  };
}
