/**
 * Query Parser Module
 * Feature: AI Assistant Reliability Improvements
 *
 * Extracts constraints and intent from natural language queries.
 * Provides structured parsing for budget, weight, and currency values.
 *
 * Example queries handled:
 * - "Find the lightest tent" → intent: search, sortPreference: lightest, category: tent
 * - "Under €300 budget" → constraints: { maxBudget: { value: 300, currency: 'EUR' } }
 * - "Less than 2kg" → constraints: { maxWeight: { value: 2000, unit: 'g' } } (converted)
 */

// =============================================================================
// Types
// =============================================================================

export interface BudgetConstraint {
  value: number;
  currency: 'EUR' | 'USD' | 'GBP' | 'CHF';
}

export interface WeightConstraint {
  value: number; // Always in grams for consistency
  unit: 'g' | 'kg' | 'oz' | 'lb';
  originalValue: number; // Original value before conversion
}

export interface ParsedConstraints {
  maxBudget?: BudgetConstraint;
  minBudget?: BudgetConstraint;
  maxWeight?: WeightConstraint;
  minWeight?: WeightConstraint;
  category?: string;
  brand?: string;
}

export type QueryIntent =
  | 'search' // Find items matching criteria
  | 'compare' // Compare multiple items
  | 'optimize' // Optimize (budget, weight, etc.)
  | 'recommend' // Get recommendations
  | 'analyze' // Analyze inventory/loadout
  | 'navigate' // Navigate to a page
  | 'question' // General question
  | 'unknown';

export type SortPreference = 'lightest' | 'heaviest' | 'cheapest' | 'most_expensive' | 'best_value' | 'relevance';

export type QueryTarget = 'user_inventory' | 'catalog' | 'both';

export interface ParsedQuery {
  intent: QueryIntent;
  constraints: ParsedConstraints;
  target: QueryTarget;
  sortPreference: SortPreference;
  rawQuery: string;
  confidence: number; // 0-1 confidence score for parsing accuracy
  detectedPatterns: string[]; // List of patterns that matched
}

// =============================================================================
// Constants - Pattern Definitions
// =============================================================================

// Currency patterns: €300, $500, 300 EUR, 500 USD, etc.
const CURRENCY_PATTERNS = {
  EUR: [
    /(?:€|EUR|euro|euros?)\s*(\d+(?:[.,]\d+)?)/i, // €300, EUR 300
    /(\d+(?:[.,]\d+)?)\s*(?:€|EUR|euro|euros?)/i, // 300€, 300 EUR
  ],
  USD: [
    /(?:\$|USD|dollar|dollars?)\s*(\d+(?:[.,]\d+)?)/i, // $500, USD 500
    /(\d+(?:[.,]\d+)?)\s*(?:\$|USD|dollar|dollars?)/i, // 500$, 500 USD
  ],
  GBP: [
    /(?:£|GBP|pound|pounds?)\s*(\d+(?:[.,]\d+)?)/i, // £400, GBP 400
    /(\d+(?:[.,]\d+)?)\s*(?:£|GBP|pound|pounds?)/i, // 400£, 400 GBP
  ],
  CHF: [
    /(?:CHF|francs?|franken)\s*(\d+(?:[.,]\d+)?)/i, // CHF 500
    /(\d+(?:[.,]\d+)?)\s*(?:CHF|francs?|franken)/i, // 500 CHF
  ],
} as const;

// Budget constraint patterns
const BUDGET_PATTERNS = [
  /(?:under|max|maximum|up\s*to|less\s*than|within|budget\s*of?|spend(?:ing)?)\s+/i,
  /(?:unter|maximal|bis\s*zu|weniger\s*als|budget\s*von?)\s+/i, // German
];

// Weight patterns with units
const WEIGHT_UNIT_PATTERNS = [
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:kg|kilo|kilogram|kilograms?)/i, unit: 'kg' as const, multiplier: 1000 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:g|gram|grams?|gramm)/i, unit: 'g' as const, multiplier: 1 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:oz|ounce|ounces?)/i, unit: 'oz' as const, multiplier: 28.3495 },
  { regex: /(\d+(?:[.,]\d+)?)\s*(?:lb|lbs|pound|pounds?)/i, unit: 'lb' as const, multiplier: 453.592 },
];

