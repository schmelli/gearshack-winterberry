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
