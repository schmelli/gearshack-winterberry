/**
 * Gear Assistant Workflow
 *
 * Mastra Workflow that orchestrates the "Classify → Prefetch → Build Context"
 * pipeline using real Step primitives. Replaces the ad-hoc orchestration that
 * was previously inlined in /api/mastra/chat/route.ts.
 *
 * Benefits:
 * - Automatic OTel tracing per step (visible in Mastra Studio)
 * - Typed input/output schemas with Zod validation
 * - Structured error handling with per-step retries
 * - Workflow Visualizer in Mastra Studio
 * - Suspend/Resume capability for future Human-in-the-Loop flows
 *
 * @see https://mastra.ai/docs/workflows/overview
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  classifyIntent,
  type DataRequirement,
} from '../intent-router';
import { prefetchData, type PrefetchedContext } from '../parallel-prefetch';
import { buildMastraSystemPrompt, type PromptContext } from '../config';
import {
  getCachedLoadoutContext,
  preloadLoadoutContext,
  formatLoadoutContextForPrompt,
  type LoadoutContext,
} from '../context-preloader';
import {
  parseQuery,
  formatParsedQueryForPrompt,
} from '@/lib/ai-assistant/query-parser';
import { generateFastAnswer } from '../intent-router';
import { logDebug, logInfo } from '../logging';
import type { UserContext } from '@/types/ai-assistant';

// =============================================================================
// Schema Definitions
// =============================================================================

/** Workflow input: everything the route handler provides */
const WorkflowInputSchema = z.object({
  message: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  locale: z.string().default('en'),
  screen: z.string().default('inventory'),
  inventoryCount: z.number().default(0),
  currentLoadoutId: z.string().optional(),
  enableTools: z.boolean().default(true),
});

/** Step 1 output: intent classification result */
const ClassifyIntentOutputSchema = z.object({
  intent: z.string(),
  confidence: z.number(),
  canAnswerDirectly: z.boolean(),
  dataRequirements: z.array(z.object({
    type: z.string(),
    params: z.record(z.string(), z.unknown()).optional(),
  })),
  extractedEntities: z.record(z.string(), z.unknown()),
  /** Pass-through fields from input for downstream steps */
  message: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  locale: z.string(),
  screen: z.string(),
  inventoryCount: z.number(),
  currentLoadoutId: z.string().optional(),
  enableTools: z.boolean(),
});

/** Step 2 output: prefetched data context */
const PrefetchDataOutputSchema = z.object({
  intent: z.string(),
  confidence: z.number(),
  canAnswerDirectly: z.boolean(),
  extractedEntities: z.record(z.string(), z.unknown()),
  /** Prefetch results */
  prefetchedResults: z.record(z.string(), z.unknown()),
  prefetchComplete: z.boolean(),
  prefetchLatencyMs: z.number(),
  formattedContext: z.string(),
  /** Pass-through fields */
  message: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  locale: z.string(),
  screen: z.string(),
  inventoryCount: z.number(),
  currentLoadoutId: z.string().optional(),
  enableTools: z.boolean(),
});

/** Step 3 output: assembled context ready for agent */
const BuildContextOutputSchema = z.object({
  /** Enriched system prompt with prefetched data */
  enrichedSystemPrompt: z.string(),
  /** Fast-path answer if available (skips agent call) */
  fastAnswer: z.string().nullable(),
  /** Intent metadata for metrics */
  intent: z.string(),
  confidence: z.number(),
  /** Pass-through fields for agent streaming */
  message: z.string(),
  userId: z.string(),
  conversationId: z.string(),
  currentLoadoutId: z.string().optional(),
  enableTools: z.boolean(),
  locale: z.string(),
});

// =============================================================================
// Step 1: Classify Intent
// =============================================================================

/**
 * Uses Gemini 2.5 Flash via AI Gateway to classify user intent in <500ms.
 * Determines what data needs to be pre-fetched and whether a fast-path
 * answer is possible.
 */
