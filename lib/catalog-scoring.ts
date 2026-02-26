/**
 * Shared catalog scoring utilities
 *
 * Extracted from lib/supabase/catalog.ts and lib/vision-catalog-matcher.ts
 * to deduplicate the escapeLikePattern helper.
 */

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
