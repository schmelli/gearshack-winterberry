/**
 * Unit Tests: parseEnvInt utility
 *
 * Guards against the `parseInt() || defaultVal` falsy-zero bug where setting
 * an env var to "0" (to disable a feature flag / filter) was silently ignored
 * because `parseInt('0') || 1` evaluates to 1 in JavaScript.
 *
 * See PR #260 review — "parseInt() || fallback prevents 0 from disabling filters"
 */

import { describe, it, expect } from 'vitest';
import { parseEnvInt } from '@/lib/utils/parse-env-int';

describe('parseEnvInt', () => {
  // ---------------------------------------------------------------------------
  // Default fallback (undefined / missing env var)
  // ---------------------------------------------------------------------------

  describe('undefined input (env var not set)', () => {
    it('returns the default when raw is undefined', () => {
      expect(parseEnvInt(undefined, 24)).toBe(24);
    });

    it('returns 1 as default when raw is undefined', () => {
      expect(parseEnvInt(undefined, 1)).toBe(1);
    });

    it('returns 0 as default when raw is undefined and default is 0', () => {
      expect(parseEnvInt(undefined, 0)).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Zero — the critical case that the || fallback gets wrong
  // ---------------------------------------------------------------------------

  describe('zero ("0") — must NOT fall back to default', () => {
    it('returns 0 when raw is "0" (disable filter)', () => {
      // This is the key regression test.
      // parseInt('0') || 1  →  1  ← WRONG (old behaviour)
      // parseEnvInt('0', 1) →  0  ← CORRECT (new behaviour)
      expect(parseEnvInt('0', 1)).toBe(0);
    });

    it('returns 0 when raw is "0" and default is 24', () => {
      expect(parseEnvInt('0', 24)).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Valid positive integers
  // ---------------------------------------------------------------------------

  describe('valid positive integer strings', () => {
    it('returns 1 for "1"', () => {
      expect(parseEnvInt('1', 24)).toBe(1);
    });

    it('returns 2 for "2"', () => {
      expect(parseEnvInt('2', 1)).toBe(2);
    });

    it('returns 24 for "24"', () => {
      expect(parseEnvInt('24', 1)).toBe(24);
    });

    it('returns 100 for "100"', () => {
      expect(parseEnvInt('100', 1)).toBe(100);
    });
  });

  // ---------------------------------------------------------------------------
  // Negative values — clamped to 0 (no negative filter thresholds)
  // ---------------------------------------------------------------------------

  describe('negative values are clamped to 0', () => {
    it('clamps "-1" to 0', () => {
      expect(parseEnvInt('-1', 1)).toBe(0);
    });

    it('clamps "-5" to 0', () => {
      expect(parseEnvInt('-5', 24)).toBe(0);
    });
  });

  // ---------------------------------------------------------------------------
  // Non-numeric / invalid input — falls back to default
  // ---------------------------------------------------------------------------

  describe('non-numeric input falls back to default', () => {
    it('returns default for alphabetic string', () => {
      expect(parseEnvInt('abc', 1)).toBe(1);
    });

    it('returns default for empty string', () => {
      // parseInt('') returns NaN → falls back to default
      expect(parseEnvInt('', 24)).toBe(24);
    });

    it('returns default for whitespace-only string', () => {
      expect(parseEnvInt('   ', 1)).toBe(1);
    });

    it('returns default for "NaN" string', () => {
      expect(parseEnvInt('NaN', 1)).toBe(1);
    });

    it('returns default for "undefined" literal string', () => {
      expect(parseEnvInt('undefined', 24)).toBe(24);
    });
  });

  // ---------------------------------------------------------------------------
  // Edge cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles "0.9" (parseInt ignores fractional part → 0)', () => {
      expect(parseEnvInt('0.9', 1)).toBe(0);
    });

    it('handles "3.7" (parseInt ignores fractional part → 3)', () => {
      expect(parseEnvInt('3.7', 1)).toBe(3);
    });

    it('handles "10px" (parseInt stops at first non-digit → 10)', () => {
      expect(parseEnvInt('10px', 1)).toBe(10);
    });
  });
});