const classifyIntentStep = createStep({
  id: 'classifyIntent',
  description: 'Classify user intent using Gemini Flash for fast routing',
  inputSchema: WorkflowInputSchema,
  outputSchema: ClassifyIntentOutputSchema,
  execute: async ({ inputData }) => {
    const {
      message,
      screen,
      currentLoadoutId,
      userId,
      conversationId,
      locale,
      inventoryCount,
      enableTools,
    } = inputData;

    const intentResult = await classifyIntent(message, screen, currentLoadoutId);

    logDebug('Workflow step: classifyIntent completed', {
      userId,
      metadata: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        dataRequirements: intentResult.dataRequirements.length,
      },
    });

    return {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      canAnswerDirectly: intentResult.canAnswerDirectly,
      dataRequirements: intentResult.dataRequirements.map((req: DataRequirement) => ({
        type: req.type,
        params: req.params,
      })),
      extractedEntities: intentResult.extractedEntities as Record<string, unknown>,
      // Pass-through
      message,
      userId,
      conversationId,
      locale,
      screen,
      inventoryCount,
      currentLoadoutId,
      enableTools,
    };
  },
});

// =============================================================================
// Step 2: Prefetch Data
// =============================================================================

/**
 * Executes all data requirements from the Intent Router in parallel.
 * Returns a pre-fetched context object that can be injected into the
 * LLM prompt for zero-tool-call responses.
 */
const prefetchDataStep = createStep({
  id: 'prefetchData',
  description: 'Parallel pre-fetch data based on intent classification',
  inputSchema: ClassifyIntentOutputSchema,
  outputSchema: PrefetchDataOutputSchema,
  execute: async ({ inputData }) => {
    const {
      intent,
      confidence,
      canAnswerDirectly,
      dataRequirements,
      extractedEntities,
      message,
      userId,
      conversationId,
      locale,
      screen,
      inventoryCount,
      currentLoadoutId,
      enableTools,
    } = inputData;

    // Convert back to typed requirements
    const typedRequirements: DataRequirement[] = dataRequirements.map(
      (req: { type: string; params?: Record<string, unknown> }) => ({
        type: req.type as DataRequirement['type'],
        params: req.params,
      }),
    );

    let prefetchedContext: PrefetchedContext | null = null;

    if (typedRequirements.length > 0) {
      prefetchedContext = await prefetchData(typedRequirements, userId, locale);

      logDebug('Workflow step: prefetchData completed', {
        userId,
        metadata: {
          intent,
          requirementCount: typedRequirements.length,
          totalLatencyMs: prefetchedContext.totalLatencyMs,
          complete: prefetchedContext.complete,
        },
      });
    }

    return {
      intent,
      confidence,
      canAnswerDirectly,
      extractedEntities,
      prefetchedResults: prefetchedContext?.results ?? {},
      prefetchComplete: prefetchedContext?.complete ?? true,
      prefetchLatencyMs: prefetchedContext?.totalLatencyMs ?? 0,
      formattedContext: prefetchedContext?.formattedContext ?? '',
      // Pass-through
      message,
      userId,
      conversationId,
      locale,
      screen,
      inventoryCount,
      currentLoadoutId,
      enableTools,
    };
  },
});

// =============================================================================
// Step 3: Build Context
// =============================================================================

/**
 * Assembles the enriched system prompt from prefetched data, loadout context,
 * and parsed query constraints. Also attempts a fast-path answer for simple
 * factual questions using Gemini Flash.
 */
