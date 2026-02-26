/**
 * Supervisor Agent — Domain Router (Kapitel 22: Supervisor-Agent-Pattern)
 *
 * Classifies user intent into exactly ONE domain for multi-domain tool routing.
 * Uses Haiku for minimal latency (~50ms) and cost (~$0.00001 per classification).
 *
 * By routing to a specific domain, the agent's tool set is reduced from 9 to 3–4,
 * cutting prompt size by ~40% for non-gear queries and reducing LLM confusion
 * from irrelevant tool descriptions.
 *
 * Domains:
 * - "gear": inventory, gear search, weight analysis, loadouts, equipment
 * - "community": bulletin board, shakedowns, trip reports, social features
 * - "marketplace": buying/selling used gear, price discovery
 * - "profile": user settings, account, preferences
 *
 * @see Chapter 22: "Agent supervisors coordinate and manage other agents."
 */

import { generateObject } from 'ai';
import { createGateway } from '@ai-sdk/gateway';
import { z } from 'zod';
import { logInfo, logWarn, createTimer } from './logging';
import { SUPERVISOR_CONFIG } from './config';

// =============================================================================
// Types
// =============================================================================

/**
 * Valid domain values for multi-domain routing.
 * Exported so consuming code can derive z.enum() or use in type annotations.
 */
export const DOMAIN_VALUES = ['gear', 'community', 'marketplace', 'profile'] as const;
export type Domain = (typeof DOMAIN_VALUES)[number];

/**
 * Safe default domain used when the supervisor is disabled or classification fails.
 * 'gear' is correct for >70% of queries and is the safest fallback — the gear domain
 * always receives the full tool set, so no capability is lost on a miss.
 *
 * Exporting this constant avoids encoding the string literal 'gear' in multiple
 * call sites (e.g. chat route fallback, classification catch block).
 */
export const DEFAULT_DOMAIN: Domain = 'gear';

/**
 * Result of domain classification.
 */
export interface DomainClassification {
  domain: Domain;
  confidence: number;
}

// =============================================================================
// Configuration
// =============================================================================

/** Zod schema for structured domain classification output */
const DomainSchema = z.object({
  domain: z.enum(DOMAIN_VALUES),
  confidence: z.number().min(0).max(1),
});

// Lazy-loaded gateway instance (shared with other modules via AI_GATEWAY_API_KEY)
let supervisorGateway: ReturnType<typeof createGateway> | null = null;

/**
 * Sentinel flag for one-time init failure.
 *
 * When `AI_GATEWAY_API_KEY` is missing, `getSupervisorGateway()` throws and
 * `supervisorGateway` stays `null`. Without this flag, every subsequent request
 * would retry the failing init, generating one error log entry per request.
 * Once `initFailed` is set to `true`, `getSupervisorGateway()` throws immediately
 * on subsequent calls (before the env-var check), so the `classifyDomain` catch
 * block can fall through to the DEFAULT_DOMAIN fallback without log spam.
 */
let supervisorGatewayInitFailed = false;

function getSupervisorGateway() {
  // Fast-fail on repeated requests after a known init failure.
  // The first failure sets supervisorGatewayInitFailed so subsequent calls
  // skip the environment-variable lookup entirely.
  if (supervisorGatewayInitFailed) {
    throw new Error('Supervisor gateway init previously failed — skipping retry');
  }
  if (!supervisorGateway) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) {
      supervisorGatewayInitFailed = true;
      throw new Error('AI_GATEWAY_API_KEY is required for Supervisor Agent');
    }
    supervisorGateway = createGateway({ apiKey });
  }
  return supervisorGateway;
}

// =============================================================================
// Classification Prompt
// =============================================================================

const SUPERVISOR_PROMPT = `You are the routing supervisor for GearShack, a backpacking gear management platform.

Classify the user's message into exactly ONE domain:

- "gear": inventory questions, gear search, weight analysis, loadout management, gear comparison, equipment recommendations, pack weight optimization, adding items to loadouts, finding lighter alternatives
- "community": bulletin board posts, shakedowns/pack reviews, trip reports, social features, following users, friend requests, community discussions, shared experiences
- "marketplace": buying or selling used gear, price discovery, deals, marketplace listings, gear trading
- "profile": user settings, account management, preferences, subscription tier, personal info, language settings

RULES:
- Default to "gear" when ambiguous — it is the most common domain (>70% of queries)
- If the user mentions both gear AND community (e.g., "what do people think about this tent"), classify as "gear" (the community search tool is available in the gear domain)
- "marketplace" is ONLY for explicit buy/sell intent, not general gear browsing
- Handle both English and German queries`;

// =============================================================================
// Screen-Based Shortcuts
// =============================================================================

/**
 * Fast-path domain resolution based on the current UI screen.
 * When the user is on a domain-specific screen AND their message is short/generic,
 * skip the LLM call entirely.
 *
 * Returns null if no shortcut applies (falls through to LLM classification).
 */
function tryScreenShortcut(screen?: string): Domain | null {
  if (!screen) return null;

  if (screen.includes('community') || screen.includes('bulletin') || screen.includes('shakedown')) {
    return 'community';
  }
  if (screen.includes('marketplace') || screen.includes('shop') || screen.includes('trading')) {
    return 'marketplace';
  }
  if (screen === 'profile' || screen === 'settings' || screen.includes('account')) {
    return 'profile';
  }

  // inventory, loadout-detail, gear/* → all "gear" domain, but don't shortcut
  // because the user might ask about community topics while on a gear page
  return null;
}

// =============================================================================
// Keyword-Based Fast Classification
// =============================================================================

