#!/usr/bin/env tsx
/**
 * Synthetic Eval Generation from Production Traces
 * Feature: Synthetic Eval Generation (Kap. 27, Kap. 34)
 *
 * Extracts interesting production traces from the mastra_scorers table
 * and uses an LLM to select diverse, representative eval candidates.
 * Candidates are stored in eval_review_queue for human approval before
 * promotion to the test dataset.
 *
 * "Some products are synthetically generating evals from tracing data,
 *  with human approval." — Building Effective Agents, Kap. 34
 *
 * Usage:
 *   npx tsx scripts/generate-evals-from-traces.ts
 *   npx tsx scripts/generate-evals-from-traces.ts --lookback 14
 *   npx tsx scripts/generate-evals-from-traces.ts --limit 200 --candidates 10
 *   npx tsx scripts/generate-evals-from-traces.ts --dry-run
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_GATEWAY_API_KEY
 */

import 'dotenv/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createGateway } from '@ai-sdk/gateway';
import { generateObject } from 'ai';
import { z } from 'zod';
import { randomUUID } from 'crypto';

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_LOOKBACK_DAYS = 7;
const DEFAULT_TRACE_LIMIT = 100;
const DEFAULT_CANDIDATE_COUNT = 5;
const GENERATOR_MODEL = process.env.EVAL_GENERATOR_MODEL || 'anthropic/claude-sonnet-4-6';

// Parse CLI args
const args = process.argv.slice(2);
function getArg(name: string, defaultValue: number): number {
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1]) {
    const val = parseInt(args[idx + 1], 10);
    return Number.isNaN(val) ? defaultValue : val;
  }
  return defaultValue;
}
const isDryRun = args.includes('--dry-run');
const lookbackDays = getArg('lookback', DEFAULT_LOOKBACK_DAYS);
const traceLimit = getArg('limit', DEFAULT_TRACE_LIMIT);
const candidateCount = getArg('candidates', DEFAULT_CANDIDATE_COUNT);

// =============================================================================
// Environment Validation
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const aiGatewayKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

if (!aiGatewayKey) {
  console.error('Missing AI_GATEWAY_API_KEY in .env.local');
  process.exit(1);
}

// =============================================================================
// Clients
// =============================================================================

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const gateway = createGateway({ apiKey: aiGatewayKey });

// =============================================================================
// Schema for LLM-generated eval candidates
// =============================================================================

const EvalCandidateSchema = z.object({
  evalCandidates: z.array(
    z.object({
      /** The user input to use as the eval test case */
      input: z.string().describe('The user input query to use as eval test case'),
      /** Which tools should be called for this input */
      expectedTools: z.array(z.string()).describe('Tool names that should be invoked'),
      /** Optional ground truth for verification */
      groundTruth: z.string().optional().describe('Expected factual answer, if deterministic'),
      /** Why this is a good test case */
      rationale: z.string().describe('Why this trace makes a good, diverse eval candidate'),
      /** Which dataset it belongs to */
      targetDataset: z
        .enum(['gear-search', 'loadout-analysis', 'hallucination-prevention', 'edge-cases'])
        .describe('Which eval dataset this candidate should be added to'),
    })
  ),
});

type EvalCandidate = z.infer<typeof EvalCandidateSchema>['evalCandidates'][number];

// =============================================================================
// Trace Fetching
// =============================================================================

interface ProductionTrace {
  id: string;
  input: unknown;
  output: unknown;
  score: number;
  scorer: unknown;
  scorerId: string;
  reason: string | null;
  traceId: string | null;
  runId: string;
  createdAt: string;
}

/**
 * Fetch recent scored traces from the mastra_scorers table.
 *
 * Selection strategy:
 * 1. Time-bounded: Only traces from the last N days
 * 2. Diverse scoring: Include both high and low-scoring traces
 * 3. Limit to avoid overwhelming the LLM context
 */
async function fetchRecentTraces(): Promise<ProductionTrace[]> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - lookbackDays);

  console.log(`  Fetching traces from last ${lookbackDays} days (since ${cutoffDate.toISOString().split('T')[0]})`);

  // Fetch low-scoring traces (interesting edge cases / failures)
  const { data: lowScoring, error: lowErr } = await supabase
    .from('mastra_scorers')
    .select('id, input, output, score, scorer, scorerId, reason, traceId, runId, createdAt')
    .gte('createdAt', cutoffDate.toISOString())
    .lt('score', 0.5)
    .order('score', { ascending: true })
    .limit(Math.floor(traceLimit / 2));

  if (lowErr) {
    throw new Error(`Error fetching low-scoring traces: ${lowErr.message}`);
  }

  // Fetch high-scoring traces (good examples for regression testing)
  const { data: highScoring, error: highErr } = await supabase
    .from('mastra_scorers')
    .select('id, input, output, score, scorer, scorerId, reason, traceId, runId, createdAt')
    .gte('createdAt', cutoffDate.toISOString())
    .gte('score', 0.8)
    .order('createdAt', { ascending: false })
    .limit(Math.floor(traceLimit / 2));

  if (highErr) {
    throw new Error(`Error fetching high-scoring traces: ${highErr.message}`);
  }

  const allTraces = [...(lowScoring ?? []), ...(highScoring ?? [])];

  console.log(`  Found ${allTraces.length} scored traces (${lowScoring?.length ?? 0} low-scoring, ${highScoring?.length ?? 0} high-scoring)`);

  return allTraces;
}