const buildContextStep = createStep({
  id: 'buildContext',
  description: 'Build enriched system prompt and attempt fast-path answer',
  inputSchema: PrefetchDataOutputSchema,
  outputSchema: BuildContextOutputSchema,
  execute: async ({ inputData }) => {
    const {
      intent,
      confidence,
      canAnswerDirectly,
      prefetchedResults,
      formattedContext,
      message,
      userId,
      conversationId,
      locale,
      screen,
      inventoryCount,
      currentLoadoutId,
      enableTools,
    } = inputData;

    // 1. Parse query for additional constraints (budget, weight, intent)
    const parsedQuery = parseQuery(message);

    // 2. Build user context for prompt
    const promptUserContext: UserContext = {
      screen,
      locale,
      inventoryCount,
      currentLoadoutId,
      userId,
      subscriptionTier: 'standard',
    };

    const promptContext: PromptContext = {
      userContext: promptUserContext,
    };

    // Add parsed query constraints to prompt
    if (parsedQuery.confidence > 0.5) {
      const constraintInfo = formatParsedQueryForPrompt(parsedQuery);
      if (constraintInfo) {
        promptContext.catalogResults = constraintInfo;
      }
    }

    // 3. Pre-load loadout context if on loadout detail page
    let loadoutContext: LoadoutContext | null = null;
    if (screen === 'loadout-detail' && currentLoadoutId) {
      loadoutContext = getCachedLoadoutContext(currentLoadoutId, userId);
      if (!loadoutContext) {
        loadoutContext = await preloadLoadoutContext(currentLoadoutId, userId);
      }
      if (loadoutContext) {
        const formattedLoadoutCtx = formatLoadoutContextForPrompt(
          loadoutContext,
          locale as 'en' | 'de',
        );
        promptContext.catalogResults = promptContext.catalogResults
          ? `${promptContext.catalogResults}\n\n${formattedLoadoutCtx}`
          : formattedLoadoutCtx;
      }
    }

    // 4. Build base system prompt
    const systemPrompt = buildMastraSystemPrompt(promptContext);

    // 5. Inject pre-fetched context
    let enrichedSystemPrompt = systemPrompt;
    if (formattedContext) {
      const contextLabel =
        locale === 'de'
          ? '**Vorab geladene Daten (nutze diese um schnell zu antworten):**'
          : '**Pre-loaded Data (use this to answer quickly):**';
      enrichedSystemPrompt = `${systemPrompt}\n\n${contextLabel}\n${formattedContext}`;
    }

    // 6. Attempt fast-path answer for simple facts
    let fastAnswer: string | null = null;
    if (
      canAnswerDirectly &&
      intent === 'simple_fact' &&
      Object.keys(prefetchedResults).length > 0
    ) {
      fastAnswer = await generateFastAnswer(message, prefetchedResults, locale);

      if (fastAnswer) {
        logInfo('Workflow: fast-path answer generated', {
          userId,
          conversationId,
          metadata: { intent, answerLength: fastAnswer.length },
        });
      }
    }

    return {
      enrichedSystemPrompt,
      fastAnswer,
      intent,
      confidence,
      message,
      userId,
      conversationId,
      currentLoadoutId,
      enableTools,
      locale,
    };
  },
});

// =============================================================================
// Workflow Definition
// =============================================================================

/**
 * The Gear Assistant Workflow orchestrates the "Classify → Prefetch → Build Context"
 * pipeline. The final agent streaming step is handled by the API route handler
 * to maintain real-time SSE streaming of text chunks.
 *
 * Flow:
 * 1. classifyIntent → Gemini Flash intent classification (<500ms)
 * 2. prefetchData → Parallel data fetching (up to 5 concurrent, 4s timeout each)
 * 3. buildContext → System prompt assembly + fast-path attempt
 *
 * The workflow output feeds into the Mastra Agent's streaming interface.
 */
export const gearAssistantWorkflow = createWorkflow({
  id: 'gear-assistant',
  description:
    'Orchestrates intent classification, parallel data prefetching, and context assembly for the gear assistant chat pipeline',
  inputSchema: WorkflowInputSchema,
  outputSchema: BuildContextOutputSchema,
});

gearAssistantWorkflow.then(classifyIntentStep).then(prefetchDataStep).then(buildContextStep);
gearAssistantWorkflow.commit();

// Export step references for testing
export {
  classifyIntentStep,
  prefetchDataStep,
  buildContextStep,
  WorkflowInputSchema,
  BuildContextOutputSchema,
};

// Export the output type for the route handler
export type GearAssistantWorkflowOutput = z.infer<typeof BuildContextOutputSchema>;