/**
 * Keywords that strongly indicate a specific domain (case-insensitive).
 *
 * IMPORTANT: Only include terms with high precision for their domain.
 * Avoid broad words that appear in gear conversations:
 * - "buy" → common in "should I buy this tent?" (gear question, not marketplace)
 * - "follow" → common in "follow up on my gear" (not social)
 * - "post" → common in "I posted my pack weight" (not community)
 * - "price" → common in "what's the price of the Nemo Hornet?" (gear question)
 *
 * When in doubt, let the LLM classify instead of keyword matching.
 *
 * NOTE: 'gear' is intentionally omitted — it is the default fallback domain.
 * Keyword shortcuts only apply to the three minority domains so we don't need
 * a dead-regex entry. Use Partial<Record<Domain, RegExp>> to make this explicit.
 */
const DOMAIN_KEYWORDS: Partial<Record<Domain, RegExp>> = {
  community: /\b(bulletin\s*board|shakedowns?|trip\s*reports?|friend\s*requests?|community\s*(?:posts?|board|forum|discussions?))\b/i,
  marketplace: /\b(sell(?:ing)?\s+(?:my|this|the)|trade\s+(?:my|this)|marketplace|used\s*gear|second\s*hand|gebraucht(?:e|er|es)?(?:\s+ausruestung)?)\b/i,
  profile: /\b(my\s*(?:profile|account|settings|subscription)|change\s*(?:password|email|language)|einstellungen|mein\s*(?:profil|konto))\b/i,
};

/**
 * Fast keyword-based classification without LLM call.
 * Returns null if no strong keyword match is found.
 */
function tryKeywordClassification(message: string): Domain | null {
  for (const [domain, pattern] of Object.entries(DOMAIN_KEYWORDS)) {
    if (pattern && pattern.test(message)) return domain as Domain;
  }
  return null;
}

// =============================================================================
// Main Classification Function
// =============================================================================

/**
 * Classify user message into a domain for multi-domain tool routing.
 *
 * Uses a three-tier classification strategy:
 * 1. Screen-based shortcut (0ms, for domain-specific pages)
 * 2. Keyword-based fast classification (0ms, for strong keyword signals)
 * 3. LLM classification via Haiku (~50ms, for ambiguous messages)
 *
 * Falls back to "gear" domain on any error (safe default, most common domain).
 *
 * @param message - The user's message
 * @param screen - Current UI screen (inventory, loadout-detail, community, etc.)
 * @returns Domain classification with confidence score
 */
export async function classifyDomain(
  message: string,
  screen?: string,
): Promise<DomainClassification> {
  const getElapsed = createTimer();

  // Tier 1: Screen-based bypass (DISABLED — pending A/B validation)
  // Full screen-based early-return is disabled because it misroutes cross-domain
  // questions (e.g., a gear question asked while on the community page).
  // tryScreenShortcut() is still called below (Tier 3) to inject a context HINT
  // into the LLM prompt for improved accuracy — it is NOT used to skip the LLM call.
  // Re-enable full bypass here only after A/B testing confirms it reduces errors.
  // const screenDomain = tryScreenShortcut(screen); // <-- Tier 1 bypass (disabled)

  // Tier 2: Keyword-based fast classification
  const keywordDomain = tryKeywordClassification(message);
  if (keywordDomain) {
    logInfo('Domain classified via keywords', {
      metadata: {
        domain: keywordDomain,
        confidence: 0.85,
        method: 'keyword',
        latencyMs: getElapsed(),
      },
    });
    return { domain: keywordDomain, confidence: 0.85 };
  }

  // Tier 3: LLM classification via Haiku
  // timeoutId is declared outside the try block so it can be cleared in both
  // the success path and the catch block, preventing the timer from firing
  // after Promise.race has already resolved (memory/timer leak fix).
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const gateway = getSupervisorGateway();

    // Add screen context hint for better LLM accuracy.
    // NOTE: tryScreenShortcut() is used here only to build a context HINT —
    // it does NOT short-circuit the classification (Tier 1 bypass is disabled above).
    let contextHint = '';
    const screenDomain = tryScreenShortcut(screen);
    if (screenDomain) {
      contextHint = `\n[Context: User is on a ${screenDomain}-related page]`;
    }

    // Build a named timeout promise so we can cancel the timer after resolution.
    // Without clearTimeout(), the timer fires after Promise.race settles on the
    // success path — harmless but wastes a timer slot per request.
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(
        () => reject(new Error('Domain classification timeout')),
        SUPERVISOR_CONFIG.TIMEOUT_MS,
      );
    });

    const result = await Promise.race([
      generateObject({
        model: gateway(SUPERVISOR_CONFIG.MODEL),
        schema: DomainSchema,
        system: SUPERVISOR_PROMPT,
        prompt: `Classify this message:${contextHint}\n\n"${message}"`,
        temperature: 0,
      }),
      timeoutPromise,
    ]);

    // Cancel the timeout so it doesn't fire after the race has already resolved
    clearTimeout(timeoutId);

    logInfo('Domain classified via LLM', {
      metadata: {
        domain: result.object.domain,
        confidence: result.object.confidence,
        method: 'llm',
        model: SUPERVISOR_CONFIG.MODEL,
        latencyMs: getElapsed(),
      },
    });

    return result.object;
  } catch (error) {
    // Ensure the timer is always cancelled even when an error is thrown
    clearTimeout(timeoutId);

    logWarn('Domain classification failed, falling back to gear', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });

    // Safe fallback — DEFAULT_DOMAIN ('gear') is the most common domain (>70% of queries)
    return { domain: DEFAULT_DOMAIN, confidence: 0 };
  }
}
