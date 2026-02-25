/**
 * Intent Router - Speed Layer
 * Feature: 060-ai-agent-evolution
 *
 * Uses Gemini 2.5 Flash via Vercel AI Gateway to classify user intent
 * in <500ms. Based on intent, determines:
 * 1. What data needs to be pre-fetched
 * 2. Whether a fast-path (no Sonnet) answer is possible
 * 3. Which composite tools might be needed
 *
 * @see specs/060-ai-agent-evolution/analysis.md
 */

import { generateObject } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { logDebug, logInfo, logWarn, createTimer } from './logging';
import { INTENT_ROUTER_CONFIG } from './config';

// =============================================================================
// Types
// =============================================================================

/** Intent categories for user queries */
export type IntentType =
  | 'simple_fact'          // Countable/directly answerable ("How many tents?")
  | 'inventory_query'      // Filter/search in inventory ("Show my rain jackets")
  | 'loadout_analysis'     // Pack list analysis ("What's missing?", "How to optimize?")
  | 'gear_comparison'      // Product comparison ("Compare A vs B")
  | 'suitability_check'    // Suitability check ("Is my sleeping bag warm enough?")
  | 'weight_optimization'  // Weight optimization ("Lightest rain gear combo?")
  | 'recommendation'       // Recommendations ("What should I bring for X?")
  | 'general_knowledge'    // General outdoor knowledge ("What is DCF?")
  | 'complex';             // Everything else → full agent pipeline

/** Data requirements for pre-fetching */
export interface DataRequirement {
  type: 'inventory_stats'       // get_inventory_intelligence RPC
    | 'inventory_category'      // count_items_by_category RPC
    | 'loadout_analysis'        // analyze_loadout RPC
    | 'gear_items_filtered'     // Filtered gear items query
    | 'category_tree'           // Full category hierarchy
    | 'geargraph_products'      // GearGraph product lookup
    | 'web_search';             // Web search for conditions
  params?: Record<string, unknown>;
}

/** Query complexity for model routing */
export type QueryComplexity = 'simple' | 'complex';

/** Intent classification result */
export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  canAnswerDirectly: boolean;
  /** Query complexity for model routing (simple → Haiku, complex → Sonnet) */
  queryComplexity: QueryComplexity;
  dataRequirements: DataRequirement[];
  extractedEntities: {
    categories?: string[];
    brands?: string[];
    productNames?: string[];
    destination?: string;
    season?: string;
    criteria?: string[];
    loadoutRelated?: boolean;
  };
  /** Pre-formatted answer for simple facts (filled by pre-fetch) */
  directAnswer?: string;
}

// =============================================================================
// Configuration
// =============================================================================

const ROUTER_MODEL = process.env.INTENT_ROUTER_MODEL || 'google/gemini-2.5-flash';
const ROUTER_TIMEOUT_MS = INTENT_ROUTER_CONFIG.TIMEOUT_MS;

// Intent classification schema for structured output
const IntentSchema = z.object({
  intent: z.enum([
    'simple_fact',
    'inventory_query',
    'loadout_analysis',
    'gear_comparison',
    'suitability_check',
    'weight_optimization',
    'recommendation',
    'general_knowledge',
    'complex',
  ]),
  confidence: z.number().min(0).max(1),
  canAnswerDirectly: z.boolean(),
  categories: z.array(z.string()).default([]),
  brands: z.array(z.string()).default([]),
  productNames: z.array(z.string()).default([]),
  destination: z.string().optional(),
  season: z.string().optional(),
  criteria: z.array(z.string()).default([]),
  loadoutRelated: z.boolean().default(false),
});

// Lazy gateway instance
let routerGateway: ReturnType<typeof createGateway> | null = null;

function getRouterGateway() {
  if (!routerGateway) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) {
      throw new Error('AI_GATEWAY_API_KEY is required for Intent Router');
    }
    routerGateway = createGateway({ apiKey });
  }
  return routerGateway;
}

// =============================================================================
// Classification Prompt
// =============================================================================

