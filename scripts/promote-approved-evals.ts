#!/usr/bin/env tsx
/**
 * Promote Approved Evals to Test Dataset
 * Feature: Synthetic Eval Generation (Kap. 27, Kap. 34)
 *
 * Reads approved eval candidates from eval_review_queue and generates
 * a TypeScript file that extends the existing test datasets. Human reviewers
 * must approve candidates before they can be promoted.
 *
 * "Some products are synthetically generating evals from tracing data,
 *  with human approval." — Building Effective Agents, Kap. 34
 *
 * Usage:
 *   npx tsx scripts/promote-approved-evals.ts
 *   npx tsx scripts/promote-approved-evals.ts --dry-run
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// =============================================================================
// Environment
// =============================================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const isDryRun = process.argv.includes('--dry-run');

// =============================================================================
// Output Path
// =============================================================================

const OUTPUT_PATH = path.resolve(
  __dirname,
  '..',
  'lib',
  'mastra',
  'evals',
  'synthetic-datasets.ts'
);

// =============================================================================
// Types
// =============================================================================

interface ApprovedCandidate {
  id: string;
  input: string;
  expected_tools: string[];
  ground_truth: Record<string, unknown> | null;
  rationale: string;
  target_dataset: string;
  reviewer_notes: string | null;
  generation_batch_id: string | null;
  generated_at: string;
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('Promote Approved Evals to Test Dataset');
  console.log('======================================');
  console.log(`  Dry run: ${isDryRun}`);
  console.log(`  Output:  ${OUTPUT_PATH}`);
  console.log('');

  // Step 1: Fetch newly approved candidates (to be promoted)
  console.log('Step 1: Fetching approved candidates...');
  const { data: newlyApproved, error: approvedErr } = await supabase
    .from('eval_review_queue')
    .select('id, input, expected_tools, ground_truth, rationale, target_dataset, reviewer_notes, generation_batch_id, generated_at')
    .eq('status', 'approved')
    .order('generated_at', { ascending: true });

  if (approvedErr) {
    console.error('  Error fetching approved candidates:', approvedErr.message);
    process.exit(1);
  }

  if (!newlyApproved || newlyApproved.length === 0) {
    console.log('  No newly approved candidates found.');
    console.log('  Approve candidates first: UPDATE eval_review_queue SET status = \'approved\' WHERE id = \'...\';');
    return;
  }

  console.log(`  Found ${newlyApproved.length} newly approved candidates.`);

  // Step 2: Also fetch previously promoted candidates (accumulate into file)
  console.log('\nStep 2: Fetching previously promoted candidates...');
  const { data: previouslyPromoted, error: promotedErr } = await supabase
    .from('eval_review_queue')
    .select('id, input, expected_tools, ground_truth, rationale, target_dataset, reviewer_notes, generation_batch_id, generated_at')
    .eq('status', 'promoted')
    .order('generated_at', { ascending: true });

  if (promotedErr) {
    console.error('  Error fetching promoted candidates:', promotedErr.message);
    process.exit(1);
  }

  const allCandidates = [...(previouslyPromoted ?? []), ...newlyApproved];
  console.log(`  Total candidates for file generation: ${allCandidates.length} (${previouslyPromoted?.length ?? 0} previously promoted + ${newlyApproved.length} newly approved)`);

  // Step 3: Group by target dataset
  const grouped = new Map<string, ApprovedCandidate[]>();
  for (const c of allCandidates) {
    const dataset = c.target_dataset || 'edge-cases';
    const existing = grouped.get(dataset) ?? [];
    existing.push(c);
    grouped.set(dataset, existing);
  }

  console.log('  Datasets:');
  for (const [dataset, items] of grouped) {
    console.log(`    ${dataset}: ${items.length} candidates`);
  }

  // Step 3: Generate TypeScript file
  console.log('\nStep 3: Generating synthetic-datasets.ts...');
  const tsContent = generateTypeScript(grouped);

  if (isDryRun) {
    console.log('\nDRY RUN: Generated TypeScript:\n');
    console.log(tsContent);
    return;
  }

  // Write to file
  fs.writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
  console.log(`  Written to: ${OUTPUT_PATH}`);

  // Step 4: Mark newly approved as promoted
  console.log('\nStep 4: Marking newly approved candidates as promoted...');
  const newIds = newlyApproved.map((c) => c.id);
  const { error: updateErr } = await supabase
    .from('eval_review_queue')
    .update({ status: 'promoted', reviewed_at: new Date().toISOString() })
    .in('id', newIds);

  if (updateErr) {
    console.error('  Error marking as promoted:', updateErr.message);
  } else {
    console.log(`  Marked ${newIds.length} candidates as promoted.`);
  }

  console.log('\nDone! The synthetic test cases are now in:');
  console.log(`  ${OUTPUT_PATH}`);
  console.log(`  Total test cases: ${allCandidates.length}`);
}

// =============================================================================
// TypeScript Generation
// =============================================================================

function generateTypeScript(grouped: Map<string, ApprovedCandidate[]>): string {
  const lines: string[] = [];

  lines.push('/**');
  lines.push(' * Synthetic Eval Datasets — Auto-generated from Production Traces');
  lines.push(' * Feature: Synthetic Eval Generation (Kap. 27, Kap. 34)');
  lines.push(' *');
  lines.push(' * DO NOT EDIT MANUALLY. This file is generated by:');
  lines.push(' *   npx tsx scripts/promote-approved-evals.ts');
  lines.push(' *');
  lines.push(` * Generated at: ${new Date().toISOString()}`);
  lines.push(` * Total candidates: ${Array.from(grouped.values()).reduce((sum, g) => sum + g.length, 0)}`);
  lines.push(' */');
  lines.push('');
  lines.push("import type { EvalTestCase, EvalTestDataset } from './test-datasets';");
  lines.push('');

  // Generate dataset constants for each group
  const datasetVarNames: string[] = [];

  for (const [dataset, candidates] of grouped) {
    const varName = `synthetic${toPascalCase(dataset)}Dataset`;
    datasetVarNames.push(varName);

    lines.push('// =============================================================================');
    lines.push(`// Synthetic Dataset: ${dataset}`);
    lines.push('// =============================================================================');
    lines.push('');
    lines.push(`export const ${varName}: EvalTestDataset = {`);
    lines.push(`  name: 'synthetic-${dataset}',`);
    lines.push(`  description: 'Auto-generated from production traces — ${dataset} edge cases',`);
    lines.push('  cases: [');

    for (const c of candidates) {
      lines.push('    {');
      lines.push(`      label: ${JSON.stringify(truncate(c.rationale, 60))},`);
      lines.push(`      input: ${JSON.stringify(c.input)},`);
      if (c.expected_tools.length > 0) {
        lines.push(`      expectedTools: ${JSON.stringify(c.expected_tools)},`);
      }
      if (c.ground_truth) {
        lines.push(`      groundTruth: ${JSON.stringify(c.ground_truth)},`);
      }
      lines.push('    },');
    }

    lines.push('  ],');
    lines.push('};');
    lines.push('');
  }

  // Combined export
  lines.push('// =============================================================================');
  lines.push('// Combined');
  lines.push('// =============================================================================');
  lines.push('');
  lines.push('export const allSyntheticDatasets: EvalTestDataset[] = [');
  for (const varName of datasetVarNames) {
    lines.push(`  ${varName},`);
  }
  lines.push('];');
  lines.push('');
  lines.push('export function getAllSyntheticTestCases(): EvalTestCase[] {');
  lines.push('  return allSyntheticDatasets.flatMap((dataset) => dataset.cases);');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// =============================================================================
// Utilities
// =============================================================================

function toPascalCase(str: string): string {
  return str
    .split(/[-_\s]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