// Sort preference patterns
const SORT_PATTERNS: { pattern: RegExp; preference: SortPreference }[] = [
  { pattern: /\b(?:lightest|leichteste|ultralight|ul)\b/i, preference: 'lightest' },
  { pattern: /\b(?:heaviest|schwerste)\b/i, preference: 'heaviest' },
  { pattern: /\b(?:cheapest|günstigste|billigste|budget)\b/i, preference: 'cheapest' },
  { pattern: /\b(?:most\s*expensive|teuerste)\b/i, preference: 'most_expensive' },
  { pattern: /\b(?:best\s*value|preis-leistung|bang\s*for\s*buck)\b/i, preference: 'best_value' },
];

// Intent patterns
const INTENT_PATTERNS: { pattern: RegExp; intent: QueryIntent }[] = [
  // Optimize
  { pattern: /\b(?:optimize|optimieren|reduce|reduzier|cut\s*down|save\s*weight)\b/i, intent: 'optimize' },
  { pattern: /\b(?:how\s*can\s*i|how\s*could\s*i|wie\s*kann\s*ich)\b.*(?:lighter|save|reduce)/i, intent: 'optimize' },

  // Compare
  { pattern: /\b(?:compare|vergleich|vs\.?|versus)\b/i, intent: 'compare' },
  { pattern: /\b(?:difference|unterschied)\s*(?:between|zwischen)\b/i, intent: 'compare' },

  // Analyze
  { pattern: /\b(?:analyze|analysier|breakdown|aufschlüssel|statistics|statistik)\b/i, intent: 'analyze' },
  { pattern: /\b(?:how\s*much|wieviel)\s*(?:do\s*i\s*have|habe\s*ich)\b/i, intent: 'analyze' },

  // Navigate
  { pattern: /\b(?:show\s*me|go\s*to|take\s*me|navigate|zeig\s*mir|geh\s*zu)\b/i, intent: 'navigate' },

  // Recommend
  { pattern: /\b(?:recommend|empfiehl|suggest|vorschlag|should\s*i|soll\s*ich)\b/i, intent: 'recommend' },
  { pattern: /\b(?:what\s*(?:is|are)\s*(?:the\s*)?best|was\s*(?:ist|sind)\s*(?:das|die)?\s*beste)\b/i, intent: 'recommend' },

  // Search
  { pattern: /\b(?:find|such|search|look\s*for|show|finde|zeig)\b/i, intent: 'search' },
  { pattern: /\b(?:which|welche|what|was)\s*(?:is|are|ist|sind)\s*(?:the\s*)?(?:lightest|cheapest)/i, intent: 'search' },

  // Question
  { pattern: /\?$/, intent: 'question' },
  { pattern: /^(?:what|which|how|why|when|where|who|was|welche|wie|warum|wann|wo|wer)\b/i, intent: 'question' },
];