const CLASSIFICATION_PROMPT = `You are an intent classifier for a backpacking gear management app. Classify the user's question into one of these categories:

INTENTS:
- simple_fact: Simple countable/factual questions about user's own gear. Examples: "How many tents do I have?", "What does my pack weigh?", "How many items are in my inventory?"
- inventory_query: Search/filter questions about user's inventory. Examples: "Show my rain jackets", "Do I have a stove for cold weather?", "Which of my sleeping bags is the warmest?"
- loadout_analysis: Questions about a specific pack list / loadout. Examples: "What's missing in this list?", "How can I optimize this loadout?", "What can I improve?", "Is this loadout ready for winter?"
- gear_comparison: Comparing specific products. Examples: "Compare Nallo 2 vs X-Mid 2", "What's better, Osprey Exos or Granite Gear Crown?"
- suitability_check: Checking if gear is suitable for specific conditions. Examples: "Is my sleeping bag warm enough for Norway in September?", "Can my stove handle -20°C?"
- weight_optimization: Finding the lightest combination. Examples: "What's my lightest rain gear combo?", "How can I reduce my pack weight?", "Which items are the heaviest?"
- recommendation: Asking for gear suggestions. Examples: "What should I bring for a winter hike?", "Recommend a good ultralight tent"
- general_knowledge: General outdoor/gear knowledge questions. Examples: "What is DCF?", "What's the difference between down and synthetic?", "What is base weight?"
- complex: Multi-step questions that don't fit other categories.

RULES:
- canAnswerDirectly = true ONLY for simple_fact where a single DB count/lookup suffices
- Extract specific categories mentioned (tents, sleeping bags, jackets, etc.)
- Extract brand names and product names if mentioned
- Extract destination and season if mentioned
- Set loadoutRelated = true if the question is about "this loadout", "this pack list", "diese Packliste" etc.
- Handle both English and German queries`;

// =============================================================================
// Complexity Derivation
// =============================================================================

/**
 * Derive query complexity from classified intent.
 *
 * Simple intents (→ Haiku, 10x cheaper, 5x faster):
 *   - simple_fact: countable lookups ("How many tents?")
 *   - inventory_query: filter/search in inventory
 *   - general_knowledge: factual outdoor knowledge
 *
 * Complex intents (→ Sonnet, full reasoning):
 *   - loadout_analysis, gear_comparison, suitability_check,
 *     weight_optimization, recommendation, complex
 */
function deriveQueryComplexity(intent: IntentType): QueryComplexity {
  switch (intent) {
    case 'simple_fact':
    case 'inventory_query':
    case 'general_knowledge':
      return 'simple';
    default:
      return 'complex';
  }
}

// =============================================================================
// Main Router Function
// =============================================================================

/**
 * Classify user intent using Gemini Flash for fast routing.
 *
 * @param message - The user's message
 * @param currentScreen - Current UI screen (inventory, loadout-detail, etc.)
 * @param currentLoadoutId - Active loadout ID if on loadout page
 * @returns Intent classification with data requirements
 */
export async function classifyIntent(
  message: string,
  currentScreen?: string,
  currentLoadoutId?: string
): Promise<IntentClassification> {
  const getElapsed = createTimer();

  try {
    const gateway = getRouterGateway();

    // Add screen context to help classification
    let contextHint = '';
    if (currentScreen === 'loadout-detail' && currentLoadoutId) {
      contextHint = '\n[Context: User is viewing a specific loadout/pack list page]';
    } else if (currentScreen === 'inventory') {
      contextHint = '\n[Context: User is viewing their gear inventory]';
    }

    const result = await Promise.race([
      generateObject({
        model: gateway(ROUTER_MODEL),
        schema: IntentSchema,
        system: CLASSIFICATION_PROMPT,
        prompt: `Classify this user message:${contextHint}\n\n"${message}"`,
        temperature: 0,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Intent classification timeout')), ROUTER_TIMEOUT_MS)
      ),
    ]);

    const classification = result.object;

    // Build data requirements based on intent
    const dataRequirements = buildDataRequirements(
      classification.intent as IntentType,
      classification,
      currentLoadoutId
    );

    const classifiedIntent = classification.intent as IntentType;
    const queryComplexity = deriveQueryComplexity(classifiedIntent);

    const intentResult: IntentClassification = {
      intent: classifiedIntent,
      confidence: classification.confidence,
      canAnswerDirectly: classification.canAnswerDirectly,
      queryComplexity,
      dataRequirements,
      extractedEntities: {
        categories: classification.categories,
        brands: classification.brands,
        productNames: classification.productNames,
        destination: classification.destination,
        season: classification.season,
        criteria: classification.criteria,
        loadoutRelated: classification.loadoutRelated,
      },
    };

    logInfo('Intent classified', {
      metadata: {
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        canAnswerDirectly: intentResult.canAnswerDirectly,
        queryComplexity: intentResult.queryComplexity,
        dataRequirements: dataRequirements.length,
        latencyMs: getElapsed(),
      },
    });

    return intentResult;
  } catch (error) {
    logWarn('Intent classification failed, falling back to complex', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });

    // Fallback: treat as complex query → full agent pipeline
    return {
      intent: 'complex',
      confidence: 0,
      canAnswerDirectly: false,
      queryComplexity: 'complex',
      dataRequirements: [],
      extractedEntities: {},
    };
  }
}

// =============================================================================
// Data Requirement Builder
// =============================================================================

/**
 * Determine what data to pre-fetch based on classified intent
 */
