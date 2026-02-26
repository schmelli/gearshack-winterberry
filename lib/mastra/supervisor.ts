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

function getSupervisorGateway() {
  if (!supervisorGateway) {
    const apiKey = process.env.AI_GATEWAY_API_KEY || process.env.AI_GATEWAY_KEY;
    if (!apiKey) {
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

/** Keywords that strongly indicate a specific domain (case-insensitive) */
const DOMAIN_KEYWORDS: Record<Domain, RegExp> = {
  community: /\b(bulletin|shakedown|trip\s*report|community|friend\s*request|follow(?:ing|er)?|social|post(?:s|ed)?|reply|replies|discussion)\b/i,
  marketplace: /\b(buy|sell|selling|trade|trading|price|deal|marketplace|used\s*gear|second\s*hand|gebraucht)\b/i,
  profile: /\b(my\s*(?:profile|account|settings|subscription)|change\s*(?:password|email|language)|einstellungen|profil|konto)\b/i,
  gear: /(?!)/, // Never shortcut to gear via keywords — it's the default fallback
};

/**
 * Fast keyword-based classification without LLM call.
 * Returns null if no strong keyword match is found.
 */
function tryKeywordClassification(message: string): Domain | null {
  for (const [domain, pattern] of Object.entries(DOMAIN_KEYWORDS)) {
    if (domain === 'gear') continue; // gear is the default, never shortcut
    if (pattern.test(message)) return domain as Domain;
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

  // Tier 1: Screen-based shortcut (only for non-gear domain screens)
  // Disabled for now — screen shortcuts can misroute when users ask cross-domain
  // questions (e.g., gear question on community page). Re-enable after A/B testing.
  // const screenDomain = tryScreenShortcut(screen);

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
  try {
    const gateway = getSupervisorGateway();

    // Add screen context hint for better accuracy
    let contextHint = '';
    const screenDomain = tryScreenShortcut(screen);
    if (screenDomain) {
      contextHint = `\n[Context: User is on a ${screenDomain}-related page]`;
    }

    const result = await Promise.race([
      generateObject({
        model: gateway(SUPERVISOR_CONFIG.MODEL),
        schema: DomainSchema,
        system: SUPERVISOR_PROMPT,
        prompt: `Classify this message:${contextHint}\n\n"${message}"`,
        temperature: 0,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(
          () => reject(new Error('Domain classification timeout')),
          SUPERVISOR_CONFIG.TIMEOUT_MS,
        ),
      ),
    ]);

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
    logWarn('Domain classification failed, falling back to gear', {
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown',
        latencyMs: getElapsed(),
      },
    });

    // Safe fallback — "gear" is the most common domain (>70% of queries)
    return { domain: 'gear', confidence: 0 };
  }
}
