/**
 * Shared catalog scoring utilities
 *
 * Extracted from lib/supabase/catalog.ts and lib/vision-catalog-matcher.ts
 * to deduplicate the escapeLikePattern helper and scoring logic.
 */

/**
 * Normalizes a raw search query for consistent behavior across search paths.
 *
 * Strips characters that are PostgREST-unsafe (commas, parens) or ambiguous
 * in product name searches (dots → spaces), then collapses whitespace.
 *
 * Applied BEFORE path-specific escaping to ensure the RPC path (bound params)
 * and the fallback path (.or() filter strings) receive the same semantic input.
 * Without normalization, "tent, poles" would preserve the comma in the RPC path
 * but strip it in the fallback path, producing divergent result sets.
 *
 * After normalization, `escapeIlikeWildcards` is sufficient for both paths —
 * no PostgREST-unsafe characters remain to corrupt `.or()` filter strings.
 *
 * **Precision trade-off — dot removal:**
 * Dots are replaced with spaces so version-qualified product names like `PocketRocket 2.0`
 * become `PocketRocket 2 0` (two separate tokens) rather than a single precise substring.
 * This slightly broadens matching (e.g., `"2 0"` could match unrelated items with those
 * tokens), but is acceptable because:
 * 1. Dots in PostgREST `.or()` filter strings are interpreted as column accessors (e.g.,
 *    `column.field`), which would corrupt the fallback search path.
 * 2. The search_enrichment `alternativeSearchTerms` field is enriched with version-specific
 *    synonyms (e.g., `"PocketRocket 2"`) that compensate for the lost precision.
 * If version-exact matching becomes important, consider allowing dots in the RPC path
 * only (before the path branches) and applying the dot-removal only for the fallback path.
 *
 * @param query - Raw user input
 * @returns Normalized query with PostgREST-unsafe chars removed, safe for both contexts
 */
export function normalizeSearchQuery(query: string): string {
  return query
    .replace(/,/g, ' ')    // commas have no semantic role in gear product names
    .replace(/\(/g, '')    // parens are PostgREST-unsafe and not meaningful in gear searches
    .replace(/\)/g, '')    // parens are PostgREST-unsafe and not meaningful in gear searches
    .replace(/\./g, ' ')   // dots are rarely meaningful and can affect PostgREST parsing
    .replace(/\s+/g, ' ')  // collapse multiple spaces produced by above replacements
    .trim();
}

/**
 * Escapes special characters in LIKE/ILIKE patterns AND PostgREST .or() syntax.
 * Prevents user input containing %, _, or \ from being interpreted as wildcards.
 * Also prevents PostgREST filter injection via commas, parens, dots, and quotes.
 * Input is truncated to 200 characters to prevent DoS via overly long search terms.
 * @param input - Raw user input
 * @returns Escaped string safe for LIKE patterns and .or() filter strings
 */
