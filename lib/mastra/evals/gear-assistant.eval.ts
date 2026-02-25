/**
 * Gear Assistant Eval Agent Configuration
 * Feature: mastra-evals
 *
 * Creates an eval-instrumented version of the Gear Assistant agent
 * with Faithfulness, Hallucination, and ToolCallAccuracy scorers.
 *
 * The scorers run asynchronously alongside agent responses for
 * continuous quality monitoring. Results are stored in the
 * mastra_scorers table for trend analysis.
 *
 * Usage:
 * - Live evaluation: Attach to agent via evals.scorers config
 * - CI evaluation: Use runEvals() with test datasets
 * - Manual: Run individual scorers via scorer.run()
 *
 * @see https://mastra.ai/docs/evals/overview
 */

import { Agent } from '@mastra/core/agent';
import { createGateway } from '@ai-sdk/gateway';
import { buildMastraSystemPrompt } from '../prompt-builder';
// Composite Domain Tools (Feature 060: AI Agent Evolution)
import { analyzeLoadoutTool } from '../tools/analyze-loadout';
import { inventoryInsightsTool } from '../tools/inventory-insights';
import { searchGearKnowledgeTool } from '../tools/search-gear-knowledge';
import {
  createGearFaithfulnessScorer,
  createGearHallucinationScorer,
  createGearToolCallAccuracyScorer,
} from './scorers';

// =============================================================================
// Configuration
// =============================================================================

const AI_CHAT_MODEL = process.env.AI_CHAT_MODEL || 'anthropic/claude-sonnet-4-5';

// Eval judge model: use a fast, capable model for scoring
// Default to the same gateway model (can be overridden via env)
const EVAL_JUDGE_MODEL = process.env.EVAL_JUDGE_MODEL || 'openai/gpt-4o-mini';

// Sampling rate for live evaluations (0-1)
// Default: 0.1 (10%) to minimize cost in production
// Set to 1.0 in CI for comprehensive evaluation
const EVAL_SAMPLING_RATE = parseFloat(
  process.env.EVAL_SAMPLING_RATE || '0.1'
);

// =============================================================================
// Gateway (lazy-loaded)
// =============================================================================

let evalGatewayInstance: ReturnType<typeof createGateway> | null = null;

function getEvalGateway() {
  if (!evalGatewayInstance) {
    const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!AI_GATEWAY_KEY) {
      throw new Error(
        'AI_GATEWAY_KEY is required for Mastra Evals. ' +
        'Please set AI_GATEWAY_API_KEY or AI_GATEWAY_KEY in your environment.'
      );
    }
    evalGatewayInstance = createGateway({ apiKey: AI_GATEWAY_KEY });
  }
  return evalGatewayInstance;
}

// =============================================================================
// Eval Tools (subset for evaluation)
// =============================================================================

/**
 * Tools used by the eval agent.
 * Limited to composite tools that are the primary targets for eval:
 * - analyzeLoadout (loadout analysis - RAG)
 * - searchGearKnowledge (gear search - RAG)
 * - inventoryInsights (inventory stats)
 */
const EVAL_TOOLS = {
  analyzeLoadout: analyzeLoadoutTool,
  searchGearKnowledge: searchGearKnowledgeTool,
  inventoryInsights: inventoryInsightsTool,
};

// =============================================================================
// Eval Agent Factory
// =============================================================================

/**
 * Create a Gear Assistant agent instrumented with quality evaluation scorers.
 *
 * This agent is identical to the production agent but includes eval scorers
 * that measure:
 * 1. **Faithfulness**: Are claims in the response supported by tool results?
 * 2. **Hallucination**: Does the response contradict tool-provided data?
 * 3. **Tool Call Accuracy**: Does the agent select the right tools?
 *
 * @param options - Configuration options
 * @param options.samplingRate - Fraction of responses to evaluate (0-1)
 * @param options.lang - Language for system prompt ('en' | 'de')
 *
 * @example
 * ```typescript
 * // For CI: evaluate every response
 * const evalAgent = createGearAssistantWithEvals({ samplingRate: 1.0 });
 *
 * // For production: sample 10% of responses
 * const prodAgent = createGearAssistantWithEvals({ samplingRate: 0.1 });
 * ```
 */
export function createGearAssistantWithEvals(options?: {
  samplingRate?: number;
  lang?: 'en' | 'de';
}) {
  const samplingRate = options?.samplingRate ?? EVAL_SAMPLING_RATE;
  const lang = options?.lang ?? 'en';

  // Build system prompt for eval context
  const systemPrompt = buildMastraSystemPrompt({
    userContext: {
      screen: 'inventory',
      locale: lang,
      inventoryCount: 0,
    },
  });

  // Create judge model reference
  const judgeModel = getEvalGateway()(EVAL_JUDGE_MODEL);

  // Create scorers
  const faithfulnessScorer = createGearFaithfulnessScorer(judgeModel);
  const hallucinationScorer = createGearHallucinationScorer(judgeModel);
  const toolCallScorer = createGearToolCallAccuracyScorer(
    judgeModel,
    Object.values(EVAL_TOOLS)
  );

  const agent = new Agent({
    id: 'gear-assistant-eval',
    name: 'Gear Assistant (with Evals)',
    instructions: systemPrompt,
    model: getEvalGateway()(AI_CHAT_MODEL),
    tools: EVAL_TOOLS,
    evals: {
      scorers: [
        {
          scorer: faithfulnessScorer,
          sampling: { type: 'ratio', rate: samplingRate },
        },
        {
          scorer: hallucinationScorer,
          sampling: { type: 'ratio', rate: samplingRate },
        },
        {
          scorer: toolCallScorer,
          sampling: { type: 'ratio', rate: samplingRate },
        },
      ],
    },
  });

  console.log(
    `[Mastra Evals] Created eval agent with ${AI_CHAT_MODEL}, ` +
    `judge=${EVAL_JUDGE_MODEL}, sampling=${samplingRate}, ` +
    `3 scorers (faithfulness, hallucination, tool-call-accuracy)`
  );

  return agent;
}

// =============================================================================
// Exports
// =============================================================================

export { EVAL_TOOLS, EVAL_JUDGE_MODEL };
