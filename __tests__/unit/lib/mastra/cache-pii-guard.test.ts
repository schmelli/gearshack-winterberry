/**
 * Cache PII Guard Unit Tests
 *
 * Tests for the semantic cache PII guard heuristic that detects personal
 * context in natural language queries. These patterns prevent GDPR/DSGVO
 * exposure when the intent router misclassifies personal queries.
 *
 * Test categories:
 * - English possessive + gear context
 * - German possessive + gear context
 * - Personal destination references
 * - Temporal planning references (EN + DE)
 * - First-person planning verbs
 * - Factual queries that should NOT trigger (false-positive avoidance)
 * - Edge cases and boundary conditions
 */

import { describe, it, expect } from 'vitest';
import {
  checkQueryForPersonalContext,
  queryContainsPersonalContext,
  PERSONAL_CONTEXT_PATTERNS,
} from '@/lib/mastra/cache-pii-guard';

// =============================================================================
// checkQueryForPersonalContext — Detailed Result Tests
// =============================================================================

describe('checkQueryForPersonalContext', () => {
  describe('English possessive + gear context', () => {
    it('should detect "my trip"', () => {
      const result = checkQueryForPersonalContext(
        'Best tent for my trip to the mountains'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });

    it('should detect "my loadout"', () => {
      const result = checkQueryForPersonalContext(
        'What should I add to my loadout?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });

    it('should detect "my gear"', () => {
      const result = checkQueryForPersonalContext('Is my gear waterproof enough?');
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });

    it('should detect "our tent"', () => {
      const result = checkQueryForPersonalContext(
        'Is our tent suitable for winter camping?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });

    it('should detect "my backpack"', () => {
      const result = checkQueryForPersonalContext(
        'How heavy is my backpack for this route?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });

    it('should detect "my sleeping bag"', () => {
      const result = checkQueryForPersonalContext(
        'Will my sleeping bag keep me warm at -10C?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
    });
  });

  describe('German possessive + gear context', () => {
    it('should detect "mein Zelt"', () => {
      const result = checkQueryForPersonalContext(
        'Ist mein Zelt für den Winter geeignet?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });

    it('should detect "meine Ausrüstung"', () => {
      const result = checkQueryForPersonalContext(
        'Reicht meine Ausrüstung für Patagonien?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });

    it('should detect "mein Rucksack"', () => {
      const result = checkQueryForPersonalContext(
        'Wie schwer ist mein Rucksack?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });

    it('should detect "unsere Packliste"', () => {
      const result = checkQueryForPersonalContext(
        'Was fehlt auf unsere Packliste?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });

    it('should detect "unserem Zelt" (dative declension)', () => {
      const result = checkQueryForPersonalContext(
        'Was stimmt mit unserem Zelt nicht?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });

    it('should detect "unseren Rucksack" (accusative declension)', () => {
      const result = checkQueryForPersonalContext(
        'Können wir unseren Rucksack leichter machen?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('possessive_gear_de');
    });
  });

  describe('Personal destination references', () => {
    it('should detect "to Patagonia"', () => {
      const result = checkQueryForPersonalContext(
        'Best tent for a trip to Patagonia'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('personal_destination');
    });

    it('should detect "nach München"', () => {
      const result = checkQueryForPersonalContext(
        'Ausrüstung für Wandern nach München'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('personal_destination');
    });

    it('should detect multi-word destinations "to Sierra Nevada"', () => {
      const result = checkQueryForPersonalContext(
        'Gear for hiking to Sierra Nevada'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('personal_destination');
    });

    it('should detect "nach Dolomiten"', () => {
      const result = checkQueryForPersonalContext(
        'Ausrüstung für Wandern nach Dolomiten'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('personal_destination');
    });

    it('should NOT match "for [BrandName]" (brand, not destination)', () => {
      // "for" is excluded from destination pattern to avoid brand false positives
      const result = checkQueryForPersonalContext(
        'Best alternatives for Osprey backpacks'
      );
      expect(result.matchedPatterns).not.toContain('personal_destination');
    });

    it('should NOT match "for Patagonia" (ambiguous — brand or place)', () => {
      // Patagonia is both a brand and a destination; "for" is too ambiguous
      const result = checkQueryForPersonalContext(
        'Gear for Patagonia expedition'
      );
      expect(result.matchedPatterns).not.toContain('personal_destination');
    });
  });

  describe('Temporal planning references (EN)', () => {
    it('should detect "next March"', () => {
      const result = checkQueryForPersonalContext(
        'I need a tent for next March'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_en');
    });

    it('should detect "this summer"', () => {
      const result = checkQueryForPersonalContext(
        'What sleeping bag for this summer?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_en');
    });

    it('should detect "next winter"', () => {
      const result = checkQueryForPersonalContext(
        'Tent for next winter expedition'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_en');
    });

    it('should NOT match "in winter" (factual seasonal reference)', () => {
      const result = checkQueryForPersonalContext(
        'Best boots in winter conditions'
      );
      // "in winter" is a factual seasonal qualifier, not personal planning
      expect(result.matchedPatterns).not.toContain('temporal_planning_en');
    });

    it('should NOT match "in February" (factual seasonal reference)', () => {
      const result = checkQueryForPersonalContext(
        'Average temperatures in February for alpine hiking'
      );
      expect(result.matchedPatterns).not.toContain('temporal_planning_en');
    });
  });

  describe('Temporal planning references (DE)', () => {
    it('should detect "im Februar"', () => {
      const result = checkQueryForPersonalContext(
        'Bestes Zelt für Wandern im Februar'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_de');
    });

    it('should detect "nächsten März"', () => {
      const result = checkQueryForPersonalContext(
        'Schlafsack für nächsten März'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_de');
    });

    it('should detect "diesen Sommer"', () => {
      const result = checkQueryForPersonalContext(
        'Was brauche ich diesen Sommer?'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('temporal_planning_de');
    });
  });

  describe('First-person planning verbs', () => {
    it('should detect "I plan to"', () => {
      const result = checkQueryForPersonalContext(
        'I plan to hike the PCT next year'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "I\'m going"', () => {
      const result = checkQueryForPersonalContext(
        "I'm going camping in Yosemite"
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "ich brauche"', () => {
      const result = checkQueryForPersonalContext(
        'Ich brauche einen neuen Schlafsack'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "ich möchte"', () => {
      const result = checkQueryForPersonalContext(
        'Ich möchte leichtere Ausrüstung kaufen'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "I need"', () => {
      const result = checkQueryForPersonalContext(
        'I need a waterproof jacket for the Alps'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "I am going" (uncontracted form)', () => {
      const result = checkQueryForPersonalContext(
        'I am going camping in the mountains'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "we need"', () => {
      const result = checkQueryForPersonalContext(
        'We need a bigger tent for the group'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "we plan"', () => {
      const result = checkQueryForPersonalContext(
        'We plan to hike the Appalachian Trail'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });

    it('should detect "wir brauchen" (DE plural)', () => {
      const result = checkQueryForPersonalContext(
        'Wir brauchen ein neues Zelt'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns).toContain('first_person_planning');
    });
  });

  describe('Multiple pattern matches', () => {
    it('should detect multiple patterns in a single query', () => {
      const result = checkQueryForPersonalContext(
        'Best tent for my trip to Patagonia next February'
      );
      expect(result.containsPersonalContext).toBe(true);
      expect(result.matchedPatterns.length).toBeGreaterThanOrEqual(2);
      expect(result.matchedPatterns).toContain('possessive_gear_en');
      expect(result.matchedPatterns).toContain('personal_destination');
      expect(result.matchedPatterns).toContain('temporal_planning_en');
    });
  });

  describe('Factual queries — should NOT trigger (false positives)', () => {
    it('should allow "Difference between Gore-Tex and eVent"', () => {
      const result = checkQueryForPersonalContext(
        'What is the difference between Gore-Tex and eVent membranes?'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Best ultralight tent under 2kg"', () => {
      const result = checkQueryForPersonalContext(
        'Best ultralight tent under 2kg'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "How much does a Nemo Hornet 2P weigh?"', () => {
      const result = checkQueryForPersonalContext(
        'How much does a Nemo Hornet 2P weigh?'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Was ist der Unterschied zwischen Daune und Kunstfaser?"', () => {
      const result = checkQueryForPersonalContext(
        'Was ist der Unterschied zwischen Daune und Kunstfaser?'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Top 5 sleeping pads for thru-hiking"', () => {
      const result = checkQueryForPersonalContext(
        'Top 5 sleeping pads for thru-hiking'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Compare MSR Hubba Hubba vs Big Agnes Copper Spur"', () => {
      const result = checkQueryForPersonalContext(
        'Compare MSR Hubba Hubba vs Big Agnes Copper Spur'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Welches Material ist besser für Regenjacken?"', () => {
      const result = checkQueryForPersonalContext(
        'Welches Material ist besser für Regenjacken?'
      );
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should allow "Best sleeping bag in winter" (factual seasonal)', () => {
      const result = checkQueryForPersonalContext(
        'Best sleeping bag in winter'
      );
      expect(result.containsPersonalContext).toBe(false);
    });

    it('should allow "Gore-Tex performance in summer heat"', () => {
      const result = checkQueryForPersonalContext(
        'Gore-Tex performance in summer heat'
      );
      expect(result.containsPersonalContext).toBe(false);
    });

    it('should allow "Best alternatives for Osprey backpacks" (brand name)', () => {
      const result = checkQueryForPersonalContext(
        'Best alternatives for Osprey backpacks'
      );
      expect(result.containsPersonalContext).toBe(false);
    });

    it('should allow "Similar products for Thermarest pads" (brand name)', () => {
      const result = checkQueryForPersonalContext(
        'Similar products for Thermarest pads'
      );
      expect(result.containsPersonalContext).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string', () => {
      const result = checkQueryForPersonalContext('');
      expect(result.containsPersonalContext).toBe(false);
      expect(result.matchedPatterns).toHaveLength(0);
    });

    it('should handle single word', () => {
      const result = checkQueryForPersonalContext('tent');
      expect(result.containsPersonalContext).toBe(false);
    });

    it('should be case-insensitive for possessives', () => {
      const result = checkQueryForPersonalContext('MY TENT is the best');
      expect(result.containsPersonalContext).toBe(true);
    });

    it('should not match cross-language possessives (DE possessive + EN noun)', () => {
      // "mein tent" doesn't match — DE pattern requires DE gear nouns,
      // EN pattern requires EN possessives. This is by design: mixed-language
      // edge cases are rare and not worth the false-positive risk.
      const result = checkQueryForPersonalContext(
        'Ist mein tent good for winter?'
      );
      expect(result.containsPersonalContext).toBe(false);
    });
  });
});

// =============================================================================
// queryContainsPersonalContext — Boolean Convenience API
// =============================================================================

describe('queryContainsPersonalContext', () => {
  it('should return true for personal queries', () => {
    expect(queryContainsPersonalContext('Best tent for my trip')).toBe(true);
  });

  it('should return false for factual queries', () => {
    expect(
      queryContainsPersonalContext('Difference between Gore-Tex and eVent')
    ).toBe(false);
  });

  it('should return true for German personal queries', () => {
    expect(
      queryContainsPersonalContext('Bestes Zelt für mein Trip')
    ).toBe(true);
  });

  it('should return false for empty string', () => {
    expect(queryContainsPersonalContext('')).toBe(false);
  });
});

// =============================================================================
// PERSONAL_CONTEXT_PATTERNS — Structural Tests
// =============================================================================

describe('PERSONAL_CONTEXT_PATTERNS', () => {
  it('should export a non-empty array of patterns', () => {
    expect(PERSONAL_CONTEXT_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have unique pattern names', () => {
    const names = PERSONAL_CONTEXT_PATTERNS.map((p) => p.name);
    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(names.length);
  });

  it('should have valid RegExp patterns', () => {
    for (const { name, pattern } of PERSONAL_CONTEXT_PATTERNS) {
      expect(pattern).toBeInstanceOf(RegExp);
      // Verify each pattern can execute without error
      expect(() => pattern.test('test string')).not.toThrow();
      // Patterns should have a source (not empty)
      expect(pattern.source.length).toBeGreaterThan(0);
      // Verify the name is a non-empty string
      expect(name.length).toBeGreaterThan(0);
    }
  });
});