export function escapeLikePattern(input: string): string {
  return input
    .slice(0, 200)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/"/g, '')
    .replace(/'/g, '')
    .replace(/\./g, ' ')
    .trim();
}

// =============================================================================
// Catalog Candidate Scoring
// =============================================================================

export interface CatalogScoringContext {
  normalizedQuery: string;
  queryWords: string[];
  productName: string;
  brandName: string;
  combinedText: string;
}

export interface ScoringConfig {
  /** Minimum score to consider a match valid (default: 0) */
  minScore?: number;
  /** Include brand-only matches as Strategy 4 (default: true) */
  includeBrandMatches?: boolean;
  /** Skip Strategy 2 when Strategy 1 already matched (default: true) */
  optimizeSkip?: boolean;
}

/**
 * Build a normalized scoring context from raw query and product data.
 * Handles null/undefined safely.
 */
export function buildScoringContext(
  query: string,
  productName: string | null | undefined,
  brandName: string | null | undefined
): CatalogScoringContext {
  const normalizedQuery = query.toLowerCase().trim();
  const queryWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const normalizedProductName = (productName ?? '').toLowerCase();
  const normalizedBrandName = (brandName ?? '').toLowerCase();
  const combinedText = `${normalizedBrandName} ${normalizedProductName}`.trim();

  return {
    normalizedQuery,
    queryWords,
    productName: normalizedProductName,
    brandName: normalizedBrandName,
    combinedText,
  };
}

/**
 * Score a catalog candidate product against a search query using 5 strategies.
 *
 * Strategies (highest score wins):
 * 1. Full query in combined brand+name text (0.85-1.0)
 * 2. All query words in combined text (0.75-0.85)
 * 3. Full query in product name only (0.5-0.8)
 * 4. Full query in brand name only (0.4-0.7) — optional via config
 * 5. At least 50% of query words match (up to 0.3)
 *
 * @returns Score between 0 and 1.0 (rounded to 2 decimals), or 0 if below minScore
 */
export function scoreCatalogCandidate(
  ctx: CatalogScoringContext,
  config: ScoringConfig = {}
): number {
  const {
    minScore = 0,
    includeBrandMatches = true,
    optimizeSkip = true,
  } = config;

  const { normalizedQuery, queryWords, productName, brandName, combinedText } = ctx;
  const potentialScores: number[] = [];

  // Strategy 1: Full query in combined text (0.85-1.0)
  let strategy1Matched = false;
  if (combinedText.includes(normalizedQuery)) {
    const matchIndex = combinedText.indexOf(normalizedQuery);
    const score =
      matchIndex === 0
        ? 0.95 + 0.05 * (normalizedQuery.length / combinedText.length)
        : 0.85 + 0.1 * (normalizedQuery.length / combinedText.length);
    potentialScores.push(score);
    strategy1Matched = true;
  }

  // Strategy 2: All query words in combined text (0.75-0.85)
  if (!(optimizeSkip && strategy1Matched)) {
    if (
      queryWords.length > 1 &&
      queryWords.every((word) => combinedText.includes(word))
    ) {
      const score = 0.75 + 0.1 * (normalizedQuery.length / combinedText.length);
      potentialScores.push(score);
    }
  }

  // Strategy 3: Full query in product name only (0.5-0.8)
  if (productName.includes(normalizedQuery)) {
    const matchIndex = productName.indexOf(normalizedQuery);
    const score =
      matchIndex === 0
        ? 0.7 + 0.1 * (normalizedQuery.length / productName.length)
        : 0.5 + 0.15 * (normalizedQuery.length / productName.length);
    potentialScores.push(score);
  }

  // Strategy 4: Full query in brand name only (0.4-0.7)
  if (includeBrandMatches && brandName && brandName.includes(normalizedQuery)) {
    const matchIndex = brandName.indexOf(normalizedQuery);
    const score =
      matchIndex === 0
        ? 0.6 + 0.1 * (normalizedQuery.length / brandName.length)
        : 0.4 + 0.15 * (normalizedQuery.length / brandName.length);
    potentialScores.push(score);
  }

  // Strategy 5: At least 50% of query words match (up to 0.3)
  if (queryWords.some((word) => combinedText.includes(word))) {
    const matchingWords = queryWords.filter((word) => combinedText.includes(word));
    const matchRatio = matchingWords.length / queryWords.length;
    if (matchRatio >= 0.5) {
      potentialScores.push(0.3 * matchRatio);
    }
  }

  const score = potentialScores.length > 0 ? Math.max(...potentialScores) : 0;
  if (score < minScore) return 0;
  return Math.round(score * 100) / 100;
}

/**
 * Escapes only ILIKE wildcards (%, _, \) for use with bound parameters.
 *
 * Unlike `escapeLikePattern`, this does NOT strip commas, dots, or parens —
 * those characters are only meaningful in PostgREST filter strings (`.or()`),
 * not in bound parameters passed to `.rpc()` or `.ilike()`.
 *
 * Use this for:  `.rpc()` parameters, `.ilike()` method values
 * Use `escapeLikePattern` for:  `.or()` filter strings
 *
 * @param input - Raw user input
 * @returns String with ILIKE wildcards escaped, safe for bound parameters
 */
export function escapeIlikeWildcards(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
}
