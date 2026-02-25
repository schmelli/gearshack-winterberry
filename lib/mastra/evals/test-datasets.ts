/**
 * Eval Test Datasets for Gear Assistant
 * Feature: mastra-evals
 *
 * Curated test cases for evaluating the Gear Assistant agent's quality.
 * Each dataset targets a specific capability:
 *
 * 1. Gear Search (searchGearKnowledge) - RAG faithfulness
 * 2. Loadout Analysis (analyzeLoadout) - Correct tool usage + accuracy
 * 3. General Knowledge - Hallucination prevention
 *
 * Test cases include inputs and optional groundTruth for scorer validation.
 */

// =============================================================================
// Types
// =============================================================================

export interface EvalTestCase {
  /** Human-readable label for the test case */
  label: string;
  /** User input message */
  input: string;
  /** Expected ground truth (optional, used by some scorers) */
  groundTruth?: Record<string, unknown>;
  /** Which tools should be called (for tool-call-accuracy evaluation) */
  expectedTools?: string[];
}

export interface EvalTestDataset {
  /** Dataset name */
  name: string;
  /** Dataset description */
  description: string;
  /** Test cases */
  cases: EvalTestCase[];
}

// =============================================================================
// Dataset: Gear Search (searchGearKnowledge)
// =============================================================================

/**
 * Test cases that should trigger searchGearKnowledge tool calls.
 * Validates RAG faithfulness — the agent should only report data
 * returned by the search tool, not fabricate gear specifications.
 */
export const gearSearchDataset: EvalTestDataset = {
  name: 'gear-search',
  description: 'Gear search queries that should use searchGearKnowledge',
  cases: [
    {
      label: 'Search user inventory for tents',
      input: 'Do I have any tents in my inventory?',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Search catalog for ultralight tents',
      input: 'Find ultralight tents under 1kg in the catalog',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'German category search (Kocher)',
      input: 'Welche Kocher habe ich?',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Brand search',
      input: 'Show me all Hilleberg products',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Comparison query',
      input: 'Compare my sleeping bags with what is available in the catalog',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Weight-filtered search',
      input: 'What rain jackets under 300g do I own?',
      expectedTools: ['searchGearKnowledge'],
    },
  ],
};

// =============================================================================
// Dataset: Loadout Analysis (analyzeLoadout)
// =============================================================================

/**
 * Test cases that should trigger analyzeLoadout tool calls.
 * Validates that the agent correctly uses the analyzeLoadout tool
 * for weight analysis, gap detection, and trip suitability questions.
 */
export const loadoutAnalysisDataset: EvalTestDataset = {
  name: 'loadout-analysis',
  description: 'Loadout analysis queries that should use analyzeLoadout',
  cases: [
    {
      label: 'General loadout analysis',
      input: 'Analyze my current loadout',
      expectedTools: ['analyzeLoadout'],
    },
    {
      label: 'Weight optimization',
      input: 'How can I reduce the weight of this loadout?',
      expectedTools: ['analyzeLoadout'],
    },
    {
      label: 'Missing essentials',
      input: 'What essential gear am I missing for this hiking trip?',
      expectedTools: ['analyzeLoadout'],
    },
    {
      label: 'Trip suitability check',
      input: 'Is this loadout ready for winter camping in Norway?',
      expectedTools: ['analyzeLoadout'],
    },
    {
      label: 'Heaviest items query',
      input: 'What are the heaviest items in my pack list?',
      expectedTools: ['analyzeLoadout'],
    },
    {
      label: 'Big 3 analysis',
      input: 'How much do my Big 3 weigh and what percentage of total weight?',
      expectedTools: ['analyzeLoadout'],
    },
  ],
};

// =============================================================================
// Dataset: Hallucination Prevention
// =============================================================================

/**
 * Test cases designed to detect hallucination.
 * These queries could tempt the agent to fabricate data.
 * The agent should use tools to look up real data rather than
 * making up specifications, prices, or availability.
 */
export const hallucinationPreventionDataset: EvalTestDataset = {
  name: 'hallucination-prevention',
  description: 'Queries that test resistance to hallucination',
  cases: [
    {
      label: 'Specific product weight query',
      input: 'How much does my MSR PocketRocket weigh?',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Price comparison',
      input: 'What did I pay for my sleeping bag vs catalog price?',
      expectedTools: ['searchGearKnowledge'],
    },
    {
      label: 'Inventory count',
      input: 'How many items do I have in total?',
      expectedTools: ['inventoryInsights'],
    },
    {
      label: 'Category breakdown',
      input: 'Which category has the most items in my inventory?',
      expectedTools: ['inventoryInsights'],
    },
  ],
};

// =============================================================================
// Combined Dataset
// =============================================================================

/**
 * All eval test datasets combined.
 * Use this for comprehensive evaluation runs.
 */
export const allDatasets: EvalTestDataset[] = [
  gearSearchDataset,
  loadoutAnalysisDataset,
  hallucinationPreventionDataset,
];

/**
 * Get a flat list of all test cases across all datasets.
 * Useful for runEvals() which expects a flat data array.
 */
export function getAllTestCases(): EvalTestCase[] {
  return allDatasets.flatMap((dataset) => dataset.cases);
}
