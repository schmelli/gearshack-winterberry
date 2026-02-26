/**
 * Unit Tests: parseEnvInt — pure utility function
 * Module: lib/utils/parse-env-int.ts
 *
 * Tests that `parseEnvInt` correctly handles all edge cases when parsing
 * integer environment variables, in particular that explicit `0` is preserved
 * rather than overridden by a falsy-check fallback (the `|| defaultValue`
 * anti-pattern that motivated this utility).
 */

import { describe, it, expect } from 'vitest';
import { parseEnvInt } from '@/lib/utils/parse-env-int';

describe('parseEnvInt', () => {
  // =========================================================================
  // Absent / empty input → use default
  // =========================================================================

  it('returns defaultValue when raw is undefined', () => {
    expect(parseEnvInt(undefined, 5)).toBe(5);
  });

  it('returns defaultValue when raw is an empty string', () => {
    expect(parseEnvInt('', 5)).toBe(5);
  });

  it('returns defaultValue when raw is a whitespace string', () => {
    // parseInt('  ', 10) === NaN
    expect(parseEnvInt('  ', 5)).toBe(5);
  });

  // =========================================================================
  // Non-numeric input → use default
  // =========================================================================

  it('returns defaultValue for a non-numeric string like "abc"', () => {
    expect(parseEnvInt('abc', 5)).toBe(5);
  });

  it('returns defaultValue for a float string like "3.7"', () => {
    // parseInt('3.7') === 3, which IS numeric, so this parses to 3
    expect(parseEnvInt('3.7', 5)).toBe(3);
  });

  it('returns defaultValue for NaN-producing input', () => {
    expect(parseEnvInt('NaN', 5)).toBe(5);
  });

  it('returns defaultValue for "Infinity"', () => {
    // parseInt('Infinity') === NaN
    expect(parseEnvInt('Infinity', 5)).toBe(5);
  });

  // =========================================================================
  // Valid integers → parsed value
  // =========================================================================

  it('returns parsed integer for a valid numeric string', () => {
    expect(parseEnvInt('3', 5)).toBe(3);
  });

  it('returns 1 when raw is "1"', () => {
    expect(parseEnvInt('1', 5)).toBe(1);
  });

  it('returns 24 when raw is "24"', () => {
    expect(parseEnvInt('24', 99)).toBe(24);
  });

  it('returns large positive integers correctly', () => {
    expect(parseEnvInt('9999', 1)).toBe(9999);
  });

  // =========================================================================
  // CRITICAL: `0` must be preserved — not overridden to default
  // =========================================================================
  // This is the primary motivation for the utility. The `|| defaultValue`
  // anti-pattern would incorrectly return `defaultValue` here because `0`
  // is falsy in JavaScript.

  it('returns 0 when raw is "0" (explicit disable signal must be preserved)', () => {
    // This is the key test — parseInt('0') === 0, which is falsy, but valid.
    // `0 || defaultValue` would WRONGLY return `defaultValue`.
    expect(parseEnvInt('0', 5)).toBe(0);
  });

  it('returns 0 for "0" regardless of defaultValue', () => {
    expect(parseEnvInt('0', 1)).toBe(0);
    expect(parseEnvInt('0', 24)).toBe(0);
    expect(parseEnvInt('0', 100)).toBe(0);
  });

  // =========================================================================
  // Negative integers → clamped to 0
  // =========================================================================

  it('clamps negative values to 0', () => {
    expect(parseEnvInt('-1', 5)).toBe(0);
  });

  it('clamps large negative values to 0', () => {
    expect(parseEnvInt('-999', 5)).toBe(0);
  });

  // =========================================================================
  // Default value edge cases
  // =========================================================================

  it('returns 0 defaultValue correctly when input is absent', () => {
    expect(parseEnvInt(undefined, 0)).toBe(0);
  });

  it('handles defaultValue of 0 with non-numeric input', () => {
    expect(parseEnvInt('abc', 0)).toBe(0);
  });
});
