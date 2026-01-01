/**
 * Mastra Agent with Native Tool Support
 *
 * Uses Mastra's Agent class for proper tool integration.
 * This eliminates manual schema conversion issues.
 */

import { Agent } from '@mastra/core/agent';
import { createGateway } from '@ai-sdk/gateway';
import { queryUserDataTool } from './tools/query-user-data';
import { searchCatalogTool } from './tools/search-catalog';
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
      // Register Mastra tools directly - no conversion needed!
      queryUserData: queryUserDataTool,
      searchCatalog: searchCatalogTool,
      searchWeb: searchWebTool,
    },
  });

  console.log(`[Mastra Agent] Created with ${AI_CHAT_MODEL} via AI Gateway and 3 tools`);
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
  const runtimeContext = new Map<string, any>();
  runtimeContext.set('userId', userId);

  // Generate streaming response
  const stream = await agent.stream(message, {
    resourceid: userId,
    runtimeContext, // Pass runtimeContext so tools can access userId
  });

  return {
    textStream: stream.textStream,
    toolCalls: stream.toolCalls || Promise.resolve([]),
    fullText: stream.text || Promise.resolve(''),
    finishReason: stream.finishReason || Promise.resolve('stop'),
  };
}
