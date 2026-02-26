/**
 * catalog-scoring utility tests
 *
 * Tests for the ILIKE escaping helpers that protect against wildcard injection
 * in PostgreSQL ILIKE patterns and PostgREST filter strings.
 *
 * escapeIlikeWildcards — for bound parameters (.rpc(), .ilike())
 * escapeLikePattern    — for PostgREST filter strings (.or())
 *
 * These functions are security-critical: incorrect escaping can cause
 * unintended broad matches or, in the PostgREST case, filter injection.
 */

import { describe, it, expect } from 'vitest';
import { escapeIlikeWildcards, escapeLikePattern } from '@/lib/catalog-scoring';

// =============================================================================
// escapeIlikeWildcards — bound parameter escaping (%, _, \)
// =============================================================================

describe('escapeIlikeWildcards', () => {
  describe('Wildcard escaping', () => {
    it('should escape percent sign', () => {
      expect(escapeIlikeWildcards('50% off')).toBe('50\\% off');
    });

    it('should escape underscore', () => {
      expect(escapeIlikeWildcards('trail_shoe')).toBe('trail\\_shoe');
    });

    it('should escape backslash first (prevents double-escaping of % and _)', () => {
      // If backslash is NOT escaped first: '\%' → '\\%' (correct: literal %)
      // If backslash IS escaped first: '\' → '\\', then '%' → '\%' separately
      // Correct order: \ → \\, then % → \%, then _ → \_
      expect(escapeIlikeWildcards('C:\\path')).toBe('C:\\\\path');
    });

    it('should escape all three wildcard characters in one string', () => {
      expect(escapeIlikeWildcards('50%_trail\\')).toBe('50\\%\\_trail\\\\');
    });

    it('should escape multiple percent signs', () => {
      expect(escapeIlikeWildcards('100% organic cotton%')).toBe('100\\% organic cotton\\%');
    });

    it('should escape multiple underscores', () => {
      expect(escapeIlikeWildcards('trail_run_shoe')).toBe('trail\\_run\\_shoe');
    });

    it('should escape multiple backslashes', () => {
      expect(escapeIlikeWildcards('a\\b\\c')).toBe('a\\\\b\\\\c');
    });
  });

  describe('Safe characters preserved', () => {
    it('should not modify normal query strings', () => {
      expect(escapeIlikeWildcards('rain jacket')).toBe('rain jacket');
    });

    it('should not modify queries with dots', () => {
      // Dots are NOT escaped by escapeIlikeWildcards (only by escapeLikePattern)
      expect(escapeIlikeWildcards('product.name')).toBe('product.name');
    });

    it('should not modify queries with commas', () => {
      expect(escapeIlikeWildcards('tent, stakes')).toBe('tent, stakes');
    });

    it('should not modify queries with parentheses', () => {
      expect(escapeIlikeWildcards('(lightweight) tent')).toBe('(lightweight) tent');
    });

    it('should not modify queries with hyphens', () => {
      expect(escapeIlikeWildcards('all-weather jacket')).toBe('all-weather jacket');
    });

    it('should not modify queries with numbers', () => {
      expect(escapeIlikeWildcards('MSR PocketRocket 2')).toBe('MSR PocketRocket 2');
    });

    it('should not modify queries with Unicode characters', () => {
      expect(escapeIlikeWildcards('Regenjacke Größe M')).toBe('Regenjacke Größe M');
    });
  });

  describe('Edge cases', () => {
    it('should return empty string unchanged', () => {
      expect(escapeIlikeWildcards('')).toBe('');
    });

    it('should handle whitespace-only strings', () => {
      expect(escapeIlikeWildcards('   ')).toBe('   ');
    });

    it('should handle strings that are only special characters', () => {
      expect(escapeIlikeWildcards('%_\\')).toBe('\\%\\_\\\\');
    });
  });

  describe('ILIKE correctness', () => {
    it('should produce patterns that match the literal string', () => {
      // A search for "trail_shoe" should match exactly "trail_shoe", not "trail shoe", etc.
      // The escaped pattern '%trail\\_shoe%' with ESCAPE '\\' matches literal underscore.
      // We verify the escape sequence is correct:
      const escaped = escapeIlikeWildcards('trail_shoe');
      // \_ is the correct escape for a literal underscore in PostgreSQL ILIKE
      expect(escaped).toContain('\\_');
      expect(escaped).not.toContain('__'); // no raw underscore wildcard
    });

    it('should escape backslash before percent to avoid double-escaping', () => {
      // Input: '\%' (literal backslash + literal percent)
      // Wrong order: escape % first → '\\\%' then escape \ → '\\\\\\%' (corrupted)
      // Right order: escape \ first → '\\\\' then escape % → '\\\\\\%' (correct: '\%')
      // Our function: \ → \\ first, then % → \% → result: '\\\%'
      const escaped = escapeIlikeWildcards('\\%');
      // Should be: '\\\%' — literal \ (\\\\) followed by literal % (\%)
      expect(escaped).toBe('\\\\\\%');
    });
  });
});

// =============================================================================
// escapeLikePattern — PostgREST filter string escaping (%, _, \, commas, dots, parens)
// =============================================================================

describe('escapeLikePattern', () => {
  describe('Wildcard escaping', () => {
    it('should escape percent sign', () => {
      expect(escapeLikePattern('50% off')).toBe('50\\% off');
    });

    it('should escape underscore', () => {
      expect(escapeLikePattern('trail_shoe')).toBe('trail\\_shoe');
    });

    it('should escape backslash', () => {
      expect(escapeLikePattern('C:\\path')).toBe('C:\\\\path');
    });
  });

  describe('PostgREST syntax character sanitization', () => {
    it('should strip commas (PostgREST OR separator)', () => {
      expect(escapeLikePattern('tent, stakes')).toBe('tent stakes');
    });

    it('should strip opening parentheses (PostgREST group syntax)', () => {
      // escapeLikePattern strips both ( and ) independently, so '(lightweight)' → 'lightweight'
      expect(escapeLikePattern('(lightweight)')).toBe('lightweight');
    });

    it('should strip closing parentheses (PostgREST group syntax)', () => {
      expect(escapeLikePattern('lightweight)')).toBe('lightweight');
    });

    it('should replace dots with spaces (prevents column.field injection)', () => {
      expect(escapeLikePattern('product.name')).toBe('product name');
    });

    it('should strip both parens in a group expression', () => {
      expect(escapeLikePattern('(lightweight) tent')).toBe('lightweight tent');
    });
  });

  describe('Difference from escapeIlikeWildcards', () => {
    it('should strip commas while escapeIlikeWildcards preserves them', () => {
      const input = 'tent, stakes';
      expect(escapeLikePattern(input)).toBe('tent stakes');
      expect(escapeIlikeWildcards(input)).toBe('tent, stakes');
    });

    it('should replace dots while escapeIlikeWildcards preserves them', () => {
      const input = 'product.name';
      expect(escapeLikePattern(input)).toBe('product name');
      expect(escapeIlikeWildcards(input)).toBe('product.name');
    });
  });

  describe('Edge cases', () => {
    it('should return empty string unchanged', () => {
      expect(escapeLikePattern('')).toBe('');
    });

    it('should handle strings with all special characters', () => {
      const result = escapeLikePattern('%_\\,().');
      // % → \%, _ → \_, \ → \\, , → '', ( → '', ) → '', . → ' '
      expect(result).toBe('\\%\\_\\\\ ');
    });
  });
});
