/**
 * Budget Optimization Workflow
 * Feature: AI Assistant Reliability Improvements
 *
 * A 5-step workflow for optimizing gear loadouts under budget constraints:
 * 1. Parse Constraints: Extract budget, currency, weight goals from query
 * 2. Analyze Current: Fetch current loadout/inventory with weights and prices
 * 3. Find Alternatives: Search catalog for lighter alternatives within budget
 * 4. Rank Options: Score alternatives by weight savings per dollar spent
 * 5. Synthesize: Generate actionable recommendations with ROI analysis
 *
 * Features:
 * - 15-second timeout with partial results
 * - Multi-currency support (EUR, USD, GBP, CHF)
 * - Weight unit normalization (g, kg, oz, lb)
 * - Progress streaming via callbacks
 */

import { SupabaseClient } from '@supabase/supabase-js';

import { logInfo, logError, logDebug, createTimer } from '@/lib/mastra/logging';
import { traceWorkflowStep } from '@/lib/mastra/tracing';
import {
  parseQuery,
  type ParsedQuery,
  normalizeToGrams,
  normalizeToUsd,
  isComplexOptimizationQuery,
} from '@/lib/ai-assistant/query-parser';
import type { WorkflowDefinition } from '@/types/mastra';
import type { Database } from '@/types/supabase';

// Type assertion helper for tables not yet in generated Supabase types
interface UntypedQueryBuilder {
  insert: (data: Record<string, unknown>) => UntypedQueryBuilder;
  then: Promise<{ data: unknown; error: Error | null }>['then'];
}

type AnySupabaseClient = SupabaseClient<Database> & {
  from: (table: string) => UntypedQueryBuilder;
};

// ============================================================================
// Types
// ============================================================================

/**
 * Input for budget optimization workflow
 */
export interface BudgetOptimizationInput {
  /** User's natural language query */
  query: string;
  /** User's locale for response formatting */
  locale?: 'en' | 'de';
  /** Optional loadout ID to optimize (if not provided, uses inventory) */
  loadoutId?: string;
}

/**
 * Parsed optimization constraints
 */
export interface OptimizationConstraints {
  /** Maximum budget in USD (normalized from user's currency) */
  maxBudgetUsd: number;
  /** Original currency for display */
  originalCurrency: string;
  /** Original budget amount for display */
  originalBudget: number;
  /** Target weight reduction in grams (optional) */
  targetWeightReductionGrams?: number;
  /** Categories to focus on (optional) */
  focusCategories?: string[];
  /** Weight goal: 'lightest' or 'lighter' */
  weightGoal: 'lightest' | 'lighter' | 'specific';
}

/**
 * Current gear item with optimization metadata
 */
export interface GearItemForOptimization {
  id: string;
  name: string;
  brand: string | null;
  weightGrams: number;
  purchasePriceUsd: number | null;
  categoryId: string | null;
  categoryLabel: string | null;
  productTypeId: string | null;
}

/**
 * Current state analysis
 */
export interface CurrentStateAnalysis {
  /** Items in current loadout/inventory */
  items: GearItemForOptimization[];
  /** Total base weight in grams */
  totalWeightGrams: number;
  /** Heaviest items (top 5) */
  heaviestItems: GearItemForOptimization[];
  /** Categories with most weight */
  heaviestCategories: Array<{ category: string; weightGrams: number }>;
  /** Whether this is a loadout or inventory */
  source: 'loadout' | 'inventory';
  /** Loadout name if applicable */
  loadoutName?: string;
}

/**
 * Alternative product from catalog
 */
export interface CatalogAlternative {
  id: string;
  name: string;
  brand: string | null;
  weightGrams: number;
  priceUsd: number;
  productType: string | null;
  productTypeId: string | null;
  /** Which owned item this could replace */
  replacesItemId: string;
  replacesItemName: string;
  /** Weight savings in grams */
  weightSavingsGrams: number;
  /** Cost in USD */
  cost: number;
  /** Grams saved per dollar spent */
  gramsSavedPerDollar: number;
}

