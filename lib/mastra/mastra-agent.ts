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
// Mastra Voice adapter (ElevenLabs via Mastra's abstraction layer)
import {
  GearshackElevenLabsVoice,
  type GearshackVoiceConfig,
} from './voice/mastra-voice-adapter';

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
 * Create Mastra Agent with three-tier memory, tools, and voice
 *
 * IMPORTANT: Creates a NEW memory instance for each agent to avoid
 * cross-user data leakage in serverless/multi-user environments.
 *
 * Voice integration via Mastra's MastraVoice abstraction enables
 * provider-independent TTS/STT. Use agent.getVoice() to access
 * speak(), listen(), and getSpeakers() methods.
 *
 * @param userId - Current user ID for runtimeContext
 * @param systemPrompt - Dynamic system prompt (includes working memory context)
 * @param voiceConfig - Optional voice configuration (language, voice, model)
 */
export function createGearAgent(
  userId: string,
  systemPrompt: string,
  voiceConfig?: GearshackVoiceConfig
) {
  // BUGFIX: Create a new memory instance for each agent to prevent
  // shared state between users in serverless environments
  const agentMemory = createAgentMemory();

  // Mastra Voice pipeline: ElevenLabs via MastraVoice abstraction
  // Enables provider switching without changing API routes
  const voice = new GearshackElevenLabsVoice({
    defaultVoice: voiceConfig?.defaultVoice ?? 'rachel',
    defaultModel: voiceConfig?.defaultModel ?? 'eleven_turbo_v2_5',
    language: voiceConfig?.language ?? 'auto',
    stability: voiceConfig?.stability,
    similarityBoost: voiceConfig?.similarityBoost,
  });

  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',
    instructions: systemPrompt,
    model: getGateway()(AI_CHAT_MODEL),
    memory: agentMemory,
    voice,
    tools: {
      // Composite Domain Tools (Feature 060: preferred for most queries)
      analyzeLoadout: analyzeLoadoutTool,
      inventoryInsights: inventoryInsightsTool,
      searchGearKnowledge: searchGearKnowledgeTool,
      // Action tools
      addToLoadout: addToLoadoutTool,
      // GearGraph MCP Tools: catalog search + alternatives via GearGraph graph relationships
      // These call the GearGraph MCP server (NEXT_PUBLIC_GEARGRAPH_API_URL/sse)
      // findAlternatives uses graph edges (LIGHTER_THAN, SIMILAR_TO, etc.) — NOT replaceable with SQL
      searchGear: searchGearTool,
      findAlternatives: findAlternativesTool,
      // Legacy tools (fallback for edge cases + direct Cypher)
      queryUserData: queryUserDataSqlTool,
      queryGearGraph: queryGearGraphTool,
      searchWeb: searchWebTool,
    },
  });

  console.log(
    `[Mastra Agent] Created for user ${userId} with ${AI_CHAT_MODEL}, 9 tools, three-tier memory, voice: ElevenLabs/${voiceConfig?.defaultVoice ?? 'rachel'}`
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
 * @param conversationId - Conversation/thread ID for Mastra memory persistence
 * @param currentLoadoutId - Current loadout ID for loadout-specific queries
 */
export async function streamMastraResponse(
  agent: Agent,
  message: string,
  userId: string,
  conversationId: string,
  currentLoadoutId?: string
) {
  // Set request context for tool execution (renamed from runtimeContext in Mastra v1.0+)
  const requestContext = new Map<string, unknown>();
  requestContext.set('userId', userId);

  // Add currentLoadoutId to context for loadout-aware tools
  if (currentLoadoutId) {
    requestContext.set('currentLoadoutId', currentLoadoutId);
  }

  // NEU: Nur die aktuelle Message - Mastra holt History via threadId
  const messages = [{ role: 'user' as const, content: message }];

  // Stream with threadId so Mastra's PostgresStore injects conversation history
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
