/**
 * Mastra Eval Runner for CI/CD
 * Feature: mastra-evals
 *
 * Runs the Gear Assistant evals in CI and reports aggregate scores.
 * Uses Mastra's runEvals() for batch evaluation against test datasets.
 *
 * Usage:
 *   npx tsx lib/mastra/evals/run-evals.ts
 *
 * Environment variables:
 *   AI_GATEWAY_API_KEY - Required for AI model access
 *   EVAL_JUDGE_MODEL   - Judge model (default: openai/gpt-4o-mini)
 *   DATABASE_URL        - Required for tool execution
 *
 * Exit codes:
 *   0 - All scores above thresholds
 *   1 - One or more scores below thresholds (regression detected)
 *
 * @see https://mastra.ai/docs/evals/running-in-ci
 */

import { runEvals } from '@mastra/core/evals';
import { createExpectedToolScorer } from './scorers';
import { createGearAssistantWithEvals } from './gear-assistant.eval';
import {
  gearSearchDataset,
  loadoutAnalysisDataset,
  hallucinationPreventionDataset,
} from './test-datasets';
import type { EvalTestCase, EvalTestDataset } from './test-datasets';

// =============================================================================
// Configuration
// =============================================================================

/**
 * NaN-safe threshold parser.
 * `parseFloat('abc')` returns NaN; `Math.min(1, NaN)` is NaN (not clamped).
 * This ensures misconfigured env vars fall back to the default silently.
 */
function parseThreshold(envVar: string | undefined, defaultValue: number): number {
  const parsed = parseFloat(envVar ?? '');
  return Number.isNaN(parsed) ? defaultValue : parsed;
}

/** Score thresholds — CI fails if any score drops below these */
const THRESHOLDS = {
  /** Minimum faithfulness score (0-1). Target: 0.7 */
  faithfulness: parseThreshold(process.env.EVAL_THRESHOLD_FAITHFULNESS, 0.7),
  /** Maximum hallucination score (0-1). Target: 0.3 (lower is better) */
  hallucination: parseThreshold(process.env.EVAL_THRESHOLD_HALLUCINATION, 0.3),
  /** Minimum tool-call accuracy score (0-1). Target: 0.8 */
  toolCallAccuracy: parseThreshold(process.env.EVAL_THRESHOLD_TOOL_ACCURACY, 0.8),
};

// =============================================================================
// Runner
// =============================================================================

export interface DatasetResult {
  datasetName: string;
  scores: Record<string, number>;
  totalItems: number;
  passed: boolean;
}

/**
 * Compute a weighted-average merge of per-group score maps.
 * Exported for unit testing — the aggregation math is non-trivial.
 *
 * Metrics that appear in only some groups will have weights that sum to
 * less than 1.0; a warning is emitted when this occurs to surface divergent
 * scorer configurations.
 */
export function mergeWeightedScores(
  groups: { scores: Record<string, number>; count: number }[]
): Record<string, number> {
  const totalItems = groups.reduce((sum, g) => sum + g.count, 0);
  if (totalItems === 0) return {};

  // Track which metrics appeared and their total weight
  const metricWeightSum: Record<string, number> = {};
  const merged: Record<string, number> = {};

  for (const { scores, count } of groups) {
    const weight = count / totalItems;
    for (const [metric, score] of Object.entries(scores)) {
      if (typeof score === 'number') {
        merged[metric] = (merged[metric] ?? 0) + score * weight;
        metricWeightSum[metric] = (metricWeightSum[metric] ?? 0) + weight;
      }
    }
  }

  // Warn if any metric's weights don't sum to ~1.0 (heterogeneous scorer configs)
  for (const [metric, weightSum] of Object.entries(metricWeightSum)) {
    if (Math.abs(weightSum - 1.0) > 0.01) {
      console.warn(
        `[Mastra Evals] Metric "${metric}" only appeared in ${(weightSum * 100).toFixed(0)}% of cases. ` +
        'Scores may not be comparable across datasets with differing scorer configs.'
      );
    }
  }

  return merged;
}

export async function runDatasetEvals(
  dataset: EvalTestDataset,
  agent: ReturnType<typeof createGearAssistantWithEvals>
): Promise<DatasetResult> {
  console.log(`\n📊 Running evals for dataset: ${dataset.name}`);
  console.log(`   ${dataset.description}`);
  console.log(`   ${dataset.cases.length} test cases\n`);

  // Group test cases by their expected tool so each group gets its own scorer.
  // A single scorer for the whole dataset would incorrectly grade mixed datasets
  // (e.g. hallucinationPreventionDataset has both searchGearKnowledge and
  // inventoryInsights cases — applying only the first tool's scorer to all cases
  // silently fails the others).
  const casesByTool = new Map<string | undefined, EvalTestCase[]>();
  for (const tc of dataset.cases) {
    const tool = tc.expectedTools?.[0];
    const group = casesByTool.get(tool) ?? [];
    group.push(tc);
    casesByTool.set(tool, group);
  }

  const onItemComplete = ({ item, scorerResults }: {
    item: { input: unknown; groundTruth?: Record<string, unknown> };
    scorerResults: Record<string, unknown>;
  }) => {
    const input = typeof item.input === 'string'
      ? item.input.substring(0, 60)
      : JSON.stringify(item.input).substring(0, 60);
    const scoreStr = Object.entries(scorerResults)
      .map(([k, v]) => `${k}=${typeof v === 'number' ? v.toFixed(2) : v}`)
      .join(', ');
    console.log(`   ✓ "${input}..." → ${scoreStr}`);
  };

  // Run evals per group and accumulate weighted scores
  const groupResults: { scores: Record<string, number>; count: number }[] = [];

  for (const [expectedTool, cases] of casesByTool) {
    const scorers = expectedTool ? [createExpectedToolScorer(expectedTool)] : [];
    const result = await runEvals({
      data: cases.map((tc) => ({
        input: tc.input,
        groundTruth: tc.groundTruth,
      })),
      scorers,
      target: agent,
      onItemComplete,
    });
    groupResults.push({ scores: result.scores, count: cases.length });
  }

  // Compute weighted-average scores across all groups
  const mergedScores = mergeWeightedScores(groupResults);
  const totalItems = groupResults.reduce((sum, g) => sum + g.count, 0);

  const passed = checkThresholds(mergedScores);

  console.log(`\n   Results for ${dataset.name}:`);
  for (const [metric, score] of Object.entries(mergedScores)) {
    // Display per-metric pass/fail, not the overall dataset status
    const metricPassed = isMetricPassed(metric, score);
    const status = metricPassed ? '✅' : '❌';
    console.log(`   ${status} ${metric}: ${typeof score === 'number' ? score.toFixed(3) : score}`);
  }

  return {
    datasetName: dataset.name,
    scores: mergedScores,
    totalItems,
    passed,
  };
}