// Target patterns - determines if query is about user inventory or catalog
const TARGET_PATTERNS: { pattern: RegExp; target: QueryTarget }[] = [
  // User inventory indicators
  { pattern: /\b(?:my|mine|i\s*(?:have|own)|mein|ich\s*(?:habe|besitze))\b/i, target: 'user_inventory' },
  { pattern: /\b(?:my\s*(?:inventory|gear|loadout)|mein\s*(?:inventar|ausrüstung))\b/i, target: 'user_inventory' },
  { pattern: /\b(?:do\s*i\s*(?:have|own)|habe\s*ich)\b/i, target: 'user_inventory' },

  // Catalog indicators
  { pattern: /\b(?:catalog|katalog|geargraph|market|shop|buy|purchase|kaufen)\b/i, target: 'catalog' },
  { pattern: /\b(?:available|verfügbar|on\s*the\s*market|im\s*handel)\b/i, target: 'catalog' },
  { pattern: /\b(?:what's\s*the|which\s*is\s*the)\s*(?:lightest|cheapest|best)\b/i, target: 'catalog' },
];

// Common outdoor gear categories
const CATEGORY_PATTERNS = [
  // Shelter
  { pattern: /\b(?:tent|zelt|shelter|tarp|bivy|bivvy)\b/i, category: 'tent' },
  { pattern: /\b(?:sleeping\s*bag|schlafsack|quilt|sleep\s*system)\b/i, category: 'sleeping-bag' },
  { pattern: /\b(?:sleeping\s*pad|isomatte|mattress|mat)\b/i, category: 'sleeping-pad' },

  // Pack
  { pattern: /\b(?:backpack|rucksack|pack\b|rucksäck)\b/i, category: 'backpack' },

  // Cooking
  { pattern: /\b(?:stove|kocher|burner)\b/i, category: 'stove' },
  { pattern: /\b(?:cook\s*set|cookware|pot|töpfe?)\b/i, category: 'cookware' },

  // Clothing
  { pattern: /\b(?:jacket|jacke|rain\s*jacket|shell)\b/i, category: 'jacket' },
  { pattern: /\b(?:down\s*jacket|puffy|daunen)\b/i, category: 'down-jacket' },
  { pattern: /\b(?:base\s*layer|baselayer|unterwäsche)\b/i, category: 'base-layer' },

  // Footwear
  { pattern: /\b(?:boots?|shoes?|trail\s*runners?|stiefel|schuhe)\b/i, category: 'footwear' },

  // Other
  { pattern: /\b(?:headlamp|stirnlampe|flashlight|taschenlampe)\b/i, category: 'headlamp' },
  { pattern: /\b(?:water\s*filter|wasserfilter|purifier)\b/i, category: 'water-filter' },
  { pattern: /\b(?:trekking\s*poles?|wanderstöck)\b/i, category: 'trekking-poles' },
];

// Brand patterns (major outdoor brands)
const BRAND_PATTERNS = [
  { pattern: /\b(?:osprey)\b/i, brand: 'Osprey' },
  { pattern: /\b(?:big\s*agnes)\b/i, brand: 'Big Agnes' },
  { pattern: /\b(?:msr)\b/i, brand: 'MSR' },
  { pattern: /\b(?:zpacks)\b/i, brand: 'Zpacks' },
  { pattern: /\b(?:gossamer\s*gear)\b/i, brand: 'Gossamer Gear' },
  { pattern: /\b(?:sea\s*to\s*summit)\b/i, brand: 'Sea to Summit' },
  { pattern: /\b(?:patagonia)\b/i, brand: 'Patagonia' },
  { pattern: /\b(?:arc'?teryx)\b/i, brand: "Arc'teryx" },
  { pattern: /\b(?:rei)\b/i, brand: 'REI' },
  { pattern: /\b(?:north\s*face|tnf)\b/i, brand: 'The North Face' },
  { pattern: /\b(?:nemo)\b/i, brand: 'Nemo' },
  { pattern: /\b(?:therm-?a-?rest)\b/i, brand: 'Therm-a-Rest' },
  { pattern: /\b(?:enlightened\s*equipment|ee)\b/i, brand: 'Enlightened Equipment' },
  { pattern: /\b(?:granite\s*gear)\b/i, brand: 'Granite Gear' },
  { pattern: /\b(?:hyperlite\s*mountain\s*gear|hmg)\b/i, brand: 'Hyperlite Mountain Gear' },
];

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Parse a number from a string, handling both . and , as decimal separators
 */
function parseNumber(str: string): number {
  // Handle European notation (comma as decimal separator)
  const normalized = str.replace(',', '.');
  return parseFloat(normalized);
}

/**
 * Extract budget constraint from query
 */
function extractBudget(query: string): { max?: BudgetConstraint; min?: BudgetConstraint } {
  const result: { max?: BudgetConstraint; min?: BudgetConstraint } = {};

  // Check for budget constraint indicators
  const hasMaxIndicator = BUDGET_PATTERNS.some((p) => p.test(query));
  const hasMinIndicator = /(?:over|min|minimum|more\s*than|at\s*least|über|mindestens|mehr\s*als)/i.test(query);

  // Try each currency
  for (const [currency, patterns] of Object.entries(CURRENCY_PATTERNS)) {
    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match && match[1]) {
        const value = parseNumber(match[1]);
        if (!isNaN(value) && value > 0) {
          const constraint: BudgetConstraint = {
            value,
            currency: currency as BudgetConstraint['currency'],
          };

          // Determine if max or min based on context
          if (hasMinIndicator && !hasMaxIndicator) {
            result.min = constraint;
          } else {
            // Default to max budget (most common use case)
            result.max = constraint;
          }
          break; // Found a match for this currency
        }
      }
    }
    if (result.max || result.min) break; // Stop after first currency match
  }

  return result;
}

/**
 * Extract weight constraint from query
 */
function extractWeight(query: string): { max?: WeightConstraint; min?: WeightConstraint } {
  const result: { max?: WeightConstraint; min?: WeightConstraint } = {};

  // Check for weight constraint indicators
  const hasMaxIndicator = /(?:under|max|maximum|less\s*than|lighter\s*than|within|unter|maximal|leichter\s*als)/i.test(query);
  const hasMinIndicator = /(?:over|min|minimum|more\s*than|heavier\s*than|at\s*least|über|mindestens|schwerer\s*als)/i.test(query);

  // Try each weight unit pattern
  for (const { regex, unit, multiplier } of WEIGHT_UNIT_PATTERNS) {
    const match = query.match(regex);
    if (match && match[1]) {
      const originalValue = parseNumber(match[1]);
      if (!isNaN(originalValue) && originalValue > 0) {
        const constraint: WeightConstraint = {
          value: Math.round(originalValue * multiplier), // Convert to grams
          unit,
          originalValue,
        };

        // Determine if max or min based on context
        if (hasMinIndicator && !hasMaxIndicator) {
          result.min = constraint;
        } else {
          // Default to max weight (most common use case for ultralight)
          result.max = constraint;
        }
        break; // Found a match
      }
    }
  }

  return result;
}

/**
 * Detect sort preference from query
 */
function detectSortPreference(query: string): SortPreference {
  for (const { pattern, preference } of SORT_PATTERNS) {
    if (pattern.test(query)) {
      return preference;
    }
  }
  return 'relevance';
}

/**
 * Detect query intent
 */
function detectIntent(query: string): QueryIntent {
  for (const { pattern, intent } of INTENT_PATTERNS) {
    if (pattern.test(query)) {
      return intent;
    }
  }
  return 'unknown';
}

/**
 * Detect query target (user inventory vs catalog)
 */
function detectTarget(query: string): QueryTarget {
  for (const { pattern, target } of TARGET_PATTERNS) {
    if (pattern.test(query)) {
      return target;
    }
  }
  // Default based on intent
  return 'both';
}

/**
 * Extract category from query
 */
function extractCategory(query: string): string | undefined {
  for (const { pattern, category } of CATEGORY_PATTERNS) {
    if (pattern.test(query)) {
      return category;
    }
  }
  return undefined;
}

/**
 * Extract brand from query
 */
function extractBrand(query: string): string | undefined {
  for (const { pattern, brand } of BRAND_PATTERNS) {
    if (pattern.test(query)) {
      return brand;
    }
  }
  return undefined;
}

// =============================================================================
// Main Parser Function
// =============================================================================

/**
 * Parse a natural language query into structured constraints and intent
 *
 * @param query - The user's natural language query
 * @returns ParsedQuery with extracted constraints, intent, and metadata
 *
 * @example
 * parseQuery("Find the lightest tent under €300")
 * // Returns:
 * // {
 * //   intent: 'search',
 * //   constraints: {
 * //     maxBudget: { value: 300, currency: 'EUR' },
 * //     category: 'tent'
 * //   },
 * //   target: 'catalog',
 * //   sortPreference: 'lightest',
 * //   confidence: 0.9,
 * //   detectedPatterns: ['budget:EUR:300', 'category:tent', 'sort:lightest']
 * // }
 */
export function parseQuery(query: string): ParsedQuery {
  const detectedPatterns: string[] = [];
  let confidence = 0;

  // Extract budget constraints
  const budgetConstraints = extractBudget(query);
  if (budgetConstraints.max) {
    detectedPatterns.push(`budget:${budgetConstraints.max.currency}:${budgetConstraints.max.value}`);
    confidence += 0.2;
  }
  if (budgetConstraints.min) {
    detectedPatterns.push(`budget_min:${budgetConstraints.min.currency}:${budgetConstraints.min.value}`);
    confidence += 0.2;
  }

  // Extract weight constraints
  const weightConstraints = extractWeight(query);
  if (weightConstraints.max) {
    detectedPatterns.push(`weight_max:${weightConstraints.max.value}g`);
    confidence += 0.2;
  }
  if (weightConstraints.min) {
    detectedPatterns.push(`weight_min:${weightConstraints.min.value}g`);
    confidence += 0.2;
  }

  // Detect sort preference
  const sortPreference = detectSortPreference(query);
  if (sortPreference !== 'relevance') {
    detectedPatterns.push(`sort:${sortPreference}`);
    confidence += 0.1;
  }

  // Detect intent
  const intent = detectIntent(query);
  if (intent !== 'unknown') {
    detectedPatterns.push(`intent:${intent}`);
    confidence += 0.15;
  }

  // Detect target
  const target = detectTarget(query);
  detectedPatterns.push(`target:${target}`);
  if (target !== 'both') {
    confidence += 0.1;
  }

  // Extract category
  const category = extractCategory(query);
  if (category) {
    detectedPatterns.push(`category:${category}`);
    confidence += 0.15;
  }

  // Extract brand
  const brand = extractBrand(query);
  if (brand) {
    detectedPatterns.push(`brand:${brand}`);
    confidence += 0.1;
  }

  // Build constraints object
  const constraints: ParsedConstraints = {};
  if (budgetConstraints.max) constraints.maxBudget = budgetConstraints.max;
  if (budgetConstraints.min) constraints.minBudget = budgetConstraints.min;
  if (weightConstraints.max) constraints.maxWeight = weightConstraints.max;
  if (weightConstraints.min) constraints.minWeight = weightConstraints.min;
  if (category) constraints.category = category;
  if (brand) constraints.brand = brand;

  // Cap confidence at 1.0
  confidence = Math.min(confidence, 1.0);

  return {
    intent,
    constraints,
    target,
    sortPreference,
    rawQuery: query,
    confidence,
    detectedPatterns,
  };
}

/**
 * Check if a parsed query represents a complex optimization query
 * that might benefit from a multi-step workflow
 *
 * @param parsed - The parsed query result
 * @returns true if this is a complex query requiring workflow
 */
export function isComplexOptimizationQuery(parsed: ParsedQuery): boolean {
  // Complex queries have:
  // 1. Optimize intent AND a budget or weight constraint
  // 2. Multiple constraints (budget + weight)
  // 3. High confidence parsing (we understand what they want)

  if (parsed.intent === 'optimize' && parsed.confidence >= 0.3) {
    return true;
  }

  // Multiple constraints with search/recommend intent
  const constraintCount =
    (parsed.constraints.maxBudget ? 1 : 0) +
    (parsed.constraints.maxWeight ? 1 : 0) +
    (parsed.constraints.category ? 1 : 0);

  if (constraintCount >= 2 && ['search', 'recommend', 'compare'].includes(parsed.intent)) {
    return true;
  }

  return false;
}

/**
 * Format parsed query as a human-readable string for logging/debugging
 */
export function formatParsedQuery(parsed: ParsedQuery): string {
  const parts: string[] = [];

  parts.push(`Intent: ${parsed.intent}`);
  parts.push(`Target: ${parsed.target}`);
  parts.push(`Sort: ${parsed.sortPreference}`);

  if (parsed.constraints.maxBudget) {
    const b = parsed.constraints.maxBudget;
    parts.push(`Max Budget: ${b.currency === 'EUR' ? '€' : b.currency === 'USD' ? '$' : b.currency}${b.value}`);
  }

  if (parsed.constraints.maxWeight) {
    const w = parsed.constraints.maxWeight;
    parts.push(`Max Weight: ${w.originalValue}${w.unit} (${w.value}g)`);
  }

  if (parsed.constraints.category) {
    parts.push(`Category: ${parsed.constraints.category}`);
  }

  if (parsed.constraints.brand) {
    parts.push(`Brand: ${parsed.constraints.brand}`);
  }

  parts.push(`Confidence: ${Math.round(parsed.confidence * 100)}%`);

  return parts.join(' | ');
}

/**
 * Format parsed query constraints for inclusion in AI system prompt
 * Returns a string that helps guide the AI's tool selection
 *
 * @param parsed - The parsed query result
 * @returns Formatted string for system prompt, or null if no relevant constraints
 */
export function formatParsedQueryForPrompt(parsed: ParsedQuery): string | null {
  if (parsed.confidence < 0.3) {
    return null;
  }

  const lines: string[] = [];
  lines.push('**Detected Query Constraints:**');

  // Intent
  if (parsed.intent !== 'unknown') {
    const intentDescriptions: Record<QueryIntent, string> = {
      search: 'User is searching for specific items',
      compare: 'User wants to compare options',
      optimize: 'User wants to optimize for weight/cost efficiency',
      recommend: 'User wants recommendations',
      analyze: 'User wants analysis of their gear',
      navigate: 'User wants to navigate the app',
      question: 'User has a question about gear',
      unknown: '',
    };
    lines.push(`- Intent: ${intentDescriptions[parsed.intent]}`);
  }

  // Budget constraint
  if (parsed.constraints.maxBudget) {
    const b = parsed.constraints.maxBudget;
    const symbol = b.currency === 'EUR' ? '€' : b.currency === 'USD' ? '$' : b.currency;
    lines.push(`- Budget Limit: ${symbol}${b.value} (use priceMax: ${normalizeToUsd(b.value, b.currency).toFixed(0)} USD in searchCatalog)`);
  }

  // Weight constraint
  if (parsed.constraints.maxWeight) {
    const w = parsed.constraints.maxWeight;
    lines.push(`- Weight Limit: ${w.originalValue}${w.unit} (${w.value}g - use weightMax: ${w.value} in searchCatalog)`);
  }

  // Sort preference
  if (parsed.sortPreference !== 'relevance') {
    const sortMapping: Record<SortPreference, string> = {
      lightest: 'sortBy: "weight_asc"',
      heaviest: 'sortBy: "weight_desc"',
      cheapest: 'sortBy: "price_asc"',
      most_expensive: 'sortBy: "price_desc"',
      best_value: 'sortBy: "weight_asc" (prioritize weight savings per dollar)',
      relevance: '',
    };
    lines.push(`- Preferred Sort: ${parsed.sortPreference} → use ${sortMapping[parsed.sortPreference]}`);
  }

  // Target
  if (parsed.target !== 'both') {
    const targetMapping: Record<QueryTarget, string> = {
      user_inventory: 'Use queryUserData tool',
      catalog: 'Use searchCatalog tool',
      both: '',
    };
    lines.push(`- Data Source: ${targetMapping[parsed.target]}`);
  }

  // Category
  if (parsed.constraints.category) {
    lines.push(`- Category: "${parsed.constraints.category}"`);
  }

  // Brand
  if (parsed.constraints.brand) {
    lines.push(`- Brand: "${parsed.constraints.brand}"`);
  }

  if (lines.length <= 1) {
    return null;
  }

  return lines.join('\n');
}

// =============================================================================
// Unit Conversion Utilities
// =============================================================================

/**
 * Normalize weight to grams from any supported unit
 *
 * @param value - The weight value
 * @param unit - The unit ('g', 'kg', 'oz', 'lb')
 * @returns Weight in grams
 */
export function normalizeToGrams(value: number, unit: string): number {
  switch (unit.toLowerCase()) {
    case 'kg':
      return value * 1000;
    case 'oz':
      return value * 28.3495;
    case 'lb':
      return value * 453.592;
    case 'g':
    default:
      return value;
  }
}

/**
 * Normalize currency to USD using approximate exchange rates
 * These are rough approximations for planning purposes
 *
 * @param value - The currency value
 * @param currency - The currency code ('EUR', 'USD', 'GBP', 'CHF')
 * @returns Value in USD
 */
export function normalizeToUsd(value: number, currency: string): number {
  // Approximate exchange rates (as of late 2024)
  // These are rough estimates for planning purposes
  const rates: Record<string, number> = {
    USD: 1.0,
    EUR: 1.08, // 1 EUR ≈ 1.08 USD
    GBP: 1.27, // 1 GBP ≈ 1.27 USD
    CHF: 1.14, // 1 CHF ≈ 1.14 USD
  };

  const rate = rates[currency.toUpperCase()] ?? 1.0;
  return value * rate;
}
