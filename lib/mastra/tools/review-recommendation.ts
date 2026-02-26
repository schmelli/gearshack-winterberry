/**
 * Critic Agent Tool: reviewExpensiveRecommendation
 * Feature: Critic-Agent pattern for expensive purchase recommendations (Kap. 21)
 *
 * Implements the "second voice" pattern from Chapter 21:
 * "Before a €500 recommendation, a second, conservative agent reviews:
 *  'Is that really necessary, or would a cheaper model work?'"
 *
 * This tool acts as a budget-conscious post-processing layer that reviews
 * gear recommendations at or above a configurable price threshold (default €300).
 * It uses a fast, cheap model (Haiku) to provide a second opinion — preventing
 * the main agent from uncritically recommending expensive gear.
 *
 * Design principle (Kap. 21): "You try to group related tasks into a job
 * description where you could plausibly recruit someone." — This is the
 * "Budget Advisor" role: conservative, frugal, inventory-aware.
 *
 * @see COMPLEXITY_ROUTING_CONFIG.SIMPLE_MODEL for the review model
 */

import { createTool } from '@mastra/core/tools';
import { generateObject } from 'ai';
import { z } from 'zod';
import { COMPLEXITY_ROUTING_CONFIG } from '../config';
import { getSharedGateway } from '../gateway';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_REVIEW_PRICE_THRESHOLD_EUR = 300;

/**
 * Returns the effective price threshold in EUR, reading from the environment
 * at call time (not module load time) so that tests can override it without
 * module reloading.
 *
 * Uses parseFloat to support fractional thresholds (e.g., "249.99").
 * Falls back to 300 for missing, zero, negative, or non-numeric values.
 *
 * Configurable via CRITIC_PRICE_THRESHOLD_EUR environment variable.
 *
 * @internal also exported for unit-testing purposes
 */