/**
 * Ranked optimization option
 */
export interface RankedOption {
  /** The alternative product */
  alternative: CatalogAlternative;
  /** Rank (1 = best) */
  rank: number;
  /** Score (higher = better) */
  score: number;
  /** Why this ranks well */
  reason: string;
}

/**
 * Final optimization recommendation
 */
export interface OptimizationResult {
  /** Parsed constraints */
  constraints: OptimizationConstraints;
  /** Current state analysis */
  currentState: CurrentStateAnalysis;
  /** Top recommendations (up to 5) */
  recommendations: RankedOption[];
  /** Total potential weight savings */
  totalPotentialSavingsGrams: number;
  /** Total cost for all recommendations */
  totalCostUsd: number;
  /** Whether budget allows all recommendations */
  withinBudget: boolean;
  /** Natural language summary */
  summary: string;
  /** Execution metadata */
  metadata: {
    executionId: string;
    durationMs: number;
    stepsDuration: Record<string, number>;
    warnings: string[];
  };
}

// ============================================================================
// Step 1: Parse Constraints
// ============================================================================

/**
 * Parse optimization constraints from natural language query
 */
function parseOptimizationConstraints(
  parsedQuery: ParsedQuery
): OptimizationConstraints {
  const { constraints } = parsedQuery;

  // Default budget if none specified
  let maxBudgetUsd = 500; // Default $500 budget
  let originalCurrency = 'USD';
  let originalBudget = 500;

  if (constraints.maxBudget) {
    maxBudgetUsd = normalizeToUsd(
      constraints.maxBudget.value,
      constraints.maxBudget.currency
    );
    originalCurrency = constraints.maxBudget.currency;
    originalBudget = constraints.maxBudget.value;
  }

  // Parse weight goal
  let targetWeightReductionGrams: number | undefined;
  if (constraints.maxWeight) {
    targetWeightReductionGrams = normalizeToGrams(
      constraints.maxWeight.value,
      constraints.maxWeight.unit
    );
  }

  // Determine weight goal type
  let weightGoal: OptimizationConstraints['weightGoal'] = 'lighter';
  if (parsedQuery.sortPreference === 'lightest') {
    weightGoal = 'lightest';
  } else if (targetWeightReductionGrams) {
    weightGoal = 'specific';
  }

  return {
    maxBudgetUsd,
    originalCurrency,
    originalBudget,
    targetWeightReductionGrams,
    focusCategories: constraints.category ? [constraints.category] : undefined,
    weightGoal,
  };
}

// ============================================================================
// Step 2: Analyze Current State
// ============================================================================

/**
 * Fetch and analyze current loadout or inventory
 */
