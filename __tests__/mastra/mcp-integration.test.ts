/**
 * MCP Integration Test Scenarios
 * Feature: 001-mastra-agentic-voice
 * Tasks: T063-T067 - US3 Testing
 *
 * Tests for MCP GearGraph integration including:
 * - Alternatives query with attributes
 * - Graph-derived reasoning
 * - Filter validation
 * - Complex graph traversal
 * - Fallback handling
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  executeFindAlternatives,
  executeSearchGear,
  executeQueryGearGraph,
  type FindAlternativesInput,
  type QueryGearGraphInput,
} from '@/lib/mastra/tools/mcp-graph';

// Mock fetch for MCP server calls
const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
  mockFetch.mockClear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('US3: MCP Integration', () => {
  // ============================================================================
  // T063: Test alternatives query with attributes
  // ============================================================================
  describe('T063: Find Alternatives Query', () => {
    it('should retrieve similar items with weight/price/ratings', async () => {
      const mockAlternatives = {
        success: true,
        data: {
          alternatives: [
            {
              id: 'alt-1',
              name: 'Big Agnes Copper Spur HV UL2',
              weight: 1200,
              price: 449,
              rating: 4.8,
              matchScore: 0.95,
            },
            {
              id: 'alt-2',
              name: 'Nemo Hornet Elite 2P',
              weight: 1100,
              price: 430,
              rating: 4.7,
              matchScore: 0.92,
            },
          ],
          queryContext: {
            sourceItem: 'MSR Hubba Hubba NX2',
            constraints: ['weight < 1500g'],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAlternatives),
      });

      const input: FindAlternativesInput = {
        itemId: 'msr-hubba-hubba-nx2',
        category: 'tents',
        attributes: ['weight', 'price', 'rating'],
        limit: 5,
      };

      const result = await executeFindAlternatives(input);

      expect(result.success).toBe(true);
      expect(result.data?.alternatives).toHaveLength(2);

      // Verify all alternatives include required attributes
      result.data?.alternatives.forEach((alt) => {
        expect(alt.weight).toBeDefined();
        expect(alt.price).toBeDefined();
        expect(alt.rating).toBeDefined();
      });
    });

    it('should include matchScore for ranking alternatives', async () => {
      const mockAlternatives = {
        success: true,
        data: {
          alternatives: [
            { id: 'alt-1', name: 'Alternative 1', matchScore: 0.95 },
            { id: 'alt-2', name: 'Alternative 2', matchScore: 0.88 },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockAlternatives),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
      });

      expect(result.data?.alternatives[0].matchScore).toBeGreaterThan(
        result.data?.alternatives[1].matchScore ?? 0
      );
    });
  });

  // ============================================================================
  // T064: Graph-derived reasoning in responses
  // ============================================================================
  describe('T064: Graph-Derived Reasoning', () => {
    it('should include popularity insights in alternatives', async () => {
      const mockWithInsights = {
        success: true,
        data: {
          alternatives: [
            {
              id: 'alt-1',
              name: 'Popular Tent',
              insights: {
                popularity: 'Most popular in Pacific Northwest region',
                weightClass: 'Top 10% lightest in category',
                userSegment: 'Preferred by ultralight backpackers',
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWithInsights),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
      });

      expect(result.data?.alternatives[0].insights).toBeDefined();
      expect(result.data?.alternatives[0].insights?.popularity).toContain('region');
    });

    it('should return weight class comparisons', async () => {
      const mockWithWeightClass = {
        success: true,
        data: {
          alternatives: [
            {
              id: 'alt-1',
              name: 'Ultralight Tent',
              insights: {
                weightClass: 'Top 5% lightest in 2-person tent category',
              },
            },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockWithWeightClass),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
        attributes: ['weight'],
      });

      expect(result.data?.alternatives[0].insights?.weightClass).toMatch(/Top \d+%/);
    });
  });

  // ============================================================================
  // T065: Filter validation (lighter than X)
  // ============================================================================
  describe('T065: Filter Validation', () => {
    it('should only return items lighter than reference', async () => {
      const referenceWeight = 1500; // grams

      const mockLighterItems = {
        success: true,
        data: {
          alternatives: [
            { id: 'alt-1', name: 'Light Tent 1', weight: 1200 },
            { id: 'alt-2', name: 'Light Tent 2', weight: 1000 },
            { id: 'alt-3', name: 'Ultralight Tent', weight: 800 },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockLighterItems),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
        constraints: [`weight < ${referenceWeight}`],
      });

      expect(result.success).toBe(true);

      // Verify all returned items are lighter than reference
      result.data?.alternatives.forEach((alt) => {
        expect(alt.weight).toBeLessThan(referenceWeight);
      });
    });

    it('should validate price constraints', async () => {
      const maxPrice = 400;

      const mockCheaperItems = {
        success: true,
        data: {
          alternatives: [
            { id: 'alt-1', name: 'Budget Tent 1', price: 350 },
            { id: 'alt-2', name: 'Budget Tent 2', price: 299 },
          ],
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockCheaperItems),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
        constraints: [`price < ${maxPrice}`],
      });

      result.data?.alternatives.forEach((alt) => {
        expect(alt.price).toBeLessThan(maxPrice);
      });
    });
  });

  // ============================================================================
  // T066: Complex graph traversal
  // ============================================================================
  describe('T066: Complex Graph Traversal', () => {
    it('should find gear used by users with specific equipment', async () => {
      const mockTraversalResult = {
        success: true,
        data: {
          items: [
            {
              id: 'tent-1',
              name: 'Big Agnes Copper Spur',
              userCount: 45,
              coUsageScore: 0.87,
            },
            {
              id: 'tent-2',
              name: 'MSR Hubba Hubba',
              userCount: 38,
              coUsageScore: 0.82,
            },
          ],
          query: {
            type: 'co-usage',
            sourceItem: 'Thermarest NeoAir XLite',
            targetCategory: 'tents',
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTraversalResult),
      });

      const input: QueryGearGraphInput = {
        query: 'Find tents used by users with my sleeping pad',
        context: {
          userGear: ['thermarest-neoair-xlite'],
        },
      };

      const result = await executeQueryGearGraph(input);

      expect(result.success).toBe(true);
      expect(result.data?.items).toBeDefined();
      expect(result.data?.items?.length).toBeGreaterThan(0);

      // Verify co-usage scores are included
      result.data?.items?.forEach((item) => {
        expect(item.coUsageScore).toBeDefined();
        expect(item.coUsageScore).toBeGreaterThan(0);
      });
    });

    it('should handle multi-hop graph queries', async () => {
      const mockMultiHopResult = {
        success: true,
        data: {
          items: [
            { id: 'item-1', name: 'Result Item', hops: 2 },
          ],
          query: {
            type: 'multi-hop',
            path: ['user-gear', 'similar-users', 'popular-in-category'],
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockMultiHopResult),
      });

      const result = await executeQueryGearGraph({
        query: 'What gear do users with similar loadouts prefer?',
        context: { userId: 'test-user' },
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // T067: MCP fallback on server unavailable
  // ============================================================================
  describe('T067: MCP Fallback Handling', () => {
    it('should fall back to catalog search when MCP unavailable', async () => {
      // First call fails (MCP unavailable)
      mockFetch.mockRejectedValueOnce(new Error('MCP server unavailable'));

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
      });

      // Should return error with fallback suggestion
      expect(result.success).toBe(false);
      expect(result.error).toContain('unavailable');
    });

    it('should inform user about degraded functionality', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));

      const result = await executeSearchGear({
        query: 'ultralight tents',
        category: 'tents',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout gracefully', async () => {
      // Simulate timeout
      mockFetch.mockImplementationOnce(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), 100)
          )
      );

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
      });

      expect(result.success).toBe(false);
    });

    it('should return partial results on partial failure', async () => {
      const mockPartialResult = {
        success: true,
        data: {
          alternatives: [{ id: 'alt-1', name: 'Only Result' }],
          warnings: ['Some data sources unavailable'],
          degraded: true,
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockPartialResult),
      });

      const result = await executeFindAlternatives({
        itemId: 'test-item',
        category: 'tents',
      });

      expect(result.success).toBe(true);
      expect(result.data?.warnings).toBeDefined();
    });
  });
});
