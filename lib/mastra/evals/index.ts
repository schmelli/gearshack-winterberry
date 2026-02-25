/**
 * Mastra Evals Module
 * Feature: mastra-evals
 *
 * Quality evaluation for the Gear Assistant AI agent.
 * Provides measurable metrics for:
 * - Faithfulness (RAG fidelity to tool results)
 * - Hallucination (fabricated gear specs/data detection)
 * - Tool Call Accuracy (correct tool selection)
 *
 * @see https://mastra.ai/docs/evals/overview
 */

// Scorer factories
export {
  createGearFaithfulnessScorer,
  createGearHallucinationScorer,
  createGearToolCallAccuracyScorer,
  createExpectedToolScorer,
} from './scorers';

// Eval agent
export {
  createGearAssistantWithEvals,
  EVAL_TOOLS,
  EVAL_JUDGE_MODEL,
} from './gear-assistant.eval';

// Test datasets
export {
  gearSearchDataset,
  loadoutAnalysisDataset,
  hallucinationPreventionDataset,
  allDatasets,
  getAllTestCases,
  type EvalTestCase,
  type EvalTestDataset,
} from './test-datasets';
