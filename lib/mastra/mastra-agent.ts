/**
 * Mastra Agent with Native Tool Support and Memory
 *
 * Uses Mastra's Agent class for proper tool integration with Memory
 * for conversation context persistence. The agent now "learns" from
 * previous messages in the conversation.
 *
 * @see https://mastra.ai/docs/memory/overview
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { createGateway } from '@ai-sdk/gateway';
// Simplified tools (AI Assistant Simplification feature)
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryCatalogTool } from './tools/query-catalog';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';
// Mastra storage for memory persistence
import { mastraStorage } from './instance';

// Environment configuration
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';

// Memory configuration
const parsedMessages = parseInt(process.env.MASTRA_MEMORY_LAST_MESSAGES || '20', 10);
const MEMORY_LAST_MESSAGES = Number.isFinite(parsedMessages) && parsedMessages > 0 ? parsedMessages : 20;

// FIXED: Throw error instead of warning + non-null assertion
// This prevents runtime crashes with a clear error message
if (!AI_GATEWAY_KEY) {
  throw new Error(
    'AI_GATEWAY_KEY is required for Mastra Agent. ' +
    'Please set AI_GATEWAY_API_KEY or AI_GATEWAY_KEY in your environment.'
  );
}

// Create AI Gateway provider
const gateway = createGateway({
  apiKey: AI_GATEWAY_KEY,
});

/**
 * Shared Memory instance for conversation context
 *
 * Configuration:
 * - lastMessages: Number of recent messages the agent can "see" (default: 20)
 * - Uses LibSQLStore for persistent storage
 *
 * This enables the agent to:
 * - Remember previous questions in the conversation
 * - Maintain context across multiple exchanges
 * - Provide more coherent, accurate replies
 */
const agentMemory = new Memory({
  storage: mastraStorage,
  options: {
    lastMessages: MEMORY_LAST_MESSAGES,
  },
});

console.log(`[Mastra Memory] Configured with lastMessages: ${MEMORY_LAST_MESSAGES}`);

/**
 * Create Mastra Agent with registered tools and memory
 *
 * The agent now has memory enabled, allowing it to:
 * - See the last N messages from the conversation
 * - Maintain context across multiple exchanges
 * - Learn from previous interactions in the session
 *
 * @param userId - Current user ID for runtimeContext
 * @param systemPrompt - Dynamic system prompt based on context
 */
export function createGearAgent(userId: string, systemPrompt: string) {
  const agent = new Agent({
    id: 'gear-assistant',
    name: 'Gear Assistant',
    instructions: systemPrompt,
    model: gateway(AI_CHAT_MODEL), // Use Vercel AI Gateway
    memory: agentMemory, // Enable conversation memory
    tools: {
      // Simplified tools with free query formulation
      // - queryUserData: SQL-like queries for user tables (gear_items, loadouts, etc.)
      // - queryCatalog: SQL-like queries for public catalog (catalog_products, categories)
      // - queryGearGraph: Cypher queries for product relationships
      // - searchWeb: Web search for current info (kept as-is)
      queryUserData: queryUserDataSqlTool,
      queryCatalog: queryCatalogTool,
      queryGearGraph: queryGearGraphTool,
      searchWeb: searchWebTool,
    },
  });

  console.log(`[Mastra Agent] Created with ${AI_CHAT_MODEL} via AI Gateway, 4 tools, and memory (last ${MEMORY_LAST_MESSAGES} messages)`);
  return agent;
}

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
  // RuntimeContext uses Map<string, unknown> for type safety
  const runtimeContext = new Map<string, unknown>();
  runtimeContext.set('userId', userId);

  // Generate streaming response
  // Type assertion for runtimeContext: Mastra expects specific internal type
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
