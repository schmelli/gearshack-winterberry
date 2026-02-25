/**
 * Evaluation Script: Multilingual Embeddings DE/EN Parity
 * Feature: Vorschlag 16 - Multilinguale Embeddings für Deutsch/Englisch-Suche
 *
 * Compares embedding quality between German and English queries
 * across different embedding models to measure cross-lingual retrieval parity.
 *
 * Measures:
 * 1. Cosine similarity between DE/EN query pairs
 * 2. Result overlap when searching the same concept in both languages
 * 3. Per-model performance breakdown
 *
 * Usage:
 *   npx tsx scripts/eval-multilingual-embeddings.ts
 *
 * Requires:
 *   AI_GATEWAY_API_KEY in environment (or .env.local)
 */

import 'dotenv/config';
import { createGateway } from '@ai-sdk/gateway';
import { embedMany } from 'ai';

// =============================================================================
// Configuration
// =============================================================================

const MODELS_TO_EVAL = [
  { id: 'openai/text-embedding-3-small' as const, dims: 1536 },
  { id: 'cohere/embed-multilingual-v3.0' as const, dims: 1024 },
];

/**
 * Parallel DE/EN query pairs covering typical gear search scenarios.
 * Each pair should embed to nearby vectors in a good multilingual model.
 */
const QUERY_PAIRS: Array<{ de: string; en: string; category: string }> = [
  {
    de: 'leichter Winterschlafsack',
    en: 'lightweight winter sleeping bag',
    category: 'sleeping-bags',
  },
  {
    de: 'Winterschlafsack für -15°C',
    en: 'winter sleeping bag for -15°C',
    category: 'sleeping-bags',
  },
  {
    de: 'ultraleichtes Zelt für 2 Personen',
    en: 'ultralight tent for 2 persons',
    category: 'tents',
  },
  {
    de: 'wasserdichte Regenjacke unter 300g',
    en: 'waterproof rain jacket under 300g',
    category: 'clothing',
  },
  {
    de: 'Gaskocher mit Piezo-Zündung',
    en: 'gas stove with piezo ignition',
    category: 'stoves',
  },
  {
    de: 'Trekkingrucksack 50 Liter',
    en: 'trekking backpack 50 liters',
    category: 'backpacks',
  },
  {
    de: 'Isomatte für Wintercamping',
    en: 'sleeping pad for winter camping',
    category: 'sleeping-pads',
  },
  {
    de: 'Wanderstöcke aus Carbon',
    en: 'carbon trekking poles',
    category: 'accessories',
  },
  {
    de: 'Daunenjacke leicht packbar',
    en: 'down jacket packable lightweight',
    category: 'clothing',
  },
  {
    de: 'Trinkflasche BPA-frei 1 Liter',
    en: 'water bottle BPA-free 1 liter',
    category: 'accessories',
  },
  {
    de: 'Stirnlampe 300 Lumen aufladbar',
    en: 'headlamp 300 lumens rechargeable',
    category: 'lighting',
  },
  {
    de: 'Gore-Tex Wanderschuhe',
    en: 'Gore-Tex hiking boots',
    category: 'footwear',
  },
];