export function getEffectiveThreshold(): number {
  const raw = parseFloat(
    process.env.CRITIC_PRICE_THRESHOLD_EUR || String(DEFAULT_REVIEW_PRICE_THRESHOLD_EUR)
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_REVIEW_PRICE_THRESHOLD_EUR;
}

/**
 * Module-level constant for tool description strings (evaluated at load time).
 * Uses the default value so the static description is stable across environments.
 * The runtime threshold is resolved dynamically in executeReviewRecommendation.
 */
const REVIEW_PRICE_THRESHOLD_EUR = DEFAULT_REVIEW_PRICE_THRESHOLD_EUR;

/**
 * Timeout for the critic review LLM call (milliseconds).
 * Budget consultations are short prompts — 8s is generous.
 */
const REVIEW_TIMEOUT_MS = 8000;

// =============================================================================
// Input / Output Schemas
// =============================================================================

const reviewRecommendationInputSchema = z.object({
  recommendedItem: z
    .string()
    .min(1)
    .max(500)
    .describe('Name/description of the recommended gear item (e.g., "Hilleberg Nallo 2 GT tent")'),
  priceEur: z
    .number()
    .positive()
    .describe('Price of the recommended item in EUR'),
  userNeed: z
    .string()
    .min(1)
    .max(1000)
    .describe('What the user needs the item for (e.g., "3-season solo hiking in the Alps")'),
  userInventory: z
    .array(z.string().max(200))
    .max(50)
    .optional()
    .describe('List of relevant gear items the user already owns (e.g., ["MSR Hubba Hubba 2", "Big Agnes Copper Spur UL1"])'),
  locale: z
    .string()
    .optional()
    .describe('User locale (e.g., "de", "en") for localized used-market platform recommendations'),
});

export type ReviewRecommendationInput = z.infer<typeof reviewRecommendationInputSchema>;

/**
 * Output schema for the critic review.
 * Uses z.enum for the recommendation field to constrain LLM output.
 */
const reviewOutputSchema = z.object({
  concerns: z
    .array(z.string())
    .describe('Budget concerns about this purchase (empty if none)'),
  cheaperAlternative: z
    .string()
    .nullable()
    .describe('A specific cheaper alternative product name, or null if none known'),
  cheaperAlternativePrice: z
    .number()
    .nullable()
    .describe('Estimated price of the cheaper alternative in EUR, or null'),
  recommendation: z
    .enum(['proceed', 'reconsider', 'check_used_market'])
    .describe('"proceed" if justified, "reconsider" if a cheaper option exists, "check_used_market" if buying used could save significantly'),
  reasoning: z
    .string()
    .describe('Brief explanation of the verdict (1-3 sentences)'),
});

export type ReviewRecommendationOutput = z.infer<typeof reviewOutputSchema>;

/**
 * Wrapper output that includes success/error handling
 */
export interface ReviewRecommendationToolOutput {
  success: boolean;
  /** Whether the item was above the price threshold and reviewed */
  reviewed: boolean;
  /** Price threshold that triggered (or would trigger) review */
  thresholdEur: number;
  /** The critic's review (only present when reviewed=true and success=true) */
  review?: ReviewRecommendationOutput;
  /** Error message if the review failed */
  error?: string;
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Returns locale-appropriate used gear marketplace names for the LLM prompt.
 * Prevents hardcoding region-specific platforms for international users.
 *
 * @param locale - User locale string (e.g., "de", "en", "fr"). Defaults to English markets.
 */
function getUsedMarketExamples(locale?: string): string {
  const region = locale?.split('-')[0]?.toLowerCase();
  switch (region) {
    case 'de':
      return 'eBay Kleinanzeigen, Bergfreunde B-Ware, Trekking-Ultraleicht Flohmarkt';
    case 'fr':
      return 'Leboncoin, eBay France, Vinted';
    case 'en':
    default:
      return 'eBay, Facebook Marketplace, Gear Trade, REI Used Gear';
  }
}

// =============================================================================
// Execute Function
// =============================================================================

/**
 * Execute the critic review for an expensive recommendation.
 *
 * If the price is below the threshold, returns immediately with reviewed=false
 * (no LLM call needed). At or above threshold, calls a fast model (Haiku) to assess
 * whether the purchase is justified, suggest cheaper alternatives, or recommend
 * checking the used market.
 *
 * Gracefully degrades: if the LLM call fails or times out, returns success=false
 * with an error message. The main agent should still present the recommendation
 * but note that the budget review was unavailable.
 */
async function executeReviewRecommendation(
  input: ReviewRecommendationInput
): Promise<ReviewRecommendationToolOutput> {
  const { recommendedItem, priceEur, userNeed, userInventory, locale } = input;

  // Read threshold at execution time so env var overrides take effect immediately
  const threshold = getEffectiveThreshold();

  // Skip review for items below threshold (>= threshold triggers review)
  if (priceEur < threshold) {
    return {
      success: true,
      reviewed: false,
      thresholdEur: threshold,
    };
  }

  try {
    const gateway = getSharedGateway();
    const model = gateway(COMPLEXITY_ROUTING_CONFIG.SIMPLE_MODEL);

    const inventorySection = userInventory && userInventory.length > 0
      ? `Items they already own that might be relevant:\n${userInventory.map(item => `- ${item}`).join('\n')}`
      : 'Their current inventory is unknown.';

    // SECURITY NOTE: recommendedItem, userNeed, and userInventory are user-controlled
    // inputs interpolated directly into the LLM prompt. The Zod schema enforces length
    // limits, and the generateObject structured-output schema constrains the model's
    // response format — both of which reduce instruction-override risk. If adversarial
    // prompt injection is a concern in your deployment, consider stripping or rejecting
    // strings containing common override patterns (e.g. "IGNORE PREVIOUS INSTRUCTIONS")
    // before interpolation.
    const usedMarkets = getUsedMarketExamples(locale);

    const { object } = await generateObject({
      model,
      schema: reviewOutputSchema,
      prompt: `You are a budget-conscious outdoor gear advisor — the "frugal voice" that prevents impulsive expensive purchases.

A user is considering buying: ${recommendedItem} for €${priceEur}
Their need: ${userNeed}

${inventorySection}

Evaluate this purchase critically:
1. Is this price justified for the stated need, or is it overkill?
2. Could they achieve the same with gear they already own?
3. Is there a well-known, cheaper alternative that covers 90% of the use case?
4. Would checking the used market (${usedMarkets}) make sense for this item type?

Be specific — name actual products and approximate prices when suggesting alternatives.
Be fair — if the item is genuinely the best choice for their need, say so.`,
      abortSignal: AbortSignal.timeout(REVIEW_TIMEOUT_MS),
    });

    return {
      success: true,
      reviewed: true,
      thresholdEur: threshold,
      review: object,
    };
  } catch (error) {
    // Log the full error object (not just the message) so stack traces and
    // additional context are preserved in server logs.
    console.error('[reviewExpensiveRecommendation] Review failed:', error);

    // DOMException (thrown by AbortSignal.timeout()) may not extend Error in all JS
    // environments (e.g., jsdom, older Node.js). Check name directly after guarding
    // for a non-null object. Also handle 'TimeoutError' — what AbortSignal.timeout()
    // actually throws per the spec — in addition to the classic 'AbortError'.
    const errorName =
      error instanceof Error
        ? error.name
        : error !== null && typeof error === 'object' && 'name' in error
          ? (error as { name: string }).name
          : '';
    const isTimeoutOrAbort = errorName === 'AbortError' || errorName === 'TimeoutError';

    return {
      success: false,
      reviewed: true,
      thresholdEur: threshold,
      error: isTimeoutOrAbort
        ? 'Budget review timed out. The recommendation can still be presented without the second opinion.'
        : 'Budget review unavailable. The recommendation can still be presented without the second opinion.',
    };
  }
}

// =============================================================================
// Mastra Tool Definition
// =============================================================================

/**
 * Review Expensive Recommendation Tool for Mastra Agent
 *
 * Critic agent pattern: a second, budget-conscious voice that reviews gear
 * recommendations at or above €300. Call this AFTER identifying a recommendation
 * but BEFORE presenting it to the user.
 *
 * The tool automatically skips items below the threshold (no LLM call cost).
 * Uses Haiku for the review — fast and cheap, since budget consultation
 * is a structured, simple reasoning task.
 */
export const reviewExpensiveRecommendationTool = createTool({
  id: 'reviewExpensiveRecommendation',
  description: `Review an expensive gear recommendation (>=€${REVIEW_PRICE_THRESHOLD_EUR}) with a budget-conscious perspective. Call this AFTER identifying gear to recommend that costs €${REVIEW_PRICE_THRESHOLD_EUR} or more.

Use this tool when:
- You are about to recommend gear that costs €${REVIEW_PRICE_THRESHOLD_EUR} or more
- The user asks "Should I buy X?" and X costs €${REVIEW_PRICE_THRESHOLD_EUR} or more
- findAlternatives or searchGear returned an expensive top result you plan to recommend

The tool returns one of three verdicts:
- "proceed": Purchase is justified for the user's need
- "reconsider": A cheaper alternative exists that covers the use case
- "check_used_market": The item type has good used availability

Present the critic's feedback alongside your recommendation so the user gets a balanced view. If the review indicates "reconsider", mention the cheaper alternative.`,
  inputSchema: reviewRecommendationInputSchema,

  execute: executeReviewRecommendation,
});
