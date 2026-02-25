/**
 * Unit Tests for Mastra Eval Scorers
 * Feature: mastra-evals
 *
 * Tests the scorer factory functions to verify they create valid
 * MastraScorer instances with correct configuration.
 *
 * Note: These are unit tests that verify scorer creation and configuration.
 * Full integration tests (running scorers against live agents) require
 * API keys and are run separately via the CI eval runner.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Tool } from '@mastra/core/tools';

// =============================================================================
// Mock heavy dependencies to avoid requiring API keys at test time
// =============================================================================

vi.mock('@ai-sdk/gateway', () => ({
  createGateway: vi.fn(() => {
    const gateway = vi.fn(() => 'mocked-model');
    // @ts-expect-error – mock duck-typed gateway
    gateway.textEmbeddingModel = vi.fn(() => 'mocked-embedding-model');
    return gateway;
  }),
}));

vi.mock('@mastra/core/agent', () => ({
  Agent: vi.fn(),
}));

vi.mock('@mastra/core/evals', () => ({
  runEvals: vi.fn(),
}));

vi.mock('@mastra/core/tools', () => ({
  createTool: vi.fn(() => ({})),
}));

// Mock the tools that are imported by the eval module
vi.mock('@/lib/mastra/tools/analyze-loadout', () => ({
  analyzeLoadoutTool: { id: 'analyzeLoadout', description: 'mock' },
}));
vi.mock('@/lib/mastra/tools/inventory-insights', () => ({
  inventoryInsightsTool: { id: 'inventoryInsights', description: 'mock' },
}));
vi.mock('@/lib/mastra/tools/search-gear-knowledge', () => ({
  searchGearKnowledgeTool: { id: 'searchGearKnowledge', description: 'mock' },
}));

// Mock the prompt builder
vi.mock('@/lib/mastra/prompt-builder', () => ({
  buildMastraSystemPrompt: vi.fn(() => 'mocked system prompt'),
  LOCALIZED_CONTENT: { en: {}, de: {} },
}));

// =============================================================================
// Tests: Test Datasets
// =============================================================================

describe('Eval Test Datasets', () => {
  it('gearSearchDataset has valid test cases', async () => {
    const { gearSearchDataset } = await import('@/lib/mastra/evals/test-datasets');

    expect(gearSearchDataset.name).toBe('gear-search');
    expect(gearSearchDataset.cases.length).toBeGreaterThan(0);

    for (const testCase of gearSearchDataset.cases) {
      expect(testCase.label).toBeTruthy();
      expect(testCase.input).toBeTruthy();
      expect(testCase.expectedTools).toBeDefined();
      expect(testCase.expectedTools!.length).toBeGreaterThan(0);
    }
  });

  it('loadoutAnalysisDataset has valid test cases', async () => {
    const { loadoutAnalysisDataset } = await import('@/lib/mastra/evals/test-datasets');

    expect(loadoutAnalysisDataset.name).toBe('loadout-analysis');
    expect(loadoutAnalysisDataset.cases.length).toBeGreaterThan(0);

    for (const testCase of loadoutAnalysisDataset.cases) {
      expect(testCase.label).toBeTruthy();
      expect(testCase.input).toBeTruthy();
      expect(testCase.expectedTools).toContain('analyzeLoadout');
    }
  });

  it('hallucinationPreventionDataset has valid test cases', async () => {
    const { hallucinationPreventionDataset } = await import('@/lib/mastra/evals/test-datasets');

    expect(hallucinationPreventionDataset.name).toBe('hallucination-prevention');
    expect(hallucinationPreventionDataset.cases.length).toBeGreaterThan(0);

    for (const testCase of hallucinationPreventionDataset.cases) {
      expect(testCase.label).toBeTruthy();
      expect(testCase.input).toBeTruthy();
      expect(testCase.expectedTools).toBeDefined();
    }
  });

  it('getAllTestCases returns combined cases from all datasets', async () => {
    const { getAllTestCases, allDatasets } = await import('@/lib/mastra/evals/test-datasets');

    const allCases = getAllTestCases();
    const expectedCount = allDatasets.reduce(
      (sum, dataset) => sum + dataset.cases.length,
      0
    );

    expect(allCases.length).toBe(expectedCount);
    expect(allCases.length).toBeGreaterThan(10);
  });

  it('all test cases have unique labels', async () => {
    const { getAllTestCases } = await import('@/lib/mastra/evals/test-datasets');

    const allCases = getAllTestCases();
    const labels = allCases.map((tc) => tc.label);
    const uniqueLabels = new Set(labels);

    expect(uniqueLabels.size).toBe(labels.length);
  });

  it('gear search cases expect searchGearKnowledge tool', async () => {
    const { gearSearchDataset } = await import('@/lib/mastra/evals/test-datasets');

    for (const testCase of gearSearchDataset.cases) {
      expect(testCase.expectedTools).toContain('searchGearKnowledge');
    }
  });

  it('loadout cases expect analyzeLoadout tool', async () => {
    const { loadoutAnalysisDataset } = await import('@/lib/mastra/evals/test-datasets');

    for (const testCase of loadoutAnalysisDataset.cases) {
      expect(testCase.expectedTools).toContain('analyzeLoadout');
    }
  });
});

// =============================================================================
// Tests: Scorer Factories
// =============================================================================

describe('Scorer Factory Functions', () => {
  it('createGearFaithfulnessScorer creates a scorer', async () => {
    const { createGearFaithfulnessScorer } = await import('@/lib/mastra/evals/scorers');

    const scorer = createGearFaithfulnessScorer('mocked-model');
    expect(scorer).toBeDefined();
  });

  it('createGearHallucinationScorer creates a scorer', async () => {
    const { createGearHallucinationScorer } = await import('@/lib/mastra/evals/scorers');

    const scorer = createGearHallucinationScorer('mocked-model');
    expect(scorer).toBeDefined();
  });

  it('createExpectedToolScorer creates a code-based scorer', async () => {
    const { createExpectedToolScorer } = await import('@/lib/mastra/evals/scorers');

    const scorer = createExpectedToolScorer('analyzeLoadout');
    expect(scorer).toBeDefined();
  });

  it('createExpectedToolScorer accepts strict mode option', async () => {
    const { createExpectedToolScorer } = await import('@/lib/mastra/evals/scorers');

    const scorer = createExpectedToolScorer('searchGearKnowledge', {
      strictMode: true,
    });
    expect(scorer).toBeDefined();
  });

  it('createExpectedToolScorer accepts expectedToolOrder option', async () => {
    const { createExpectedToolScorer } = await import('@/lib/mastra/evals/scorers');

    const scorer = createExpectedToolScorer('searchGearKnowledge', {
      expectedToolOrder: ['searchGearKnowledge', 'analyzeLoadout'],
    });
    expect(scorer).toBeDefined();
  });

  it('createGearToolCallAccuracyScorer creates an LLM-based scorer', async () => {
    const { createGearToolCallAccuracyScorer } = await import('@/lib/mastra/evals/scorers');

    const mockTools = [
      { id: 'analyzeLoadout', description: 'Analyze a loadout' },
      { id: 'searchGearKnowledge', description: 'Search gear knowledge' },
      { id: 'inventoryInsights', description: 'Get inventory insights' },
    ];

    const scorer = createGearToolCallAccuracyScorer('mocked-model', mockTools as unknown as Tool[]);
    expect(scorer).toBeDefined();
  });
});

// =============================================================================
// Tests: mergeWeightedScores
// =============================================================================

describe('mergeWeightedScores', () => {
  it('returns empty object for empty groups', async () => {
    const { mergeWeightedScores } = await import('@/lib/mastra/evals/run-evals');
    expect(mergeWeightedScores([])).toEqual({});
  });

  it('returns the single group scores unchanged for a single group', async () => {
    const { mergeWeightedScores } = await import('@/lib/mastra/evals/run-evals');
    const result = mergeWeightedScores([
      { scores: { faithfulness: 0.8, hallucination: 0.2 }, count: 5 },
    ]);
    expect(result.faithfulness).toBeCloseTo(0.8);
    expect(result.hallucination).toBeCloseTo(0.2);
  });

  it('computes weighted average across groups proportional to case count', async () => {
    const { mergeWeightedScores } = await import('@/lib/mastra/evals/run-evals');

    // Group A: 4 cases, score 1.0; Group B: 6 cases, score 0.0
    // Expected: 4/10 * 1.0 + 6/10 * 0.0 = 0.4
    const result = mergeWeightedScores([
      { scores: { faithfulness: 1.0 }, count: 4 },
      { scores: { faithfulness: 0.0 }, count: 6 },
    ]);
    expect(result.faithfulness).toBeCloseTo(0.4);
  });

  it('merges metrics from different groups without loss', async () => {
    const { mergeWeightedScores } = await import('@/lib/mastra/evals/run-evals');
    const result = mergeWeightedScores([
      { scores: { faithfulness: 0.9 }, count: 3 },
      { scores: { 'tool-call-accuracy': 0.85 }, count: 7 },
    ]);
    // faithfulness only in group A: weight = 3/10 = 0.3 → 0.9 * 0.3 = 0.27
    expect(result.faithfulness).toBeCloseTo(0.27);
    // tool-call-accuracy only in group B: weight = 7/10 = 0.7 → 0.85 * 0.7 = 0.595
    expect(result['tool-call-accuracy']).toBeCloseTo(0.595);
  });
});

// =============================================================================
// Tests: checkThresholds
// =============================================================================

describe('checkThresholds', () => {
  it('returns true when all scores meet thresholds', async () => {
    const { checkThresholds } = await import('@/lib/mastra/evals/run-evals');

    const result = checkThresholds({
      faithfulness: 0.9,
      hallucination: 0.1,
      'tool-call-accuracy': 0.95,
    });

    expect(result).toBe(true);
  });

  it('returns false when faithfulness is below threshold', async () => {
    const { checkThresholds } = await import('@/lib/mastra/evals/run-evals');

    expect(checkThresholds({ faithfulness: 0.5 })).toBe(false);
  });

  it('returns false when hallucination is above threshold', async () => {
    const { checkThresholds } = await import('@/lib/mastra/evals/run-evals');

    expect(checkThresholds({ hallucination: 0.8 })).toBe(false);
  });

  it('returns false when tool-call-accuracy is below threshold', async () => {
    const { checkThresholds } = await import('@/lib/mastra/evals/run-evals');

    expect(checkThresholds({ 'tool-call-accuracy': 0.5 })).toBe(false);
  });

  it('returns true for non-numeric score entries', async () => {
    const { checkThresholds } = await import('@/lib/mastra/evals/run-evals');

    const result = checkThresholds({
      someMetric: 'not-a-number' as unknown as number,
    });

    expect(result).toBe(true);
  });
});

describe('isMetricPassed', () => {
  it('faithfulness passes at or above threshold', async () => {
    const { isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    expect(isMetricPassed('faithfulness', 0.7)).toBe(true);
    expect(isMetricPassed('faithfulness', 0.9)).toBe(true);
    expect(isMetricPassed('faithfulness', 0.69)).toBe(false);
  });

  it('hallucination passes at or below threshold', async () => {
    const { isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    expect(isMetricPassed('hallucination', 0.3)).toBe(true);
    expect(isMetricPassed('hallucination', 0.1)).toBe(true);
    expect(isMetricPassed('hallucination', 0.31)).toBe(false);
  });

  it('tool-call-accuracy passes at or above threshold', async () => {
    const { isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    expect(isMetricPassed('tool-call-accuracy', 0.8)).toBe(true);
    expect(isMetricPassed('tool-call-accuracy', 1.0)).toBe(true);
    expect(isMetricPassed('tool-call-accuracy', 0.79)).toBe(false);
  });

  it('does not false-match tool-named metrics that are not tool-call scorers', async () => {
    const { isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    // 'toolbox-accuracy' should NOT trigger the tool-call threshold (no threshold configured)
    expect(isMetricPassed('toolbox-accuracy', 0.1)).toBe(true);
    expect(isMetricPassed('multi-tool', 0.0)).toBe(true);
  });

  it('returns true for unknown metrics (no configured threshold)', async () => {
    const { isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    expect(isMetricPassed('custom-metric', 0.0)).toBe(true);
  });

  it('checkThresholds and isMetricPassed agree per-metric when one passes and one fails', async () => {
    const { checkThresholds, isMetricPassed } = await import('@/lib/mastra/evals/run-evals');

    // faithfulness passes (0.9 >= 0.7), hallucination fails (0.8 > 0.3)
    const scores = { faithfulness: 0.9, hallucination: 0.8 };
    expect(checkThresholds(scores)).toBe(false);
    expect(isMetricPassed('faithfulness', 0.9)).toBe(true);
    expect(isMetricPassed('hallucination', 0.8)).toBe(false);
  });
});

// =============================================================================
// Tests: Eval Agent Config
// =============================================================================

describe('Eval Agent Configuration', () => {
  it('EVAL_TOOLS contains the three composite tools', async () => {
    const { EVAL_TOOLS } = await import('@/lib/mastra/evals/gear-assistant.eval');

    expect(EVAL_TOOLS).toHaveProperty('analyzeLoadout');
    expect(EVAL_TOOLS).toHaveProperty('searchGearKnowledge');
    expect(EVAL_TOOLS).toHaveProperty('inventoryInsights');
    expect(Object.keys(EVAL_TOOLS)).toHaveLength(3);
  });

  it('clamps samplingRate to [0, 1] bounds', async () => {
    const { createGearAssistantWithEvals } = await import('@/lib/mastra/evals/gear-assistant.eval');

    // Verify factory does not throw for out-of-range sampling rates
    expect(() => createGearAssistantWithEvals({ samplingRate: 1.5 })).not.toThrow();
    expect(() => createGearAssistantWithEvals({ samplingRate: -0.1 })).not.toThrow();
    expect(() => createGearAssistantWithEvals({ samplingRate: 0.5 })).not.toThrow();
  });

  it('importing run-evals does not call process.exit (ESM guard)', async () => {
    // This test verifies the ESM guard: importing the module must NOT trigger main().
    // If the guard is missing, main() calls process.exit(1) immediately because
    // AI_GATEWAY_API_KEY is unset in the test environment, killing the test runner.
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
    await import('@/lib/mastra/evals/run-evals');
    // process.exit should NOT have been called on import
    expect(exitSpy).not.toHaveBeenCalled();
    exitSpy.mockRestore();
  });

  it('exports index re-exports all public APIs', async () => {
    const evalModule = await import('@/lib/mastra/evals/index');

    // Scorer factories
    expect(evalModule.createGearFaithfulnessScorer).toBeDefined();
    expect(evalModule.createGearHallucinationScorer).toBeDefined();
    expect(evalModule.createGearToolCallAccuracyScorer).toBeDefined();
    expect(evalModule.createExpectedToolScorer).toBeDefined();

    // Test datasets
    expect(evalModule.gearSearchDataset).toBeDefined();
    expect(evalModule.loadoutAnalysisDataset).toBeDefined();
    expect(evalModule.hallucinationPreventionDataset).toBeDefined();
    expect(evalModule.allDatasets).toBeDefined();
    expect(evalModule.getAllTestCases).toBeDefined();

    // Eval agent
    expect(evalModule.createGearAssistantWithEvals).toBeDefined();
    expect(evalModule.EVAL_TOOLS).toBeDefined();
  });
});
