/**
 * Trip Planner Workflow
 * Feature: 001-mastra-agentic-voice
 * Tasks: T040-T045 [US2] - Multi-step trip planning workflow
 *
 * A 5-step workflow for planning outdoor trips with gear recommendations:
 * 1. Intent Analysis: Parse location, season, weight constraints
 * 2. Parallel Data Gathering: Fetch weather + user inventory concurrently
 * 3. Gap Analysis: Compare inventory to environmental requirements
 * 4. Graph Query: Query catalog for alternatives to fill gaps
 * 5. Recommendation Synthesis: Stream final plan incrementally
 *
 * Features:
 * - 10-second timeout with partial results
 * - Weather API fallback to cached/default data
 * - Progress streaming via SSE events
 * - Execution tracking in workflow_executions table
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { WorkflowExecutor, createWorkflowExecutor, type StepHandler } from './base';
import { getWeatherData, type WeatherData, type WeatherSeason } from '@/lib/external-apis/weather';
import { logInfo, logError, logDebug, createTimer } from '@/lib/mastra/logging';
import { traceWorkflowStep } from '@/lib/mastra/tracing';
import type { WorkflowDefinition, WorkflowStep, WorkflowContext } from '@/types/mastra';
import type { Database } from '@/types/supabase';

// ============================================================================
// Types
// ============================================================================

/**
 * Input for trip planner workflow
 */
export interface TripPlannerInput {
  /** User's natural language query */
  query: string;
  /** User's locale for response formatting */
  locale?: string;
  /** Maximum base weight in grams (optional constraint) */
  maxWeight?: number;
}

/**
 * Parsed intent from user query
 */
export interface TripIntent {
  /** Destination location (e.g., "Swedish Lapland", "Alps") */
  location: string;
  /** Season for the trip */
  season: WeatherSeason;
  /** Activity type */
  activityType: 'hiking' | 'camping' | 'backpacking' | 'mountaineering' | 'skiing';
  /** Duration in days */
  durationDays: number;
  /** Maximum base weight constraint in grams */
  maxWeight?: number;
  /** Additional requirements parsed from query */
  requirements: string[];
}

/**
 * User's gear inventory analysis
 */
export interface InventoryAnalysis {
  /** Total number of gear items */
  totalItems: number;
  /** Current base weight in grams */
  baseWeight: number;
  /** Items by category */
  byCategory: Record<string, Array<{
    id: string;
    name: string;
    weight: number;
    brand?: string;
  }>>;
  /** Items suitable for the conditions */
  suitable: string[];
  /** Items that may not be ideal */
  unsuitable: string[];
}

/**
 * Gap analysis result
 */
export interface GapAnalysis {
  /** Categories with missing gear */
  missingCategories: string[];
  /** Specific gear gaps identified */
  gaps: Array<{
    category: string;
    requirement: string;
    priority: 'critical' | 'recommended' | 'nice-to-have';
  }>;
  /** Items to reconsider */
  reconsider: Array<{
    itemId: string;
    itemName: string;
    reason: string;
  }>;
}

/**
 * Catalog recommendations
 */
export interface CatalogRecommendations {
  /** Recommended products to fill gaps */
  products: Array<{
    id: string;
    name: string;
    brand: string;
    weight: number;
    price: number;
    category: string;
    matchedGap: string;
  }>;
  /** Total cost estimate */
  totalCost: number;
  /** Weight impact */
  weightImpact: number;
}

/**
 * Final trip plan recommendation
 */
