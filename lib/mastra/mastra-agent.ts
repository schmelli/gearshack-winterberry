/**
 * Mastra Agent with Native Tool Support
 *
 * Uses Mastra's Agent class for proper tool integration.
 * This eliminates manual schema conversion issues.
 */

import { Agent } from '@mastra/core/agent';
import { createGateway } from '@ai-sdk/gateway';
// Simplified tools (AI Assistant Simplification feature)
import { queryUserDataSqlTool } from './tools/query-user-data-sql';
import { queryCatalogTool } from './tools/query-catalog';
import { queryGearGraphTool } from './tools/query-geargraph-v2';
import { searchWebTool } from './tools/search-web';

// Environment configuration
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_KEY || process.env.AI_GATEWAY_API_KEY;
const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';

if (!AI_GATEWAY_KEY) {
  console.warn('⚠️ AI_GATEWAY_KEY not configured - Mastra Agent will fail');
}

// Create AI Gateway provider
const gateway = createGateway({
  apiKey: AI_GATEWAY_KEY!,
});

/**
 * Create Mastra Agent with registered tools
 *
 * @param userId - Current user ID for runtimeContext
 * @param systemPrompt - Dynamic system prompt based on context
 */
export function createGearAgent(userId: string, systemPrompt: string) {
  const agent = new Agent({
    name: 'Gear Assistant',
    instructions: systemPrompt,
    model: gateway(AI_CHAT_MODEL), // Use Vercel AI Gateway
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

  console.log(`[Mastra Agent] Created with ${AI_CHAT_MODEL} via AI Gateway and 4 tools`);
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