/**
 * Returns true if a single metric score is within its configured threshold.
 * Use this for per-metric display; use checkThresholds() for the overall pass/fail.
 * Exported for unit testing.
 */
export function isMetricPassed(metric: string, score: number): boolean {
  const metricLower = metric.toLowerCase();
  if (metricLower.includes('faithfulness')) {
    return score >= THRESHOLDS.faithfulness;
  }
  if (metricLower.includes('hallucination')) {
    return score <= THRESHOLDS.hallucination;
  }
  if (metricLower.includes('tool-call')) {
    return score >= THRESHOLDS.toolCallAccuracy;
  }
  // Unknown metric: treat as passed (no threshold configured)
  return true;
}

/** Exported for unit testing. */
export function checkThresholds(scores: Record<string, number>): boolean {
  let passed = true;

  for (const [metric, score] of Object.entries(scores)) {
    if (typeof score !== 'number') continue;

    const metricLower = metric.toLowerCase();

    if (metricLower.includes('faithfulness') && score < THRESHOLDS.faithfulness) {
      console.error(
        `❌ Faithfulness score ${score.toFixed(3)} below threshold ${THRESHOLDS.faithfulness}`
      );
      passed = false;
    }

    if (metricLower.includes('hallucination') && score > THRESHOLDS.hallucination) {
      console.error(
        `❌ Hallucination score ${score.toFixed(3)} above threshold ${THRESHOLDS.hallucination} (lower is better)`
      );
      passed = false;
    }

    // Use 'tool-call' (not 'tool') to avoid matching unrelated scorer names
    if (metricLower.includes('tool-call') && score < THRESHOLDS.toolCallAccuracy) {
      console.error(
        `❌ Tool-call accuracy score ${score.toFixed(3)} below threshold ${THRESHOLDS.toolCallAccuracy}`
      );
      passed = false;
    }
  }

  return passed;
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🔬 Mastra Evals Runner — Gear Assistant Quality Check');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`Thresholds: faithfulness≥${THRESHOLDS.faithfulness}, hallucination≤${THRESHOLDS.hallucination}, tool-accuracy≥${THRESHOLDS.toolCallAccuracy}`);

  // Validate environment
  if (!process.env.AI_GATEWAY_API_KEY && !process.env.AI_GATEWAY_KEY) {
    console.error('❌ AI_GATEWAY_API_KEY is required. Set it in your environment.');
    process.exit(1);
  }

  // Create eval agent with 100% sampling for CI. Falls back to 1.0 if env var is malformed.
  const samplingRateParsed = parseFloat(process.env.EVAL_SAMPLING_RATE ?? '');
  const samplingRate = Number.isNaN(samplingRateParsed) ? 1.0 : samplingRateParsed;
  const agent = createGearAssistantWithEvals({ samplingRate });

  // Run each dataset
  const datasets = [
    gearSearchDataset,
    loadoutAnalysisDataset,
    hallucinationPreventionDataset,
  ];

  const results: DatasetResult[] = [];

  for (const dataset of datasets) {
    try {
      const result = await runDatasetEvals(dataset, agent);
      results.push(result);
    } catch (error) {
      console.error(`❌ Error running ${dataset.name}:`, error);
      results.push({
        datasetName: dataset.name,
        scores: {},
        totalItems: 0,
        passed: false,
      });
    }
  }

  // Summary
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('📋 Summary');
  console.log('═══════════════════════════════════════════════════════');

  let allPassed = true;
  for (const result of results) {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.datasetName}: ${result.totalItems} test cases`);
    for (const [metric, score] of Object.entries(result.scores)) {
      console.log(`   ${metric}: ${typeof score === 'number' ? score.toFixed(3) : score}`);
    }
    if (!result.passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n✅ All eval scores within thresholds. No regressions detected.');
    process.exit(0);
  } else {
    console.log('\n❌ Some eval scores below thresholds. Regressions detected!');
    process.exit(1);
  }
}

// Guard: only run main() when this file is the CLI entry point (e.g. `tsx run-evals.ts`).
// When imported as a module (e.g. in unit tests), process.argv[1] points to the
// test runner — NOT to this file — so this block is correctly skipped.
const isDirectRun =
  process.argv[1] != null &&
  (process.argv[1].endsWith('/run-evals.ts') ||
    process.argv[1].endsWith('/run-evals.js') ||
    process.argv[1].endsWith('\\run-evals.ts') ||
    process.argv[1].endsWith('\\run-evals.js'));

if (isDirectRun) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