/**
 * Deduplicate traces by runId to avoid generating multiple candidates
 * from the same agent interaction (which may have multiple scorer rows).
 */
function deduplicateByRun(traces: ProductionTrace[]): ProductionTrace[] {
  const seen = new Set<string>();
  const deduped: ProductionTrace[] = [];

  for (const trace of traces) {
    if (!seen.has(trace.runId)) {
      seen.add(trace.runId);
      deduped.push(trace);
    }
  }

  console.log(`  Deduplicated to ${deduped.length} unique runs`);
  return deduped;
}

// =============================================================================
// LLM-based Candidate Selection
// =============================================================================

/**
 * Use an LLM to analyze production traces and select diverse eval candidates.
 *
 * The LLM is instructed to:
 * 1. Select traces that cover different capabilities (search, analysis, etc.)
 * 2. Prioritize edge cases and failure modes
 * 3. Include multilingual queries (DE/EN)
 * 4. Avoid duplicates of existing test cases
 */
async function selectCandidates(traces: ProductionTrace[]): Promise<EvalCandidate[]> {
  // Prepare trace summaries for the LLM (truncate to avoid context overflow).
  // Use traceLimit so --limit CLI arg controls both DB fetch count and LLM context size.
  const traceSummaries = traces.slice(0, traceLimit).map((t) => ({
    input: typeof t.input === 'string' ? t.input : JSON.stringify(t.input).substring(0, 300),
    output: typeof t.output === 'string'
      ? t.output.substring(0, 200)
      : JSON.stringify(t.output).substring(0, 200),
    score: t.score,
    scorer: typeof t.scorer === 'object' && t.scorer !== null
      ? (t.scorer as Record<string, unknown>).name ?? t.scorerId
      : t.scorerId,
    reason: t.reason?.substring(0, 150) ?? null,
  }));

  console.log(`  Sending ${traceSummaries.length} trace summaries to ${GENERATOR_MODEL}`);

  // 90s timeout — generous but prevents indefinite hangs against slow gateways
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);

  try {
    const { object } = await generateObject({
      model: gateway(GENERATOR_MODEL),
      schema: EvalCandidateSchema,
      temperature: 0.3,
      abortSignal: controller.signal,
      system: `You are an expert QA engineer for a gear management AI assistant (GearShack).
The assistant helps users manage hiking/camping gear inventory, analyze loadouts,
and search for gear using these tools:
- searchGearKnowledge: RAG search across user inventory and product catalog
- analyzeLoadout: Weight analysis, gap detection, trip suitability for loadouts
- inventoryInsights: Statistical insights about the user's gear collection

Your task: From production trace data, select ${candidateCount} diverse eval test cases
that would strengthen the eval suite. Focus on:
1. Edge cases that existing hand-crafted tests miss (typos, missing articles, empty inputs)
2. Multilingual queries (German and English)
3. Failure modes where the agent scored poorly
4. Complex multi-tool interactions
5. Queries where the agent used the wrong tool

IMPORTANT: Generate the "input" field as a realistic user query that would trigger
the expected behavior. Do NOT copy the raw trace input JSON — transform it into a
natural language query. Each candidate must be meaningfully different.`,
      prompt: `Here are ${traceSummaries.length} recent production traces with their eval scores.
Select ${candidateCount} diverse, representative test cases.

Production traces:
${JSON.stringify(traceSummaries, null, 2)}

Existing test case topics to AVOID duplicating:
- "Do I have any tents?" (basic inventory search)
- "Find ultralight tents under 1kg" (catalog search with filter)
- "Welche Kocher habe ich?" (German category search)
- "Show me all Hilleberg products" (brand search)
- "Compare sleeping bags" (comparison query)
- "Analyze my current loadout" (general analysis)
- "How can I reduce weight?" (weight optimization)
- "What am I missing for hiking?" (missing essentials)
- "How much does my MSR PocketRocket weigh?" (specific product weight)
- "How many items do I have?" (inventory count)

Select ${candidateCount} NEW test cases that cover gaps not addressed above.`,
    });
    return object.evalCandidates;
  } finally {
    // Always clear the timeout regardless of success or failure to avoid timer leaks
    clearTimeout(timeout);
  }
}