function buildDataRequirements(
  intent: IntentType,
  classification: z.infer<typeof IntentSchema>,
  currentLoadoutId?: string
): DataRequirement[] {
  const requirements: DataRequirement[] = [];

  switch (intent) {
    case 'simple_fact':
      if (classification.categories.length > 0) {
        // Category count query
        requirements.push({
          type: 'inventory_category',
          params: { searchTerm: classification.categories[0] },
        });
      } else {
        // General inventory stats
        requirements.push({ type: 'inventory_stats' });
      }
      break;

    case 'inventory_query':
      requirements.push({ type: 'inventory_stats' });
      if (classification.categories.length > 0) {
        requirements.push({
          type: 'inventory_category',
          params: { searchTerm: classification.categories[0] },
        });
      }
      break;

    case 'loadout_analysis':
      if (currentLoadoutId || classification.loadoutRelated) {
        requirements.push({
          type: 'loadout_analysis',
          params: { loadoutId: currentLoadoutId },
        });
      }
      requirements.push({ type: 'inventory_stats' });
      break;

    case 'gear_comparison':
      if (classification.productNames.length > 0) {
        for (const name of classification.productNames) {
          requirements.push({
            type: 'geargraph_products',
            params: { name, brand: classification.brands[0] },
          });
        }
      }
      break;

    case 'suitability_check':
      if (currentLoadoutId || classification.loadoutRelated) {
        requirements.push({
          type: 'loadout_analysis',
          params: { loadoutId: currentLoadoutId },
        });
      }
      if (classification.destination) {
        requirements.push({
          type: 'web_search',
          params: {
            query: `${classification.destination} ${classification.season || ''} weather conditions hiking`,
          },
        });
      }
      requirements.push({ type: 'inventory_stats' });
      break;

    case 'weight_optimization':
      if (currentLoadoutId || classification.loadoutRelated) {
        requirements.push({
          type: 'loadout_analysis',
          params: { loadoutId: currentLoadoutId },
        });
      }
      requirements.push({ type: 'inventory_stats' });
      break;

    case 'recommendation':
      requirements.push({ type: 'inventory_stats' });
      if (classification.destination) {
        requirements.push({
          type: 'web_search',
          params: {
            query: `${classification.destination} ${classification.season || ''} hiking conditions`,
          },
        });
      }
      break;

    case 'general_knowledge':
      // No data requirements - LLM can answer from training data
      break;

    case 'complex':
      // No pre-fetch - let the full agent pipeline handle it
      break;
  }

  return requirements;
}

// =============================================================================
// Fast-Path Answer Generation
// =============================================================================

/**
 * Generate a fast-path answer for simple factual questions
 * Uses Gemini Flash instead of Claude Sonnet for speed
 *
 * @param message - User's question
 * @param prefetchedData - Pre-fetched data from parallel pipeline
 * @param locale - User locale (en/de)
 * @returns Generated answer or null if fast-path not possible
 */
export async function generateFastAnswer(
  message: string,
  prefetchedData: Record<string, unknown>,
  locale: string
): Promise<string | null> {
  const getElapsed = createTimer();

  try {
    const gateway = getRouterGateway();
    const isGerman = locale === 'de';

    const systemPrompt = isGerman
      ? `Du bist ein freundlicher Outdoor-Ausrüstungsexperte. Antworte kurz, präzise und enthusiastisch auf Deutsch.
Beantworte die Frage des Nutzers basierend auf den bereitgestellten Daten. Sei direkt und hilfreich.
Verwende metrische Einheiten (kg, g). Halte die Antwort kurz (2-4 Sätze).`
      : `You are a friendly outdoor gear expert. Answer briefly, precisely and enthusiastically in English.
Answer the user's question based on the provided data. Be direct and helpful.
Use metric units (kg, g). Keep the answer short (2-4 sentences).`;

    const dataContext = JSON.stringify(prefetchedData, null, 2);

    const result = await Promise.race([
      generateObject({
        model: gateway(ROUTER_MODEL),
        schema: z.object({
          answer: z.string(),
          confident: z.boolean(),
        }),
        system: systemPrompt,
        prompt: `User data:\n${dataContext}\n\nUser question: "${message}"`,
        temperature: 0.3,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Fast answer timeout')), 5000)
      ),
    ]);

    if (!result.object.confident) {
      logDebug('Fast answer not confident, falling back to full agent', {
        metadata: { latencyMs: getElapsed() },
      });
      return null;
    }

    logInfo('Fast answer generated', {
      metadata: {
        answerLength: result.object.answer.length,
        latencyMs: getElapsed(),
      },
    });

    return result.object.answer;
  } catch (error) {
    logWarn('Fast answer generation failed', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });
    return null;
  }
}
