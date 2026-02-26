/**
 * Utility: parseEnvInt
 *
 * Parses an optional environment variable string as a non-negative integer
 * with a type-safe fallback.
 *
 * Why Number.isNaN() instead of `|| defaultVal`:
 *   The `||` operator treats 0 as falsy, so `parseInt('0') || 1` evaluates
 *   to 1, silently ignoring a deliberately-set value of 0 (e.g., to disable
 *   a filter). Number.isNaN() only falls back on genuinely invalid input
 *   (undefined → uses defaultVal string, empty string, non-numeric text),
 *   while correctly preserving 0 as a valid, meaningful value.
 *
 * @example
 *   parseEnvInt(undefined, 24)         // → 24  (env var not set)
 *   parseEnvInt('0', 1)                // → 0   (disable filter — ||1 would return 1 incorrectly)
 *   parseEnvInt('3', 1)                // → 3   (explicit positive threshold)
 *   parseEnvInt('abc', 1)              // → 1   (non-numeric → fallback)
 *   parseEnvInt('-5', 24)              // → 0   (clamped to 0)
 */
export function parseEnvInt(raw: string | undefined, defaultVal: number): number {
  // Early-return for absent or blank input — avoids parseInt(String(defaultVal)) round-trip
  if (!raw?.trim()) return defaultVal;
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) ? defaultVal : Math.max(0, parsed);
}