// =============================================================================
// Review Queue Insertion
// =============================================================================

async function insertCandidates(
  candidates: EvalCandidate[],
  batchId: string
): Promise<number> {
  const rows = candidates.map((c) => ({
    input: c.input,
    expected_tools: c.expectedTools,
    ground_truth: c.groundTruth ? { answer: c.groundTruth } : null,
    rationale: c.rationale,
    target_dataset: c.targetDataset,
    status: 'pending_review' as const,
    generated_at: new Date().toISOString(),
    generation_batch_id: batchId,
    generator_model: GENERATOR_MODEL,
    trace_source: 'mastra_scorer' as const,
  }));

  const { data, error } = await supabase.from('eval_review_queue').insert(rows).select('id');

  if (error) {
    console.error('  Error inserting candidates:', error.message);
    return 0;
  }

  return data?.length ?? 0;
}

async function recordGenerationRun(
  batchId: string,
  tracesScanned: number,
  candidatesGenerated: number,
  startedAt: string,
  error?: string
): Promise<void> {
  await supabase.from('eval_generation_runs').insert({
    batch_id: batchId,
    traces_scanned: tracesScanned,
    candidates_generated: candidatesGenerated,
    generator_model: GENERATOR_MODEL,
    lookback_days: lookbackDays,
    filters: { traceLimit, candidateCount },
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    error: error ?? null,
  });
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  // Capture run start time immediately so audit log reflects true duration
  const runStartedAt = new Date().toISOString();
  const batchId = `eval-gen-${Date.now()}-${randomUUID().substring(0, 8)}`;

  console.log('Synthetic Eval Generation from Production Traces');
  console.log('================================================');
  console.log(`  Batch ID:    ${batchId}`);
  console.log(`  Lookback:    ${lookbackDays} days`);
  console.log(`  Trace limit: ${traceLimit}`);
  console.log(`  Candidates:  ${candidateCount}`);
  console.log(`  Model:       ${GENERATOR_MODEL}`);
  console.log(`  Dry run:     ${isDryRun}`);
  console.log('');

  // Step 1: Fetch recent traces
  console.log('Step 1: Fetching production traces...');
  const rawTraces = await fetchRecentTraces();

  if (rawTraces.length === 0) {
    console.log('  No scored traces found in the lookback window.');
    console.log('  The eval suite needs production traffic with eval sampling enabled.');
    console.log('  Set EVAL_SAMPLING_RATE=0.1 in production to start collecting traces.');
    await recordGenerationRun(batchId, 0, 0, runStartedAt, 'No traces found');
    return;
  }

  // Step 2: Deduplicate
  console.log('\nStep 2: Deduplicating traces...');
  const traces = deduplicateByRun(rawTraces);

  if (traces.length < 3) {
    console.log('  Too few unique traces for meaningful candidate selection.');
    console.log('  Need at least 3 unique agent runs. Try increasing --lookback.');
    await recordGenerationRun(batchId, traces.length, 0, runStartedAt, 'Too few unique traces');
    return;
  }

  // Step 3: LLM-based candidate selection
  console.log('\nStep 3: Selecting eval candidates via LLM...');
  let candidates: EvalCandidate[];
  try {
    candidates = await selectCandidates(traces);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  LLM candidate selection failed: ${msg}`);
    await recordGenerationRun(batchId, traces.length, 0, runStartedAt, msg);
    process.exit(1);
  }

  console.log(`  Generated ${candidates.length} eval candidates:\n`);
  for (const c of candidates) {
    console.log(`  [${c.targetDataset}] "${c.input}"`);
    console.log(`    Tools: ${c.expectedTools.join(', ')}`);
    console.log(`    Rationale: ${c.rationale}`);
    console.log('');
  }

  // Step 4: Insert into review queue
  if (isDryRun) {
    console.log('DRY RUN: Skipping database insertion.');
    console.log('  Run without --dry-run to insert candidates into eval_review_queue.');
    return;
  }

  console.log('Step 4: Inserting into eval_review_queue...');
  const insertedCount = await insertCandidates(candidates, batchId);

  // Step 5: Record the generation run
  await recordGenerationRun(batchId, traces.length, insertedCount, runStartedAt);

  console.log(`\n  Inserted ${insertedCount} candidates into eval_review_queue.`);
  console.log(`  Batch ID: ${batchId}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. Review candidates: SELECT * FROM eval_review_queue WHERE status = \'pending_review\';');
  console.log('  2. Approve/reject:   UPDATE eval_review_queue SET status = \'approved\' WHERE id = \'...\';');
  console.log('  3. Promote approved:  npx tsx scripts/promote-approved-evals.ts');
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
