/**
 * Semantic Cache Integration Tests
 *
 * Tests for `storeInSemanticCache` to verify that the PII guard correctly
 * gates cache writes at the storage layer. These tests are deliberately
 * separate from the PII guard unit tests (cache-pii-guard.test.ts) because
 * they validate the *integration* between semantic-cache.ts and the guard:
 * if the import or call were accidentally removed, the PII guard unit tests
 * would still pass while these tests would catch the regression.
 *
 * All external dependencies (Supabase client, AI gateway) are mocked so these
 * tests remain fast, deterministic, and runnable without network access.
 */

import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest';

// ---------------------------------------------------------------------------
// vi.hoisted() — runs first, before vi.mock() factories and before imports.
// Use it to (a) set env vars that module-level constants like CACHE_ENABLED
// read at initialisation time, and (b) create mock handles that the vi.mock()
// factories reference below.
// ---------------------------------------------------------------------------
const { mockUpsert, mockFrom, mockRpc } = vi.hoisted(() => {
  // Ensure CACHE_ENABLED = true and _embeddingApiKey is non-empty when the
  // module is first imported. These constants are frozen at module load time.
  process.env.RESPONSE_CACHE_ENABLED = 'true';
  process.env.AI_GATEWAY_API_KEY = 'test-api-key-for-semantic-cache-tests';

  const mockUpsert = vi.fn().mockResolvedValue({ error: null });
  const mockFrom = vi.fn(() => ({ upsert: mockUpsert }));
  const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
  return { mockUpsert, mockFrom, mockRpc };
});

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before the SUT is imported
// ---------------------------------------------------------------------------

// Mock the Supabase server client so we can assert whether upsert is called.
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockFrom,
    rpc: mockRpc,
  }),
}));

// Mock the AI gateway so no embedding API calls are made.
// textEmbeddingModel must return a non-null value so the embed() call resolves.
vi.mock('@ai-sdk/gateway', () => ({
  createGateway: vi.fn(() => ({
    textEmbeddingModel: vi.fn(() => 'mock-embedding-model'),
  })),
}));

// Mock the AI SDK embed() — returns a dummy 3-element vector.
vi.mock('ai', () => ({
  embed: vi.fn().mockResolvedValue({ embedding: [0.1, 0.2, 0.3] }),
}));

// Mock the metrics module to prevent Prometheus registry side effects and
// to allow spying on recordCachePiiSkip.
vi.mock('@/lib/mastra/metrics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mastra/metrics')>();
  return {
    ...actual,
    recordCachePiiSkip: vi.fn(),
    recordCacheStore: vi.fn(),
    recordCacheLatency: vi.fn(),
    recordCacheHit: vi.fn(),
    recordCacheMiss: vi.fn(),
  };
});

// ---------------------------------------------------------------------------
// Now import the module under test and mocked helpers
// ---------------------------------------------------------------------------

