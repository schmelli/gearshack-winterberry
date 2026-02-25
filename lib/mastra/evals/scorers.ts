/**
 * Mastra Eval Scorers for Gear Assistant
 * Feature: mastra-evals
 *
 * Provides quality measurement for AI agent responses:
 * 1. FaithfulnessScorer - Verifies claims against tool results (RAG fidelity)
 * 2. HallucinationScorer - Detects fabricated gear specs/data
 * 3. ToolCallAccuracyScorer (code) - Validates correct tool selection
 * 4. ToolCallAccuracyScorer (LLM) - Evaluates tool call appropriateness
 *
 * Uses the new Mastra Scorers API (@mastra/evals/scorers/prebuilt).
 *
 * @see https://mastra.ai/docs/evals/overview
 */

import {
  createFaithfulnessScorer,
  createHallucinationScorer,
  createToolCallAccuracyScorerLLM,
  createToolCallAccuracyScorerCode,
} from '@mastra/evals/scorers/prebuilt';
import { extractToolResults } from '@mastra/evals/scorers/utils';
import type { MastraModelConfig } from '@mastra/core/llm';
import type { Tool } from '@mastra/core/tools';

// =============================================================================
// Scorer Factory Functions
// =============================================================================

/**
 * Create a FaithfulnessScorer configured for gear assistant RAG evaluation.
 *
 * Measures how factually accurate the agent's response is compared to the
 * context returned by tools (searchGearKnowledge, analyzeLoadout, etc.).
 * Extracts claims from the output and verifies each against tool results.
 *
 * Score: 0.0 (no claims supported) to 1.0 (all claims supported)
 *
 * @param model - Judge model for claim verification
 */
export function createGearFaithfulnessScorer(model: MastraModelConfig) {
  return createFaithfulnessScorer({
    model,
    options: {
      // Extract tool results at scoring time so the faithfulness scorer
      // can verify agent claims against real data returned by the tools
      // (searchGearKnowledge, analyzeLoadout, inventoryInsights).
      getContext: ({ run }) => {
        const toolResults = extractToolResults(run.output);
        return toolResults.map((t) =>
          JSON.stringify({ tool: t.toolName, result: t.result })
        );
      },
    },
  });
}

/**
 * Create a HallucinationScorer configured for gear assistant evaluation.
 *
 * Detects when the agent fabricates gear specifications, prices, weights,
 * or other factual claims that contradict tool-provided data.
 * Uses dynamic context extraction from tool results.
 *
 * Score: 0.0 (no hallucinations) to 1.0 (all statements contradict context)
 * Lower is better!
 *
 * @param model - Judge model for contradiction detection
 */
export function createGearHallucinationScorer(model: MastraModelConfig) {
  return createHallucinationScorer({
    model,
    options: {
      getContext: ({ run }) => {
        const toolResults = extractToolResults(run.output);
        return toolResults.map((t) =>
          JSON.stringify({ tool: t.toolName, result: t.result })
        );
      },
    },
  });
}

/**
 * Create an LLM-based ToolCallAccuracyScorer for gear assistant evaluation.
 *
 * Uses a judge LLM to evaluate whether the agent selected the RIGHT tools
 * for the given query. Checks that:
 * - analyzeLoadout is used for loadout analysis queries
 * - searchGearKnowledge is used for gear search queries
 * - Tools are called with appropriate parameters
 *
 * Score: 0.0 (wrong tools) to 1.0 (perfect tool selection)
 *
 * @param model - Judge model for tool call evaluation
 * @param availableTools - List of tools available to the agent
 */
export function createGearToolCallAccuracyScorer(
  model: MastraModelConfig,
  availableTools: Tool[]
) {
  return createToolCallAccuracyScorerLLM({
    model,
    availableTools,
  });
}

/**
 * Create a code-based ToolCallAccuracyScorer for specific tool expectations.
 *
 * Deterministic (no LLM required) - checks if the expected tool was called.
 * Use this for test cases where you know exactly which tool should be invoked.
 *
 * @param expectedTool - The tool name that should be called (e.g., 'analyzeLoadout')
 * @param options - Additional options (strictMode, expectedToolOrder)
 */
export function createExpectedToolScorer(
  expectedTool: string,
  options?: { strictMode?: boolean; expectedToolOrder?: string[] }
) {
  return createToolCallAccuracyScorerCode({
    expectedTool,
    strictMode: options?.strictMode,
    expectedToolOrder: options?.expectedToolOrder,
  });
}
