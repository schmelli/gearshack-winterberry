/**
 * Shared catalog scoring utilities
 *
 * Extracted from lib/supabase/catalog.ts and lib/vision-catalog-matcher.ts
 * to deduplicate the escapeLikePattern helper.
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
 * Also prevents PostgREST filter injection via commas, parens, and dots.
 * @param input - Raw user input
 * @returns Escaped string safe for LIKE patterns and .or() filter strings
 */
export function escapeLikePattern(input: string): string {
  return input
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    .replace(/,/g, '')
    .replace(/\(/g, '')
    .replace(/\)/g, '')
    .replace(/\./g, ' ');
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