// =============================================================================
// Math Utilities
// =============================================================================

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimension mismatch: ${a.length} vs ${b.length}`);
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;
  return dotProduct / denominator;
}

function mean(values: number[]): number {
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(mean(squaredDiffs));
}

// =============================================================================
// Evaluation
// =============================================================================

interface EvalResult {
  modelId: string;
  dimensions: number;
  pairs: Array<{
    category: string;
    de: string;
    en: string;
    similarity: number;
  }>;
  meanSimilarity: number;
  stdDevSimilarity: number;
  minSimilarity: number;
  maxSimilarity: number;
  pairsAbove80: number;
  pairsAbove90: number;
  latencyMs: number;
}

async function evaluateModel(
  gateway: ReturnType<typeof createGateway>,
  modelId: string,
  dims: number
): Promise<EvalResult> {
  const startTime = Date.now();

  // Collect all texts to embed in a single batch
  const deTexts = QUERY_PAIRS.map((p) => p.de);
  const enTexts = QUERY_PAIRS.map((p) => p.en);
  const allTexts = [...deTexts, ...enTexts];

  console.log(`  Embedding ${allTexts.length} texts with ${modelId}...`);

  const embeddingModel = gateway.textEmbeddingModel(modelId);

  // Batch embed all texts at once
  const { embeddings } = await embedMany({
    model: embeddingModel,
    values: allTexts,
  });

  // Verify actual dimensions match expected
  const actualDims = embeddings[0]?.length ?? 0;
  if (actualDims !== dims) {
    console.warn(`  [WARNING] Dimension mismatch for ${modelId}: expected ${dims}, got ${actualDims}`);
  }

  const deEmbeddings = embeddings.slice(0, QUERY_PAIRS.length);
  const enEmbeddings = embeddings.slice(QUERY_PAIRS.length);

  // Calculate pairwise cosine similarity
  const pairs = QUERY_PAIRS.map((pair, i) => ({
    category: pair.category,
    de: pair.de,
    en: pair.en,
    similarity: cosineSimilarity(deEmbeddings[i], enEmbeddings[i]),
  }));

  const similarities = pairs.map((p) => p.similarity);
  const latencyMs = Date.now() - startTime;

  return {
    modelId,
    dimensions: embeddings[0].length,
    pairs,
    meanSimilarity: mean(similarities),
    stdDevSimilarity: standardDeviation(similarities),
    minSimilarity: Math.min(...similarities),
    maxSimilarity: Math.max(...similarities),
    pairsAbove80: similarities.filter((s) => s > 0.8).length,
    pairsAbove90: similarities.filter((s) => s > 0.9).length,
    latencyMs,
  };
}

// =============================================================================
// Main
// =============================================================================

async function main() {
  const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
  if (!apiKey) {
    console.error('ERROR: AI_GATEWAY_API_KEY is required. Set it in .env.local or environment.');
    process.exit(1);
  }

  const gateway = createGateway({ apiKey });

  console.log('='.repeat(72));
  console.log('Multilingual Embedding Evaluation: DE/EN Query Parity');
  console.log('='.repeat(72));
  console.log(`Query pairs: ${QUERY_PAIRS.length}`);
  console.log(`Models: ${MODELS_TO_EVAL.map((m) => m.id).join(', ')}`);
  console.log('');

  const results: EvalResult[] = [];

  for (const model of MODELS_TO_EVAL) {
    console.log(`\nEvaluating: ${model.id} (${model.dims}d)`);
    console.log('-'.repeat(50));

    try {
      const result = await evaluateModel(gateway, model.id, model.dims);
      results.push(result);

      // Print per-pair results
      for (const pair of result.pairs) {
        const bar = '█'.repeat(Math.round(pair.similarity * 20));
        const score = (pair.similarity * 100).toFixed(1);
        const status = pair.similarity > 0.8 ? 'PASS' : 'FAIL';
        console.log(
          `  [${status}] ${score}% ${bar}  "${pair.de}" <-> "${pair.en}"`
        );
      }

      console.log('');
      console.log(`  Mean similarity:  ${(result.meanSimilarity * 100).toFixed(1)}%`);
      console.log(`  Std deviation:    ${(result.stdDevSimilarity * 100).toFixed(1)}%`);
      console.log(`  Min similarity:   ${(result.minSimilarity * 100).toFixed(1)}%`);
      console.log(`  Max similarity:   ${(result.maxSimilarity * 100).toFixed(1)}%`);
      console.log(`  Pairs > 80%:      ${result.pairsAbove80}/${QUERY_PAIRS.length}`);
      console.log(`  Pairs > 90%:      ${result.pairsAbove90}/${QUERY_PAIRS.length}`);
      console.log(`  Latency:          ${result.latencyMs}ms`);
      console.log(`  Dimensions:       ${result.dimensions}`);
    } catch (error) {
      console.error(`  ERROR: ${error instanceof Error ? error.message : String(error)}`);
      console.error('  Skipping this model...');
    }
  }

  // ==========================================================================
  // Summary Comparison
  // ==========================================================================

  if (results.length > 1) {
    console.log('\n' + '='.repeat(72));
    console.log('COMPARISON SUMMARY');
    console.log('='.repeat(72));
    console.log('');

    // Table header
    const header = ['Metric', ...results.map((r) => r.modelId.split('/')[1])];
    const rows = [
      ['Mean Similarity', ...results.map((r) => `${(r.meanSimilarity * 100).toFixed(1)}%`)],
      ['Min Similarity', ...results.map((r) => `${(r.minSimilarity * 100).toFixed(1)}%`)],
      ['Max Similarity', ...results.map((r) => `${(r.maxSimilarity * 100).toFixed(1)}%`)],
      ['Pairs > 80%', ...results.map((r) => `${r.pairsAbove80}/${QUERY_PAIRS.length}`)],
      ['Pairs > 90%', ...results.map((r) => `${r.pairsAbove90}/${QUERY_PAIRS.length}`)],
      ['Dimensions', ...results.map((r) => String(r.dimensions))],
      ['Latency', ...results.map((r) => `${r.latencyMs}ms`)],
    ];

    // Calculate column widths
    const colWidths = header.map((h, i) =>
      Math.max(h.length, ...rows.map((r) => r[i].length)) + 2
    );

    // Print table
    console.log(header.map((h, i) => h.padEnd(colWidths[i])).join('| '));
    console.log(colWidths.map((w) => '-'.repeat(w)).join('+-'));
    for (const row of rows) {
      console.log(row.map((cell, i) => cell.padEnd(colWidths[i])).join('| '));
    }

    // Recommendation
    console.log('');
    const bestModel = results.reduce((best, r) =>
      r.meanSimilarity > best.meanSimilarity ? r : best
    );
    const worstModel = results.reduce((worst, r) =>
      r.meanSimilarity < worst.meanSimilarity ? r : worst
    );
    const improvement = (
      (bestModel.meanSimilarity - worstModel.meanSimilarity) * 100
    ).toFixed(1);

    console.log(`Recommendation: ${bestModel.modelId}`);
    console.log(
      `  +${improvement}% mean DE/EN parity vs ${worstModel.modelId}`
    );

    if (bestModel.modelId === 'cohere/embed-multilingual-v3.0') {
      console.log('');
      console.log('To enable multilingual embeddings:');
      console.log('  1. Set EMBEDDING_MODEL=cohere/embed-multilingual-v3.0 in .env.local');
      console.log('  2. Run the database migration: npx supabase db push');
      console.log('  3. Re-embed existing data (conversation memory + catalog products)');
    }
  }

  console.log('\n' + '='.repeat(72));
  console.log('Evaluation complete.');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
