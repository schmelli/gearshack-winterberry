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
 * - Structured error handling with granular per-step failure reporting
 * - Workflow Visualizer in Mastra Studio
 * - Suspend/Resume capability for future Human-in-the-Loop flows
 *
 * Note: Per-step retries (retryConfig) are not yet configured. The current
 * error handling surfaces which step failed but does not automatically retry.
 * Network-bound steps (classifyIntent → Gemini) could benefit from retries: 1
 * in a follow-up. See TODO below.
 *
 * @see https://mastra.ai/docs/workflows/overview
 */

import { createWorkflow, createStep } from '@mastra/core/workflows';
import { z } from 'zod';
import {
  classifyIntent,
  generateFastAnswer,
  DATA_REQUIREMENT_TYPES,
  QUERY_COMPLEXITY_VALUES,
  type DataRequirement,
  type QueryComplexity,
} from '../intent-router';
import { prefetchData, type PrefetchedContext } from '../parallel-prefetch';
import { buildMastraSystemPrompt, LOCALIZED_CONTENT, type PromptContext } from '../config';
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
import { logDebug, logInfo } from '../logging';
import type { UserContext } from '@/types/ai-assistant';

// =============================================================================
// Schema Definitions
// =============================================================================

/** Valid subscription tiers */
const SUBSCRIPTION_TIERS = ['standard', 'trailblazer'] as const;

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
  subscriptionTier: z.enum(SUBSCRIPTION_TIERS).default('standard'),
});

/**
 * Common pass-through fields that propagate unchanged through all steps.
 * Using pick() + extend() avoids repeating these in every step schema.
 */
const PassThroughSchema = WorkflowInputSchema.pick({
  message: true,
  userId: true,
  conversationId: true,
  locale: true,
  screen: true,
  inventoryCount: true,
  currentLoadoutId: true,
  enableTools: true,
  subscriptionTier: true,
});

/** Step 1 output: intent classification result */
const ClassifyIntentOutputSchema = PassThroughSchema.extend({
  intent: z.string(),
  confidence: z.number(),
  canAnswerDirectly: z.boolean(),
  queryComplexity: z.enum(QUERY_COMPLEXITY_VALUES).optional(),
  dataRequirements: z.array(z.object({
    type: z.enum(DATA_REQUIREMENT_TYPES),
    params: z.record(z.string(), z.unknown()).optional(),
  })),
  extractedEntities: z.record(z.string(), z.unknown()),
});

/** Step 2 output: prefetched data context */
const PrefetchDataOutputSchema = PassThroughSchema.extend({
  intent: z.string(),
  confidence: z.number(),
  canAnswerDirectly: z.boolean(),
  queryComplexity: z.enum(QUERY_COMPLEXITY_VALUES).optional(),
  extractedEntities: z.record(z.string(), z.unknown()),
  /** Prefetch results */
  prefetchedResults: z.record(z.string(), z.unknown()),
  prefetchComplete: z.boolean(),
  prefetchLatencyMs: z.number(),
  formattedContext: z.string(),
});

/** Step 3 output: assembled context ready for agent */
const BuildContextOutputSchema = PassThroughSchema.pick({
  message: true,
  userId: true,
  conversationId: true,
  currentLoadoutId: true,
  enableTools: true,
  locale: true,
  subscriptionTier: true,
}).extend({
  /** Enriched system prompt with prefetched data */
  enrichedSystemPrompt: z.string(),
  /** Fast-path answer if available (skips agent call) */
  fastAnswer: z.string().nullable(),
  /** Intent metadata for metrics */
  intent: z.string(),
  confidence: z.number(),
  /** Complexity for model routing (simple → Haiku, complex → Sonnet) */
  queryComplexity: z.enum(QUERY_COMPLEXITY_VALUES).optional(),
  /**
   * Loadout context for proactive suggestions on loadout-detail screen.
   * Typed as z.unknown() because Zod cannot validate the full LoadoutContext
   * shape at the Mastra step boundary — the type is asserted in the route handler
   * where the context is consumed.
   *
   * TODO: Define a `LoadoutContextSchema` in `lib/mastra/context-preloader.ts`
   * matching the `LoadoutContext` interface and import it here to replace
   * `z.unknown()` with a fully-validated typed schema.
   */
  loadoutContext: z.unknown().nullable(),
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
      subscriptionTier,
    } = inputData;

    const intentResult = await classifyIntent(message, screen, currentLoadoutId);

    logDebug('Workflow step: classifyIntent completed', {
      userId,
      metadata: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        queryComplexity: intentResult.queryComplexity,
        dataRequirements: intentResult.dataRequirements.length,
      },
    });

    return {
      intent: intentResult.intent,
      confidence: intentResult.confidence,
      canAnswerDirectly: intentResult.canAnswerDirectly,
      queryComplexity: intentResult.queryComplexity as QueryComplexity | undefined,
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
      subscriptionTier,
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
      queryComplexity,
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
      subscriptionTier,
    } = inputData;

    // Convert back to typed requirements — no cast needed because the schema
    // uses z.enum(DATA_REQUIREMENT_TYPES) which already narrows to DataRequirement['type']
    const typedRequirements: DataRequirement[] = dataRequirements.map(
      (req: { type: DataRequirement['type']; params?: Record<string, unknown> }) => ({
        type: req.type,
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
      queryComplexity,
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
      subscriptionTier,
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
      queryComplexity,
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
      subscriptionTier,
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
      subscriptionTier,
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

    // 5. Inject pre-fetched context using centralized localized label
    let enrichedSystemPrompt = systemPrompt;
    if (formattedContext) {
      const safeLocale = (locale === 'de' ? 'de' : 'en') as 'en' | 'de';
      const contextLabel = LOCALIZED_CONTENT[safeLocale].preloadedDataLabel;
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
      queryComplexity,
      loadoutContext,
      message,
      userId,
      conversationId,
      currentLoadoutId,
      enableTools,
      locale,
      subscriptionTier,
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
