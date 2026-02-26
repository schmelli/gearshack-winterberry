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
 * ⚠️  DEVELOPMENT ONLY: Never point DATABASE_URL at a production database
 *     when running Studio. Tools that accept direct SQL/Cypher queries have
 *     no user-session auth layer beyond the MASTRA_STUDIO_USER_ID stub.
 *
 * @see lib/mastra/mastra-agent.ts - Production agent factory
 */

import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { PostgresStore, PgVector } from '@mastra/pg';
import { createGateway } from '@ai-sdk/gateway';

// Tools — @/* alias per CLAUDE.md convention
import { analyzeLoadoutTool } from '@/lib/mastra/tools/analyze-loadout';
import { inventoryInsightsTool } from '@/lib/mastra/tools/inventory-insights';
import { searchGearKnowledgeTool } from '@/lib/mastra/tools/search-gear-knowledge';
import { addToLoadoutTool } from '@/lib/mastra/tools/add-to-loadout';
import { searchGearTool, findAlternativesTool } from '@/lib/mastra/tools/mcp-graph';
import { reviewExpensiveRecommendationTool } from '@/lib/mastra/tools/review-recommendation';
import { queryUserDataSqlTool } from '@/lib/mastra/tools/query-user-data-sql';
import { queryGearGraphTool } from '@/lib/mastra/tools/query-geargraph-v2';
import { searchWebTool } from '@/lib/mastra/tools/search-web';

// Working memory schema
import { GearshackUserProfileSchema } from '@/lib/mastra/schemas/working-memory';

// ---------------------------------------------------------------------------
// Environment (read once at module load — safe, no side effects)
// ---------------------------------------------------------------------------

const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';
const DATABASE_URL = process.env.DATABASE_URL;

/**
 * Stub user ID for Studio tool execution.
 * Set MASTRA_STUDIO_USER_ID to your Supabase user ID in .env.local to enable
 * user-scoped tools (analyzeLoadout, inventoryInsights, addToLoadout, etc.).
 */
const STUDIO_USER_ID = process.env.MASTRA_STUDIO_USER_ID ?? '';

// ---------------------------------------------------------------------------
// Gateway — lazy singleton (matches production pattern in lib/mastra/mastra-agent.ts)
// Deferred to first call to avoid throwing at import time if key is missing.
// ---------------------------------------------------------------------------

let gatewayInstance: ReturnType<typeof createGateway> | null = null;

function getGateway() {
  if (!gatewayInstance) {
    const key = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!key) {
      throw new Error(
        '[Mastra Studio] AI_GATEWAY_API_KEY or AI_GATEWAY_KEY is required. ' +
          'Copy from .env.example and set in .env.local.',
      );
    }
    gatewayInstance = createGateway({ apiKey: key });
  }
  return gatewayInstance;
}

// ---------------------------------------------------------------------------
// Storage — lazy singletons (avoid opening DB connections at import time)
// ---------------------------------------------------------------------------

let pgStoreInstance: PostgresStore | null = null;
let pgVectorInstance: PgVector | null = null;

function getStudioPgStore(): PostgresStore {
  if (!pgStoreInstance) {
    pgStoreInstance = new PostgresStore({
      id: 'gearshack-studio-storage',
      connectionString: DATABASE_URL!,
    });
  }
  return pgStoreInstance;
}

function getStudioPgVector(): PgVector {
  if (!pgVectorInstance) {
    pgVectorInstance = new PgVector({
      id: 'gearshack-studio-vector',
      connectionString: DATABASE_URL!,
    });
  }
  return pgVectorInstance;
}

// ---------------------------------------------------------------------------
// Memory (shared across Studio sessions — safe since Studio is single-user)
// ---------------------------------------------------------------------------

function createStudioMemory(): Memory | undefined {
  if (!DATABASE_URL) {
    console.warn(
      '[Mastra Studio] DATABASE_URL not set — running without persistent memory. ' +
        'Set it in .env.local for full three-tier memory support.',
    );
    return undefined;
  }

  // Attempt to build a full three-tier Memory (storage + vector + working memory).
  // If the AI gateway key is missing, fall back to storage + working memory only
  // so that Studio still runs when DATABASE_URL is set but the gateway is not
  // configured (e.g. a developer working against a local Postgres instance).
  let embedder: ReturnType<ReturnType<typeof createGateway>['textEmbeddingModel']> | undefined;
  try {
    embedder = getGateway().textEmbeddingModel(
      process.env.AI_EMBEDDING_MODEL || 'openai/text-embedding-3-small',
    );
  } catch {
    console.warn(
      '[Mastra Studio] AI_GATEWAY_API_KEY not set — semantic recall disabled. ' +
        'Set it in .env.local for full three-tier memory support.',
    );
  }

  return new Memory({
    storage: getStudioPgStore(),
    ...(embedder ? { vector: getStudioPgVector(), embedder } : {}),
    options: {
      lastMessages: 20,
      ...(embedder
        ? {
            semanticRecall: {
              topK: 5,
              messageRange: 2,
              threshold: 0.7,
            },
          }
        : {}),
      workingMemory: {
        enabled: true,
        schema: GearshackUserProfileSchema,
      },
    },
  });
}

