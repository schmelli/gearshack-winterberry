/**
 * Shared catalog scoring utilities
 *
 * Extracted from lib/supabase/catalog.ts and lib/vision-catalog-matcher.ts
 * to deduplicate the escapeLikePattern helper and scoring logic.
 */

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