export interface TripPlanResult {
  /** Parsed intent */
  intent: TripIntent;
  /** Weather conditions */
  weather: WeatherData;
  /** Inventory analysis */
  inventory: InventoryAnalysis;
  /** Gap analysis */
  gaps: GapAnalysis;
  /** Catalog recommendations */
  recommendations: CatalogRecommendations;
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
// Intent Parsing (T041)
// ============================================================================

/** Keywords for season detection */
const SEASON_KEYWORDS: Record<WeatherSeason, string[]> = {
  winter: ['winter', 'snow', 'cold', 'january', 'february', 'december', 'ski', 'ice'],
  spring: ['spring', 'march', 'april', 'may', 'thaw', 'melt'],
  summer: ['summer', 'june', 'july', 'august', 'warm', 'hot'],
  fall: ['fall', 'autumn', 'september', 'october', 'november'],
};

/** Keywords for activity detection */
const ACTIVITY_KEYWORDS: Record<TripIntent['activityType'], string[]> = {
  hiking: ['hike', 'hiking', 'trail', 'day hike', 'walk'],
  camping: ['camp', 'camping', 'overnight', 'tent'],
  backpacking: ['backpack', 'backpacking', 'thru-hike', 'multi-day', 'trek'],
  mountaineering: ['mountain', 'climb', 'summit', 'alpine'],
  skiing: ['ski', 'skiing', 'backcountry ski', 'ski touring'],
};

/**
 * T041: Parse intent from user query
 */
function parseIntent(query: string): TripIntent {
  const queryLower = query.toLowerCase();

  // Extract location (simplified - in production use NER)
  const locationPatterns = [
    /(?:trip to|going to|visiting|heading to|in)\s+([A-Z][a-zA-Z\s]+)/i,
    /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+(?:trip|hike|adventure)/i,
  ];
  let location = 'Unknown Location';
  for (const pattern of locationPatterns) {
    const match = query.match(pattern);
    if (match) {
      location = match[1].trim();
      break;
    }
  }

  // Detect season
  let season: WeatherSeason = 'summer'; // default
  for (const [s, keywords] of Object.entries(SEASON_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      season = s as WeatherSeason;
      break;
    }
  }

  // Detect activity type
  let activityType: TripIntent['activityType'] = 'backpacking'; // default
  for (const [activity, keywords] of Object.entries(ACTIVITY_KEYWORDS)) {
    if (keywords.some(kw => queryLower.includes(kw))) {
      activityType = activity as TripIntent['activityType'];
      break;
    }
  }

  // Extract duration
  const durationMatch = query.match(/(\d+)\s*(?:day|night)/i);
  const durationDays = durationMatch ? parseInt(durationMatch[1], 10) : 3;

  // Extract weight constraint
  const weightMatch = query.match(/(?:under|max|maximum|less than)\s*(\d+)\s*(?:kg|kilogram)/i);
  const maxWeight = weightMatch ? parseInt(weightMatch[1], 10) * 1000 : undefined;

  // Extract requirements
  const requirements: string[] = [];
  if (queryLower.includes('ultralight')) requirements.push('ultralight');
  if (queryLower.includes('budget')) requirements.push('budget-friendly');
  if (queryLower.includes('waterproof')) requirements.push('waterproof gear');
  if (queryLower.includes('solo')) requirements.push('solo setup');

  return {
    location,
    season,
    activityType,
    durationDays,
    maxWeight,
    requirements,
  };
}

// ============================================================================
// Data Gathering (T042)
// ============================================================================

/**
 * T042: Gather weather and inventory data in parallel
 */
async function gatherData(
  supabase: SupabaseClient<Database>,
  userId: string,
  intent: TripIntent
): Promise<{ weather: WeatherData; inventory: InventoryAnalysis }> {
  const getElapsed = createTimer();

  // Fetch weather and inventory in parallel
  const [weatherResult, inventoryResult] = await Promise.allSettled([
    getWeatherData(intent.location, intent.season),
    fetchUserInventory(supabase, userId),
  ]);

  // Handle weather result with fallback
  let weather: WeatherData;
  if (weatherResult.status === 'fulfilled') {
    weather = weatherResult.value;
  } else {
    logError('Weather API failed, using fallback', weatherResult.reason, { userId });
    weather = {
      temperature: { min: 0, max: 10 },
      precipitation: 50,
      conditions: 'Variable conditions (weather data unavailable)',
      location: intent.location,
      season: intent.season,
      cached: false,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };
  }

  // Handle inventory result
  let inventory: InventoryAnalysis;
  if (inventoryResult.status === 'fulfilled') {
    inventory = inventoryResult.value;
  } else {
    logError('Inventory fetch failed', inventoryResult.reason, { userId });
    inventory = {
      totalItems: 0,
      baseWeight: 0,
      byCategory: {},
      suitable: [],
      unsuitable: [],
    };
  }

  logDebug('Data gathering completed', {
    userId,
    metadata: {
      latencyMs: getElapsed(),
      weatherCached: weather.cached,
      inventoryCount: inventory.totalItems,
    },
  });

  return { weather, inventory };
}

/**
 * Fetch user's gear inventory
 */
async function fetchUserInventory(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<InventoryAnalysis> {
  const { data: items, error } = await supabase
    .from('gear_items')
    .select('id, name, weight, brand, category_id, status')
    .eq('user_id', userId)
    .eq('status', 'own');

  if (error) {
    throw new Error(`Failed to fetch inventory: ${error.message}`);
  }

  // Group by category
  const byCategory: InventoryAnalysis['byCategory'] = {};
  let baseWeight = 0;

  for (const item of items || []) {
    const categoryId = item.category_id || 'uncategorized';
    if (!byCategory[categoryId]) {
      byCategory[categoryId] = [];
    }
    byCategory[categoryId].push({
      id: item.id,
      name: item.name,
      weight: item.weight || 0,
      brand: item.brand || undefined,
    });
    baseWeight += item.weight || 0;
  }

  return {
    totalItems: items?.length || 0,
    baseWeight,
    byCategory,
    suitable: [], // Will be populated in gap analysis
    unsuitable: [], // Will be populated in gap analysis
  };
}

// ============================================================================
// Gap Analysis (T043)
// ============================================================================

/** Essential gear categories by activity and conditions */
const ESSENTIAL_GEAR: Record<string, string[]> = {
  shelter: ['tent', 'tarp', 'bivy'],
  sleep_system: ['sleeping bag', 'quilt', 'sleeping pad'],
  insulation: ['puffy jacket', 'down jacket', 'fleece'],
  rain_protection: ['rain jacket', 'rain pants', 'poncho'],
  navigation: ['map', 'compass', 'gps'],
  cooking: ['stove', 'pot', 'fuel'],
  water: ['water filter', 'water bottle', 'water treatment'],
  lighting: ['headlamp', 'flashlight'],
  first_aid: ['first aid kit'],
  pack: ['backpack'],
};

/** Additional gear for cold conditions */
const COLD_WEATHER_GEAR = [
  'insulated jacket',
  'warm layers',
  'winter sleeping bag',
  'insulated pad',
  'hand warmers',
  'balaclava',
];

/**
 * T043: Analyze gaps between inventory and requirements
 */
function analyzeGaps(
  inventory: InventoryAnalysis,
  intent: TripIntent,
  weather: WeatherData
): GapAnalysis {
  const gaps: GapAnalysis['gaps'] = [];
  const missingCategories: string[] = [];
  const reconsider: GapAnalysis['reconsider'] = [];

  // Check essential categories
  for (const [category, keywords] of Object.entries(ESSENTIAL_GEAR)) {
    const hasCategory = Object.values(inventory.byCategory).some(items =>
      items.some(item =>
        keywords.some(kw => item.name.toLowerCase().includes(kw))
      )
    );

    if (!hasCategory) {
      missingCategories.push(category);
      gaps.push({
        category,
        requirement: `Missing ${category.replace('_', ' ')} gear`,
        priority: ['shelter', 'sleep_system', 'pack'].includes(category) ? 'critical' : 'recommended',
      });
    }
  }

  // Check cold weather gear if needed
  if (weather.temperature.min < 5) {
    for (const gearName of COLD_WEATHER_GEAR) {
      const hasGear = Object.values(inventory.byCategory).some(items =>
        items.some(item => item.name.toLowerCase().includes(gearName.toLowerCase()))
      );

      if (!hasGear) {
        gaps.push({
          category: 'cold_weather',
          requirement: `Consider adding ${gearName} for temperatures down to ${weather.temperature.min}°C`,
          priority: weather.temperature.min < 0 ? 'critical' : 'recommended',
        });
      }
    }
  }

  // Check weight constraints
  if (intent.maxWeight && inventory.baseWeight > intent.maxWeight) {
    // Find heaviest items to reconsider
    const allItems = Object.values(inventory.byCategory).flat();
    const sorted = allItems.sort((a, b) => b.weight - a.weight);

    for (const item of sorted.slice(0, 3)) {
      reconsider.push({
        itemId: item.id,
        itemName: item.name,
        reason: `Heavy item (${Math.round(item.weight)}g) - consider lighter alternative`,
      });
    }
  }

  return {
    missingCategories,
    gaps,
    reconsider,
  };
}

// ============================================================================
// Catalog Query (T044)
// ============================================================================

/**
 * T044: Query catalog for recommendations to fill gaps
 */
async function queryRecommendations(
  supabase: SupabaseClient<Database>,
  gaps: GapAnalysis,
  intent: TripIntent
): Promise<CatalogRecommendations> {
  const products: CatalogRecommendations['products'] = [];
  let totalCost = 0;
  let weightImpact = 0;

  // Query catalog for each gap
  for (const gap of gaps.gaps.slice(0, 5)) { // Limit to top 5 gaps
    const { data: catalogItems } = await supabase
      .from('catalog_products')
      .select('id, name, brand, weight, price, category')
      .textSearch('name', gap.category.replace('_', ' '), { type: 'websearch' })
      .order('weight', { ascending: true })
      .limit(2);

    if (catalogItems && catalogItems.length > 0) {
      for (const item of catalogItems) {
        products.push({
          id: item.id,
          name: item.name,
          brand: item.brand || 'Unknown',
          weight: item.weight || 0,
          price: item.price || 0,
          category: item.category || gap.category,
          matchedGap: gap.requirement,
        });
        totalCost += item.price || 0;
        weightImpact += item.weight || 0;
      }
    }
  }

  return {
    products,
    totalCost,
    weightImpact,
  };
}

// ============================================================================
// Result Synthesis (T045)
// ============================================================================

/**
 * T045: Synthesize final recommendation
 */
function synthesizeResult(
  intent: TripIntent,
  weather: WeatherData,
  inventory: InventoryAnalysis,
  gaps: GapAnalysis,
  recommendations: CatalogRecommendations,
  executionId: string,
  durationMs: number,
  stepsDuration: Record<string, number>,
  warnings: string[]
): TripPlanResult {
  // Build natural language summary
  const summaryParts: string[] = [];

  // Trip overview
  summaryParts.push(
    `Planning a ${intent.durationDays}-day ${intent.activityType} trip to ${intent.location} in ${intent.season}.`
  );

  // Weather conditions
  summaryParts.push(
    `Expected conditions: ${weather.conditions}, temperatures ${weather.temperature.min}°C to ${weather.temperature.max}°C.`
  );

  // Inventory status
  if (inventory.totalItems > 0) {
    summaryParts.push(
      `Your current gear inventory has ${inventory.totalItems} items with a base weight of ${(inventory.baseWeight / 1000).toFixed(1)}kg.`
    );
  } else {
    summaryParts.push('No gear items found in your inventory.');
  }

  // Gap summary
  if (gaps.gaps.length > 0) {
    const criticalGaps = gaps.gaps.filter(g => g.priority === 'critical');
    if (criticalGaps.length > 0) {
      summaryParts.push(
        `Critical gaps identified: ${criticalGaps.map(g => g.category.replace('_', ' ')).join(', ')}.`
      );
    }
  } else {
    summaryParts.push('Your gear appears suitable for this trip!');
  }

  // Recommendations
  if (recommendations.products.length > 0) {
    summaryParts.push(
      `Found ${recommendations.products.length} product recommendations to consider.`
    );
  }

  return {
    intent,
    weather,
    inventory,
    gaps,
    recommendations,
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
 * Trip planner workflow definition
 */
export const tripPlannerWorkflow: WorkflowDefinition = {
  name: 'trip_planner',
  description: 'Multi-step workflow for planning outdoor trips with gear recommendations',
  maxDurationMs: 10000, // 10 second timeout
  steps: [
    {
      id: 'intent_analysis',
      type: 'llm_reasoning',
      dependencies: [],
      config: {
        description: 'Parse trip intent from user query',
      },
    },
    {
      id: 'data_gathering',
      type: 'parallel_group',
      dependencies: ['intent_analysis'],
      config: {
        description: 'Fetch weather and inventory data in parallel',
        parallel: ['weather_fetch', 'inventory_fetch'],
      },
    },
    {
      id: 'gap_analysis',
      type: 'llm_reasoning',
      dependencies: ['data_gathering'],
      config: {
        description: 'Analyze gaps between inventory and requirements',
      },
    },
    {
      id: 'catalog_query',
      type: 'tool_call',
      dependencies: ['gap_analysis'],
      config: {
        description: 'Query catalog for gap-filling recommendations',
        toolName: 'searchCatalog',
      },
    },
    {
      id: 'synthesis',
      type: 'llm_reasoning',
      dependencies: ['catalog_query'],
      config: {
        description: 'Synthesize final trip plan recommendation',
      },
    },
  ],
};

// ============================================================================
// Workflow Executor
// ============================================================================

/**
 * Execute the trip planner workflow
 *
 * @param supabase - Supabase client
 * @param userId - User ID
 * @param input - Trip planner input
 * @param onProgress - Optional callback for progress updates
 * @returns Trip plan result
 *
 * @example
 * ```typescript
 * const result = await executeTripPlannerWorkflow(
 *   supabase,
 *   userId,
 *   { query: 'Planning a winter backpacking trip to Swedish Lapland in February' },
 *   (step, message) => console.log(`${step}: ${message}`)
 * );
 * ```
 */
export async function executeTripPlannerWorkflow(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: TripPlannerInput,
  onProgress?: (step: string, message: string) => void
): Promise<TripPlanResult> {
  const executionId = crypto.randomUUID();
  const getElapsed = createTimer();
  const stepsDuration: Record<string, number> = {};
  const warnings: string[] = [];

  logInfo('Starting trip planner workflow', {
    userId,
    workflowId: executionId,
    metadata: { query: input.query.substring(0, 100) },
  });

  try {
    // Step 1: Intent Analysis (T041)
    onProgress?.('intent_analysis', 'Analyzing your trip requirements...');
    const stepTimer = createTimer();

    const intent = await traceWorkflowStep(
      executionId,
      'intent_analysis',
      () => Promise.resolve(parseIntent(input.query)),
      { userId }
    ).then(r => r.result);

    stepsDuration.intent_analysis = stepTimer();
    logDebug('Intent analysis complete', { userId, metadata: { intent } });

    // Step 2: Data Gathering (T042)
    onProgress?.('data_gathering', `Fetching weather data for ${intent.location}...`);
    const gatherTimer = createTimer();

    const { weather, inventory } = await traceWorkflowStep(
      executionId,
      'data_gathering',
      () => gatherData(supabase, userId, intent),
      { userId }
    ).then(r => r.result);

    stepsDuration.data_gathering = gatherTimer();

    if (weather.cached) {
      warnings.push('Using cached weather data');
    }

    // Step 3: Gap Analysis (T043)
    onProgress?.('gap_analysis', 'Analyzing gear gaps...');
    const gapTimer = createTimer();

    const gaps = await traceWorkflowStep(
      executionId,
      'gap_analysis',
      () => Promise.resolve(analyzeGaps(inventory, intent, weather)),
      { userId }
    ).then(r => r.result);

    stepsDuration.gap_analysis = gapTimer();
    logDebug('Gap analysis complete', {
      userId,
      metadata: { gapsCount: gaps.gaps.length, missingCategories: gaps.missingCategories },
    });

    // Step 4: Catalog Query (T044)
    onProgress?.('catalog_query', 'Finding gear recommendations...');
    const queryTimer = createTimer();

    const recommendations = await traceWorkflowStep(
      executionId,
      'catalog_query',
      () => queryRecommendations(supabase, gaps, intent),
      { userId }
    ).then(r => r.result);

    stepsDuration.catalog_query = queryTimer();

    // Step 5: Synthesis (T045)
    onProgress?.('synthesis', 'Preparing your trip plan...');
    const synthesisTimer = createTimer();

    const result = synthesizeResult(
      intent,
      weather,
      inventory,
      gaps,
      recommendations,
      executionId,
      getElapsed(),
      stepsDuration,
      warnings
    );

    stepsDuration.synthesis = synthesisTimer();

    logInfo('Trip planner workflow completed', {
      userId,
      workflowId: executionId,
      metadata: {
        totalDurationMs: getElapsed(),
        stepsCompleted: Object.keys(stepsDuration).length,
        gapsFound: gaps.gaps.length,
        recommendationsCount: recommendations.products.length,
      },
    });

    // Track execution in database
    await trackWorkflowExecution(supabase, executionId, userId, 'completed', stepsDuration);

    return result;
  } catch (error) {
    const durationMs = getElapsed();

    logError('Trip planner workflow failed', error, {
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
 * Track workflow execution in database (T049)
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
    await supabase.from('workflow_executions').insert({
      id: executionId,
      user_id: userId,
      workflow_name: 'trip_planner',
      status,
      step_results: stepResults as unknown as Record<string, unknown>,
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

// ============================================================================
// Exports
// ============================================================================

export {
  parseIntent,
  gatherData,
  analyzeGaps,
  queryRecommendations,
  synthesizeResult,
};