// ---------------------------------------------------------------------------
// Tool context wrapper
//
// Most user-scoped tools (analyzeLoadout, inventoryInsights, etc.) read
// userId from requestContext. In production this comes from the authenticated
// request. In Studio there is no session, so we inject MASTRA_STUDIO_USER_ID
// as a fallback so the tools are usable in Agent Chat and Tool Playground.
// ---------------------------------------------------------------------------

type ExecutableTool = { execute?: (args: unknown, context: unknown) => Promise<unknown> };

/**
 * Wraps a tool's execute function to inject STUDIO_USER_ID into the requestContext
 * when it is not already set, enabling user-scoped tools to work in Studio.
 *
 * The object spread `{ ...tool }` is safe here because all Mastra tools produced
 * by `createTool()` are plain objects — their methods live as own enumerable
 * properties, not on a prototype chain. Class-based tools are not used in this
 * codebase, so no prototype methods are at risk of being silently dropped.
 */
function withStudioContext<T extends ExecutableTool>(tool: T): T {
  if (!tool.execute || !STUDIO_USER_ID) return tool;

  const original = tool.execute.bind(tool);
  return {
    ...tool,
    execute: async (args: unknown, context: unknown) => {
      const ctx = context as Record<string, unknown>;
      const existing = ctx?.requestContext as Map<string, unknown> | undefined;
      // Only inject if userId not already provided by the caller
      if (existing?.has('userId')) return original(args, context);

      const requestContext = new Map<string, unknown>(existing);
      requestContext.set('userId', STUDIO_USER_ID);
      return original(args, { ...ctx, requestContext });
    },
  } as T;
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

**Critic Agent:**
- reviewExpensiveRecommendation — Budget-conscious review for gear >€300. Call AFTER identifying a recommendation, BEFORE presenting it. Returns verdict: proceed / reconsider / check_used_market.

**Legacy / Fallback:**
- queryUserData — Direct SQL queries for complex user data queries
- queryGearGraph — Cypher queries to explore GearGraph product relationships
- searchWeb — Real-time web search for trail conditions, gear reviews, current info

**Studio Note — User-Scoped Tools:**
User-scoped tools (analyzeLoadout, inventoryInsights, searchGearKnowledge, addToLoadout, queryUserData)
require a userId. In Studio this is provided via the MASTRA_STUDIO_USER_ID environment variable.
If tools return auth errors, set MASTRA_STUDIO_USER_ID=<your-supabase-user-id> in .env.local.

**Guidelines:**
- Use metric units (kg, g) for weight
- Be enthusiastic and opinionated — you're a passionate gear nerd
- Give live play-by-play updates as you work
- Reference user data when available
- If a tool call fails, explain it and suggest alternatives

Respond in English by default. If the user writes in German, switch to German.`;

// ---------------------------------------------------------------------------
// Agent Export — lazy singleton
//
// Agent initialization is deferred to the first call of getGearAssistant() to
// avoid module-level side effects. This prevents import-time throws when env
// vars are not set (e.g., during Next.js build or unrelated test imports).
// ---------------------------------------------------------------------------

let gearAssistantInstance: Agent | null = null;

/**
 * Returns the Gear Assistant agent for Mastra Studio.
 *
 * Registered in `src/mastra/index.ts` so that `npx mastra dev` exposes it
 * in the Studio UI (Agent Chat, Tool Playground, Tracing).
 *
 * Uses a distinct id ('gear-assistant-studio') from the production agent
 * ('gear-assistant') for clearer tracing and log attribution.
 *
 * inputProcessors (ToolCallFilter + TokenLimiter) are intentionally omitted:
 * - Studio traces benefit from seeing full tool outputs without filtering
 * - Sessions are short-lived, so context window exhaustion is not a concern
 * - Production agents in lib/mastra/mastra-agent.ts still apply both processors
 */
export function getGearAssistant(): Agent {
  if (!gearAssistantInstance) {
    gearAssistantInstance = new Agent({
      id: 'gear-assistant-studio',
      name: 'Gear Assistant (Studio)',
      instructions: STUDIO_SYSTEM_PROMPT,
      model: getGateway()(AI_CHAT_MODEL),
      memory: createStudioMemory(),
      tools: {
        // Composite Domain Tools (Feature 060)
        analyzeLoadout: withStudioContext(analyzeLoadoutTool),
        inventoryInsights: withStudioContext(inventoryInsightsTool),
        searchGearKnowledge: withStudioContext(searchGearKnowledgeTool),
        // Action tools
        addToLoadout: withStudioContext(addToLoadoutTool),
        // GearGraph MCP Tools — catalog-only, no userId required
        searchGear: searchGearTool,
        findAlternatives: findAlternativesTool,
        // Critic Agent — budget review for expensive recommendations (>€300)
        reviewExpensiveRecommendation: reviewExpensiveRecommendationTool,
        // Legacy tools (fallback)
        // ⚠️ Dev only: queryUserData and queryGearGraph have direct DB access.
        //    Never point DATABASE_URL at a production database while using Studio.
        queryUserData: withStudioContext(queryUserDataSqlTool),
        queryGearGraph: queryGearGraphTool,
        searchWeb: searchWebTool,
      },
    });
  }
  return gearAssistantInstance;
}