async function analyzeCurrentState(
  supabase: SupabaseClient<Database>,
  userId: string,
  loadoutId?: string
): Promise<CurrentStateAnalysis> {
  let items: GearItemForOptimization[] = [];
  let source: 'loadout' | 'inventory' = 'inventory';
  let loadoutName: string | undefined;

  if (loadoutId) {
    // Fetch loadout and its items via loadout_items junction table
    const { data: loadout } = await supabase
      .from('loadouts')
      .select('id, name')
      .eq('id', loadoutId)
      .eq('user_id', userId)
      .single();

    if (loadout) {
      source = 'loadout';
      loadoutName = loadout.name;

      // Get loadout items via junction table
      const { data: loadoutItems } = await supabase
        .from('loadout_items')
        .select('gear_item_id')
        .eq('loadout_id', loadoutId);

      const itemIds = (loadoutItems || []).map((li) => li.gear_item_id);

      if (itemIds.length > 0) {
        const { data: gearItems } = await supabase
          .from('gear_items')
          .select(
            `
            id, name, brand, weight_grams, price_paid,
            category_id, product_type_id,
            categories!gear_items_category_id_fkey (label)
          `
          )
          .in('id', itemIds);

        items = (gearItems || []).map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          weightGrams: item.weight_grams || 0,
          purchasePriceUsd: item.price_paid,
          categoryId: item.category_id,
          categoryLabel:
            (item.categories as { label: string } | null)?.label || null,
          productTypeId: item.product_type_id,
        }));
      }
    }
  }

  // Fallback to inventory if no loadout or loadout empty
  if (items.length === 0) {
    source = 'inventory';
    const { data: gearItems } = await supabase
      .from('gear_items')
      .select(
        `
        id, name, brand, weight_grams, price_paid,
        category_id, product_type_id,
        categories!gear_items_category_id_fkey (label)
      `
      )
      .eq('user_id', userId)
      .eq('status', 'own');

    items = (gearItems || []).map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      weightGrams: item.weight_grams || 0,
      purchasePriceUsd: item.price_paid,
      categoryId: item.category_id,
      categoryLabel:
        (item.categories as { label: string } | null)?.label || null,
      productTypeId: item.product_type_id,
    }));
  }

  // Calculate totals
  const totalWeightGrams = items.reduce((sum, i) => sum + i.weightGrams, 0);

  // Find heaviest items
  const heaviestItems = [...items]
    .filter((i) => i.weightGrams > 0)
    .sort((a, b) => b.weightGrams - a.weightGrams)
    .slice(0, 5);

  // Group by category
  const categoryWeights = new Map<string, number>();
  for (const item of items) {
    const cat = item.categoryLabel || 'Uncategorized';
    categoryWeights.set(cat, (categoryWeights.get(cat) || 0) + item.weightGrams);
  }

  const heaviestCategories = Array.from(categoryWeights.entries())
    .map(([category, weightGrams]) => ({ category, weightGrams }))
    .sort((a, b) => b.weightGrams - a.weightGrams)
    .slice(0, 5);

  return {
    items,
    totalWeightGrams,
    heaviestItems,
    heaviestCategories,
    source,
    loadoutName,
  };
}

// ============================================================================
// Step 3: Find Alternatives
// ============================================================================

/**
 * Search catalog for lighter alternatives
 */
async function findAlternatives(
  supabase: SupabaseClient<Database>,
  currentState: CurrentStateAnalysis,
  constraints: OptimizationConstraints
): Promise<CatalogAlternative[]> {
  const alternatives: CatalogAlternative[] = [];

  // Focus on heaviest items for biggest impact
  const itemsToOptimize = currentState.heaviestItems.slice(0, 5);

  for (const item of itemsToOptimize) {
    // Skip items without product type (can't find alternatives)
    if (!item.productTypeId) continue;

    // Search catalog for lighter alternatives in same category
    const { data: catalogItems } = await supabase
      .from('catalog_products')
      .select('id, name, brand_external_id, weight_grams, price_usd, product_type, product_type_id')
      .eq('product_type_id', item.productTypeId)
      .gt('weight_grams', 0) // Filter invalid weights
      .lt('weight_grams', item.weightGrams) // Must be lighter
      .lte('price_usd', constraints.maxBudgetUsd) // Within budget
      .order('weight_grams', { ascending: true })
      .limit(3);

    if (catalogItems && catalogItems.length > 0) {
      for (const catalogItem of catalogItems) {
        const weightSavings = item.weightGrams - (catalogItem.weight_grams || 0);
        const cost = catalogItem.price_usd || 0;
        const gramsSavedPerDollar = cost > 0 ? weightSavings / cost : 0;

        alternatives.push({
          id: catalogItem.id,
          name: catalogItem.name,
          brand: catalogItem.brand_external_id,
          weightGrams: catalogItem.weight_grams || 0,
          priceUsd: cost,
          productType: catalogItem.product_type,
          productTypeId: catalogItem.product_type_id,
          replacesItemId: item.id,
          replacesItemName: item.name,
          weightSavingsGrams: weightSavings,
          cost,
          gramsSavedPerDollar,
        });
      }
    }
  }

  return alternatives;
}

