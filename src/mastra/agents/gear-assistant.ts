/**
 * Gear Assistant Agent for Mastra Studio
 *
 * This module exports a dev-mode Gear Assistant agent that can be registered
 * in the central Mastra instance. Unlike the production `createGearAgent()`
 * which creates a per-request agent with dynamic user context, this provides
 * a static agent suitable for Mastra Studio's Tool Playground, Agent Chat,
 * and Tracing UI.
 *
 * Production API routes continue to use `createGearAgent()` from
 * `lib/mastra/mastra-agent.ts` for per-user, per-request isolation.
 *
 * @see lib/mastra/mastra-agent.ts - Production agent factory
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { createGateway } from '@ai-sdk/gateway';

// Tools
import { analyzeLoadoutTool } from '@/lib/mastra/tools/analyze-loadout';
import { inventoryInsightsTool } from '@/lib/mastra/tools/inventory-insights';
import { searchGearKnowledgeTool } from '@/lib/mastra/tools/search-gear-knowledge';
import { addToLoadoutTool } from '@/lib/mastra/tools/add-to-loadout';
import { searchGearTool, findAlternativesTool } from '@/lib/mastra/tools/mcp-graph';
import { queryUserDataSqlTool } from '@/lib/mastra/tools/query-user-data-sql';
import { queryGearGraphTool } from '@/lib/mastra/tools/query-geargraph-v2';
import { searchWebTool } from '@/lib/mastra/tools/search-web';

// Working memory schema
import { GearshackUserProfileSchema } from '@/lib/mastra/schemas/working-memory';

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';
const DATABASE_URL = process.env.DATABASE_URL;

// Lazy singleton — avoids creating a new gateway instance on each call and
// defers key validation until first use (matches production pattern in mastra-agent.ts).
let _gateway: ReturnType<typeof createGateway> | null = null;

function getGateway() {
  if (!_gateway) {
    const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!AI_GATEWAY_KEY) {
      throw new Error(
        '[Mastra Studio] AI_GATEWAY_API_KEY or AI_GATEWAY_KEY is required. ' +
        'Copy from .env.example and set in .env.local.'
      );
    }
    _gateway = createGateway({ apiKey: AI_GATEWAY_KEY });
  }
  return _gateway;
}

// ---------------------------------------------------------------------------
// Memory (shared across Studio sessions — safe since Studio is single-user)
// ---------------------------------------------------------------------------

function createStudioMemory(): Memory | undefined {
  if (!DATABASE_URL) {
    console.warn(
      '[Mastra Studio] DATABASE_URL not set — running without memory. ' +
      'Set it in .env.local for full three-tier memory support.'
    );
    return undefined;
  }

  const store = new PostgresStore({
    id: 'gearshack-studio-storage',
    connectionString: DATABASE_URL,
  });

  const vector = new PgVector({
    id: 'gearshack-studio-vector',
    connectionString: DATABASE_URL,
  });

  return new Memory({
    storage: store,
    vector,
    embedder: getGateway().textEmbeddingModel('openai/text-embedding-3-small'),
    options: {
      lastMessages: 20,
      semanticRecall: {
        topK: 5,
        messageRange: 2,
        threshold: 0.7,
      },
      workingMemory: {
        enabled: true,
        schema: GearshackUserProfileSchema,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Studio System Prompt
// ---------------------------------------------------------------------------

const STUDIO_SYSTEM_PROMPT = `You are the Gearshack Gear Assistant — a personal outdoor equipment expert.
You help users manage their gear, optimize pack weight, and make informed decisions about outdoor equipment.

This is a Mastra Studio development session. You have access to the full toolset:

**Composite Domain Tools (preferred):**
- analyzeLoadout — Complete loadout analysis (weight breakdown, missing essentials, optimization suggestions)
- inventoryInsights — Inventory stats and analysis (counts, heaviest items, brand breakdown)
- searchGearKnowledge — Unified search across user inventory AND product catalog

**Action Tools:**
- addToLoadout — Add gear items to loadouts

**GearGraph MCP Tools:**
- searchGear — Search catalog with filters (category, brand, maxWeight, maxPrice, minRating)
- findAlternatives — Find lighter/cheaper/similar alternatives via graph relationships

**Legacy / Fallback:**
- queryUserData — Direct SQL queries for complex user data queries
- queryGearGraph — Cypher queries to explore GearGraph product relationships
- searchWeb — Real-time web search for trail conditions, gear reviews, current info

**Guidelines:**
- Use metric units (kg, g) for weight
- Be enthusiastic and opinionated — you're a passionate gear nerd
- Give live play-by-play updates as you work
- Reference user data when available
- If a tool call fails, explain it and suggest alternatives

Respond in English by default. If the user writes in German, switch to German.`;

// ---------------------------------------------------------------------------
// Agent Export
// ---------------------------------------------------------------------------

/**
 * Gear Assistant agent for Mastra Studio.
 *
 * Registered in `src/mastra/index.ts` so that `npx mastra dev` exposes it
 * in the Studio UI (Agent Chat, Tool Playground, Tracing).
 *
 * Required .env.local variables for full tool access:
 *   MASTRA_DEV_USER_ID=<your-supabase-user-uuid>
 *     Without this, all user-scoped tools (analyzeLoadout, inventoryInsights,
 *     addToLoadout, queryUserData) will return "User not authenticated".
 *     Set it to your own Supabase auth UUID for local development.
 *     ⚠️  Never set this in production — only .env.local.
 */
export const gearAssistant = new Agent({
  id: 'gear-assistant',
  name: 'Gear Assistant',
  instructions: STUDIO_SYSTEM_PROMPT,
  model: getGateway()(AI_CHAT_MODEL),
  memory: createStudioMemory(),
  tools: {
    // Composite Domain Tools (Feature 060)
    analyzeLoadout: analyzeLoadoutTool,
    inventoryInsights: inventoryInsightsTool,
    searchGearKnowledge: searchGearKnowledgeTool,
    // Action tools
    addToLoadout: addToLoadoutTool,
    // GearGraph MCP Tools
    searchGear: searchGearTool,
    findAlternatives: findAlternativesTool,
    // Legacy tools (fallback)
    queryUserData: queryUserDataSqlTool,
    queryGearGraph: queryGearGraphTool,
    searchWeb: searchWebTool,
  },
});