import { storeInSemanticCache } from '@/lib/mastra/semantic-cache';
import * as metrics from '@/lib/mastra/metrics';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('storeInSemanticCache — PII guard integration', () => {
  let recordCachePiiSkipSpy: MockInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-prime upsert mock after clearAllMocks resets return values
    mockUpsert.mockResolvedValue({ error: null });
    recordCachePiiSkipSpy = vi.spyOn(metrics, 'recordCachePiiSkip');
  });

  describe('PII guard blocks cache write', () => {
    it('should NOT call upsert when query contains possessive gear context', async () => {
      await storeInSemanticCache(
        'Best tent for my trip to the Alps',
        'Here are the best tents for alpine camping: '.repeat(5), // > 50 chars
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should NOT call upsert when query contains personal destination', async () => {
      await storeInSemanticCache(
        'Gear recommendations for hiking to Patagonia',
        'For Patagonia hiking, you will need waterproof gear with at least 20,000mm hydrostatic head.',
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should NOT call upsert when query contains temporal planning reference', async () => {
      await storeInSemanticCache(
        'What sleeping bag do I need for next March in the Alps?',
        'For March alpine conditions, a sleeping bag rated to -10°C is recommended.',
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should NOT call upsert when query contains first-person planning verbs', async () => {
      await storeInSemanticCache(
        "I'm going camping in Yosemite next summer — what gear should I bring?",
        'For Yosemite camping in summer, you will need the following gear...',
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should NOT call upsert for German personal query', async () => {
      await storeInSemanticCache(
        'Ich brauche einen neuen Schlafsack für diesen Sommer',
        'Für den Sommer empfehlen sich Schlafsäcke mit einer Komforttemperatur von +15°C.',
        'general_knowledge',
        'de'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('should call recordCachePiiSkip for each matched pattern', async () => {
      // This query matches possessive_gear_en + personal_destination + temporal_planning_en
      await storeInSemanticCache(
        'Best tent for my trip to Patagonia next February',
        'For Patagonia in February, a four-season tent is highly recommended.',
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
      // Should be called exactly once per matched pattern (3 patterns match)
      expect(recordCachePiiSkipSpy).toHaveBeenCalledTimes(3);
      const calledWith = recordCachePiiSkipSpy.mock.calls.map(
        ([p]: [string]) => p
      );
      expect(calledWith).toContain('possessive_gear_en');
      expect(calledWith).toContain('personal_destination');
      expect(calledWith).toContain('temporal_planning_en');
    });

    it('should call recordCachePiiSkip exactly once for a single-pattern match', async () => {
      // Only first_person_planning matches
      await storeInSemanticCache(
        'I need a waterproof jacket for mountain conditions',
        'For mountain conditions, a waterproof jacket with at least 20,000mm HH is recommended.',
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).not.toHaveBeenCalled();
      expect(recordCachePiiSkipSpy).toHaveBeenCalledTimes(1);
      expect(recordCachePiiSkipSpy).toHaveBeenCalledWith('first_person_planning');
    });
  });

  describe('PII guard allows cache write for factual queries', () => {
    it('should call upsert for a fully factual query', async () => {
      const factualQuery = 'What is the difference between Gore-Tex and eVent membranes?';
      const longResponse =
        'Gore-Tex and eVent are both ePTFE membranes used in waterproof breathable fabrics. ' +
        'Gore-Tex uses a polyurethane (PU) coating over the ePTFE membrane for durability, ' +
        'while eVent uses an oil treatment to keep pores open for direct vapour transmission. ' +
        'eVent typically offers slightly better breathability under sustained aerobic output.';

      await storeInSemanticCache(
        factualQuery,
        longResponse,
        'general_knowledge',
        'en'
      );

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(recordCachePiiSkipSpy).not.toHaveBeenCalled();
    });

    it('should call upsert for a German factual query', async () => {
      await storeInSemanticCache(
        'Was ist der Unterschied zwischen Daune und Kunstfaser?',
        'Daune bietet das beste Wärme-Gewicht-Verhältnis, verliert aber bei Nässe an Isolationskraft. ' +
          'Kunstfaser isoliert auch nass und trocknet schneller, ist aber schwerer und weniger kompressibel. ' +
          'Für Hochtouren mit Schneerisiko empfiehlt sich Kunstfaser oder Daune mit DWR-Beschichtung.',
        'general_knowledge',
        'de'
      );

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(recordCachePiiSkipSpy).not.toHaveBeenCalled();
    });

    it('should call upsert for a factual gear comparison', async () => {
      await storeInSemanticCache(
        'Compare MSR Hubba Hubba vs Big Agnes Copper Spur weight and packed size',
        'MSR Hubba Hubba NX 2: 1.76 kg, packed 23×15 cm. ' +
          'Big Agnes Copper Spur HV UL2: 1.13 kg, packed 18×13 cm. ' +
          'The Copper Spur is significantly lighter and packs smaller, though both are freestanding double-wall designs.',
        'gear_comparison',
        'en'
      );

      expect(mockUpsert).toHaveBeenCalledTimes(1);
      expect(recordCachePiiSkipSpy).not.toHaveBeenCalled();
    });
  });
});