// ============================================================================
// Step 4: Rank Options
// ============================================================================

/**
 * Rank alternatives by optimization value
 */
function rankOptions(
  alternatives: CatalogAlternative[],
  constraints: OptimizationConstraints
): RankedOption[] {
  // Score each alternative
  const scored = alternatives.map((alt) => {
    // Primary score: grams saved per dollar (ROI)
    let score = alt.gramsSavedPerDollar * 100;

    // Bonus for significant weight savings (>100g)
    if (alt.weightSavingsGrams > 100) {
      score += 20;
    }
    if (alt.weightSavingsGrams > 200) {
      score += 20;
    }

    // Penalty for very expensive items
    if (alt.cost > constraints.maxBudgetUsd * 0.5) {
      score -= 10;
    }

    // Build reason
    let reason = `Saves ${alt.weightSavingsGrams}g`;
    if (alt.gramsSavedPerDollar > 1) {
      reason += ` (${alt.gramsSavedPerDollar.toFixed(1)}g/$)`;
    }
    reason += ` for $${alt.cost.toFixed(0)}`;

    return { alternative: alt, score, reason };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Deduplicate by replaced item (keep best option per item)
  const seenReplacements = new Set<string>();
  const unique = scored.filter((opt) => {
    if (seenReplacements.has(opt.alternative.replacesItemId)) {
      return false;
    }
    seenReplacements.add(opt.alternative.replacesItemId);
    return true;
  });

  // Add ranks
  return unique.slice(0, 5).map((opt, index) => ({
    ...opt,
    rank: index + 1,
  }));
}

// ============================================================================
// Step 5: Synthesize Results
// ============================================================================

/**
 * Generate final optimization result with summary
 */
function synthesizeResult(
  constraints: OptimizationConstraints,
  currentState: CurrentStateAnalysis,
  recommendations: RankedOption[],
  executionId: string,
  durationMs: number,
  stepsDuration: Record<string, number>,
  warnings: string[],
  locale: 'en' | 'de'
): OptimizationResult {
  // Calculate totals
  const totalPotentialSavingsGrams = recommendations.reduce(
    (sum, r) => sum + r.alternative.weightSavingsGrams,
    0
  );
  const totalCostUsd = recommendations.reduce(
    (sum, r) => sum + r.alternative.cost,
    0
  );
  const withinBudget = totalCostUsd <= constraints.maxBudgetUsd;

  // Build summary
  const summaryParts: string[] = [];

  if (locale === 'de') {
    // German summary
    summaryParts.push(
      `Analyse deiner ${currentState.source === 'loadout' ? `Ausrüstungsliste "${currentState.loadoutName}"` : 'Ausrüstung'} mit einem Budget von ${constraints.originalBudget} ${constraints.originalCurrency}.`
    );
    summaryParts.push(
      `Aktuelles Basisgewicht: ${(currentState.totalWeightGrams / 1000).toFixed(2)}kg.`
    );

    if (recommendations.length > 0) {
      summaryParts.push(
        `${recommendations.length} Optimierungsmöglichkeiten gefunden mit potenziellem Gewichtsersparnis von ${(totalPotentialSavingsGrams / 1000).toFixed(2)}kg.`
      );
      summaryParts.push(
        `Gesamtkosten: $${totalCostUsd.toFixed(0)} ${withinBudget ? '(innerhalb des Budgets)' : '(über Budget)'}.`
      );
    } else {
      summaryParts.push(
        'Keine leichteren Alternativen innerhalb deines Budgets gefunden.'
      );
    }
  } else {
    // English summary
    summaryParts.push(
      `Analyzing your ${currentState.source === 'loadout' ? `loadout "${currentState.loadoutName}"` : 'inventory'} with a budget of ${constraints.originalBudget} ${constraints.originalCurrency}.`
    );
    summaryParts.push(
      `Current base weight: ${(currentState.totalWeightGrams / 1000).toFixed(2)}kg.`
    );

    if (recommendations.length > 0) {
      summaryParts.push(
        `Found ${recommendations.length} optimization opportunities with potential weight savings of ${(totalPotentialSavingsGrams / 1000).toFixed(2)}kg.`
      );
      summaryParts.push(
        `Total cost: $${totalCostUsd.toFixed(0)} ${withinBudget ? '(within budget)' : '(over budget)'}.`
      );
    } else {
      summaryParts.push(
        'No lighter alternatives found within your budget.'
      );
    }
  }

  return {
    constraints,
    currentState,
    recommendations,
    totalPotentialSavingsGrams,
    totalCostUsd,
    withinBudget,
    summary: summaryParts.join(' '),
    metadata: {
      executionId,
      durationMs,
      stepsDuration,
      warnings,
    },
  };
}

// ============================================================================
// Workflow Definition
// ============================================================================

/**
 * Budget optimization workflow definition
 */
export const budgetOptimizationWorkflow: WorkflowDefinition = {
  name: 'budget_optimization',
  description: 'Multi-step workflow for optimizing gear loadout under budget constraints',
  maxDurationMs: 15000, // 15 second timeout
  steps: [
    {
      id: 'parse_constraints',
      type: 'llm_reasoning',
      dependencies: [],
      config: {
        description: 'Extract budget, currency, weight goals from query',
      },
    },
    {
      id: 'analyze_current',
      type: 'tool_call',
      dependencies: ['parse_constraints'],
      config: {
        description: 'Get current loadout items with weights and prices',
        toolName: 'queryUserData',
      },
    },
    {
      id: 'find_alternatives',
      type: 'tool_call',
      dependencies: ['parse_constraints'],
      config: {
        description: 'Search catalog for lighter alternatives within budget',
        toolName: 'searchCatalog',
      },
    },
    {
      id: 'rank_options',
      type: 'llm_reasoning',
      dependencies: ['analyze_current', 'find_alternatives'],
      config: {
        description: 'Rank alternatives by weight savings per dollar spent',
      },
    },
    {
      id: 'synthesize',
      type: 'llm_reasoning',
      dependencies: ['rank_options'],
      config: {
        description: 'Generate actionable recommendations with ROI analysis',
      },
    },
  ],
};

// ============================================================================
// Workflow Executor
// ============================================================================

/**
 * Execute the budget optimization workflow
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param input - Budget optimization input
 * @param onProgress - Optional callback for progress updates
 * @returns Optimization result
 *
 * @example
 * ```typescript
 * const result = await executeBudgetOptimizationWorkflow(
 *   supabase,
 *   userId,
 *   { query: 'Optimize my loadout under €300 budget for weight' },
 *   (step, message) => console.log(`${step}: ${message}`)
 * );
 * ```
 */
export async function executeBudgetOptimizationWorkflow(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: BudgetOptimizationInput,
  onProgress?: (step: string, message: string) => void
): Promise<OptimizationResult> {
  const executionId = crypto.randomUUID();
  const getElapsed = createTimer();
  const stepsDuration: Record<string, number> = {};
  const warnings: string[] = [];
  const locale = input.locale || 'en';

  logInfo('Starting budget optimization workflow', {
    userId,
    workflowId: executionId,
    metadata: { query: input.query.substring(0, 100) },
  });

  try {
    // Step 1: Parse Constraints
    onProgress?.('parse_constraints', 'Analyzing your optimization request...');
    const parseTimer = createTimer();

    const parsedQuery = await traceWorkflowStep(
      executionId,
      'parse_constraints',
      () => Promise.resolve(parseQuery(input.query)),
      { userId }
    ).then((r) => r.result);

    const constraints = parseOptimizationConstraints(parsedQuery);
    stepsDuration.parse_constraints = parseTimer();

    logDebug('Constraints parsed', {
      userId,
      metadata: { constraints },
    });

    // Step 2: Analyze Current State
    onProgress?.('analyze_current', 'Fetching your gear data...');
    const analyzeTimer = createTimer();

    const currentState = await traceWorkflowStep(
      executionId,
      'analyze_current',
      () => analyzeCurrentState(supabase, userId, input.loadoutId),
      { userId }
    ).then((r) => r.result);

    stepsDuration.analyze_current = analyzeTimer();

    if (currentState.items.length === 0) {
      warnings.push('No gear items found');
    }

    logDebug('Current state analyzed', {
      userId,
      metadata: {
        itemCount: currentState.items.length,
        totalWeight: currentState.totalWeightGrams,
      },
    });

    // Step 3: Find Alternatives
    onProgress?.('find_alternatives', 'Searching for lighter alternatives...');
    const searchTimer = createTimer();

    const alternatives = await traceWorkflowStep(
      executionId,
      'find_alternatives',
      () => findAlternatives(supabase, currentState, constraints),
      { userId }
    ).then((r) => r.result);

    stepsDuration.find_alternatives = searchTimer();

    if (alternatives.length === 0) {
      warnings.push('No lighter alternatives found in catalog');
    }

    logDebug('Alternatives found', {
      userId,
      metadata: { count: alternatives.length },
    });

    // Step 4: Rank Options
    onProgress?.('rank_options', 'Ranking optimization options...');
    const rankTimer = createTimer();

    const recommendations = await traceWorkflowStep(
      executionId,
      'rank_options',
      () => Promise.resolve(rankOptions(alternatives, constraints)),
      { userId }
    ).then((r) => r.result);

    stepsDuration.rank_options = rankTimer();

    // Step 5: Synthesize Results
    onProgress?.('synthesize', 'Preparing recommendations...');
    const synthesisTimer = createTimer();

    const result = synthesizeResult(
      constraints,
      currentState,
      recommendations,
      executionId,
      getElapsed(),
      stepsDuration,
      warnings,
      locale
    );

    stepsDuration.synthesize = synthesisTimer();

    logInfo('Budget optimization workflow completed', {
      userId,
      workflowId: executionId,
      metadata: {
        totalDurationMs: getElapsed(),
        recommendationsCount: recommendations.length,
        totalSavingsGrams: result.totalPotentialSavingsGrams,
        totalCostUsd: result.totalCostUsd,
      },
    });

    // Track execution in database
    await trackWorkflowExecution(
      supabase,
      executionId,
      userId,
      'completed',
      stepsDuration
    );

    return result;
  } catch (error) {
    const durationMs = getElapsed();

    logError('Budget optimization workflow failed', error, {
      userId,
      workflowId: executionId,
      metadata: { durationMs },
    });

    // Track failed execution
    await trackWorkflowExecution(
      supabase,
      executionId,
      userId,
      'failed',
      stepsDuration,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw error;
  }
}

/**
 * Track workflow execution in database
 */
async function trackWorkflowExecution(
  supabase: SupabaseClient<Database>,
  executionId: string,
  userId: string,
  status: 'completed' | 'failed' | 'timeout',
  stepResults: Record<string, number>,
  errorMessage?: string
): Promise<void> {
  try {
    const client = supabase as unknown as AnySupabaseClient;
    await client.from('workflow_executions').insert({
      id: executionId,
      user_id: userId,
      workflow_name: 'budget_optimization',
      status,
      step_results: stepResults,
      error_message: errorMessage ?? null,
      started_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
    });
  } catch (error) {
    // Log but don't fail the workflow
    logError('Failed to track workflow execution', error, {
      userId,
      workflowId: executionId,
    });
  }
}

/**
 * Check if a query should trigger the budget optimization workflow
 *
 * @param query - User's natural language query
 * @returns true if the query is a budget optimization query
 */
export function shouldTriggerBudgetOptimization(query: string): boolean {
  const parsed = parseQuery(query);
  return isComplexOptimizationQuery(parsed);
}

// ============================================================================
// Exports
// ============================================================================

export {
  parseOptimizationConstraints,
  analyzeCurrentState,
  findAlternatives,
  rankOptions,
  synthesizeResult,
};
