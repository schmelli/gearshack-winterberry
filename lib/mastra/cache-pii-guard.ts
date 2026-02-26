/**
 * Semantic Cache PII Guard — Query-Level Heuristic Filter
 * Feature: PII Guard Middleware (Kap. 9, Agent Middleware)
 *
 * Detects personal/contextual information in natural language queries
 * that should NOT be stored in the global semantic response cache.
 *
 * This is complementary to `log-sanitizer.ts` which detects structured PII
 * (emails, credit cards, SSNs, etc.). This module detects *contextual* PII
 * in conversational queries — possessive pronouns, personal destinations,
 * temporal references tied to personal plans, etc.
 *
 * The intent router is the primary cache gate, but if it misclassifies a
 * personal query as `general_knowledge`, this guard prevents the raw query
 * text from being stored in `response_cache.query_text` (GDPR/DSGVO risk).
 *
 * @example
 *   "Best tent for my trip to Patagonia in February"
 *   → possessive pronoun + geographic destination + temporal context → blocked
 *
 *   "Difference between Gore-Tex and eVent membranes"
 *   → factual, no personal markers → allowed
 */

// =============================================================================
// Pattern Definitions
// =============================================================================

/**
 * Heuristic patterns that indicate a query contains personal context.
 *
 * Each pattern targets a specific class of contextual PII:
 * 1. Possessive pronouns with gear/activity context (EN + DE)
 * 2. Personal destination references
 * 3. Temporal references tied to personal planning
 * 4. Possessive gear references (standalone)
 *
 * Design principles:
 * - Bilingual (EN + DE) to match the app's i18n scope
 * - Tuned for precision over recall: better to cache a borderline query
 *   than to block legitimate factual queries from caching
 * - Each pattern is independently testable
 */
export const PERSONAL_CONTEXT_PATTERNS: ReadonlyArray<{
  readonly name: string;
  readonly pattern: RegExp;
}> = [
  // 1. Possessive pronouns + gear/activity nouns (EN)
  {
    name: 'possessive_gear_en',
    pattern:
      /\b(my|mine|our)\s+(trip|hike|tour|loadout|pack|gear|tent|bag|sleeping\s*bag|backpack|jacket|boots|shoes|setup|kit|equipment|camping|trek|expedition)\b/i,
  },
  // 2. Possessive pronouns + gear/activity nouns (DE)
  {
    name: 'possessive_gear_de',
    pattern:
      /\b(mein|meine[rnsm]?|unser[eemn]?)\s+(trip|wanderung|tour|loadout|ausrüstung|zelt|rucksack|schlafsack|jacke|stiefel|schuhe|setup|packliste|trekking|expedition)\b/i,
  },
  // 3. Personal destination references — preposition + capitalized place name
  //    Matches: "to Patagonia", "nach München", "in the Dolomites"
  //    Requires preposition to avoid matching gear brand names (e.g., "Arc'teryx")
  //    NOTE: "für" is excluded because German capitalizes ALL nouns, causing
  //    false positives on factual queries like "für Regenjacken?". German
  //    destinations typically use "nach" (nach München, nach Patagonien).
  {
    name: 'personal_destination',
    pattern:
      /\b(to|nach|for)\s+[A-ZÄÖÜ][a-zäöüß]{2,}(?:\s+[A-ZÄÖÜ][a-zäöüß]{2,})*\b/,
  },
  // 4. Temporal references with personal planning context (EN)
  //    Matches: "in February", "next March", "this summer"
  {
    name: 'temporal_planning_en',
    pattern:
      /\b(in|next|this)\s+(january|february|march|april|may|june|july|august|september|october|november|december|spring|summer|fall|autumn|winter)\b/i,
  },
  // 5. Temporal references with personal planning context (DE)
  //    Matches: "im Februar", "nächsten März", "diesen Sommer"
  {
    name: 'temporal_planning_de',
    pattern:
      /\b(im|nächsten?|diesen?[mr]?)\s+(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember|frühling|sommer|herbst|winter)\b/i,
  },
  // 6. First-person planning verbs (EN + DE)
  //    Matches: "I'm going", "I plan to", "ich gehe", "ich plane"
  {
    name: 'first_person_planning',
    pattern:
      /\b(i'?m\s+going|i\s+plan\s+to|i\s+want\s+to|i\s+need|ich\s+gehe|ich\s+plane|ich\s+brauche|ich\s+möchte|ich\s+will)\b/i,
  },
] as const;

// =============================================================================
// Public API
// =============================================================================

/**
 * Result of the PII guard check, including which pattern(s) matched
 * for observability and debugging.
 */
export interface PIIGuardResult {
  /** Whether the query contains personal context markers */
  readonly containsPersonalContext: boolean;
  /** Names of the matched patterns (empty if no match) */
  readonly matchedPatterns: readonly string[];
}

/**
 * Check whether a query contains personal context that should prevent
 * it from being stored in the global semantic cache.
 *
 * @param query - The user's raw query text
 * @returns Result indicating whether personal context was detected
 */
export function checkQueryForPersonalContext(query: string): PIIGuardResult {
  const matchedPatterns: string[] = [];

  for (const { name, pattern } of PERSONAL_CONTEXT_PATTERNS) {
    if (pattern.test(query)) {
      matchedPatterns.push(name);
    }
  }

  return {
    containsPersonalContext: matchedPatterns.length > 0,
    matchedPatterns,
  };
}

/**
 * Quick boolean check — convenience wrapper for use in guard clauses.
 *
 * @param query - The user's raw query text
 * @returns true if the query contains personal context markers
 */
export function queryContainsPersonalContext(query: string): boolean {
  return PERSONAL_CONTEXT_PATTERNS.some(({ pattern }) => pattern.test(query));
}
