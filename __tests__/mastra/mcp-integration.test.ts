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
import { mcpClient } from '@/lib/mastra/mcp-client';

// Mock the MCP client
vi.mock('@/lib/mastra/mcp-client', () => ({
  mcpClient: {
    callTool: vi.fn(),
  },
}));

const mockCallTool = vi.mocked(mcpClient.callTool);

beforeEach(() => {
  mockCallTool.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('US3: MCP Integration', () => {
  // ============================================================================
  // T063: Test alternatives query with attributes
  // ============================================================================
  describe('T063: Find Alternatives Query', () => {
    it('should retrieve similar items with weight/price/ratings', async () => {
      const mockAlternatives = {
        itemName: 'MSR Hubba Hubba NX2',
        alternatives: [
          {
            id: 'alt-1',
            name: 'Big Agnes Copper Spur HV UL2',
            brand: 'Big Agnes',
            category: 'tents',
            weightGrams: 1200,
            priceAmount: 449,
            priceCurrency: 'USD',
            rating: 4.8,
            reviewCount: 120,
            imageUrl: null,
            reason: '34% lighter',
          },
          {
            id: 'alt-2',
            name: 'Nemo Hornet Elite 2P',
            brand: 'Nemo',
            category: 'tents',
            weightGrams: 1100,
            priceAmount: 430,
            priceCurrency: 'USD',
            rating: 4.7,
            reviewCount: 85,
            imageUrl: null,
            reason: 'Top rated in category',
          },
        ],
        totalFound: 2,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockAlternatives,
        error: null,
      });

      const input: FindAlternativesInput = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        criteria: 'lighter',
        maxResults: 5,
      };

      const result = await executeFindAlternatives(input);

      expect(result.success).toBe(true);
      expect(result.alternatives).toHaveLength(2);

      // Verify all alternatives include required attributes
      result.alternatives.forEach((alt) => {
        expect(alt.weightGrams).toBeDefined();
        expect(alt.priceAmount).toBeDefined();
        expect(alt.rating).toBeDefined();
      });
    });

    it('should include reason for ranking alternatives', async () => {
      const mockAlternatives = {
        itemName: 'Test Item',
        alternatives: [
          { id: 'alt-1', name: 'Alternative 1', reason: '50% lighter' },
          { id: 'alt-2', name: 'Alternative 2', reason: 'Better value' },
        ],
        totalFound: 2,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockAlternatives,
        error: null,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440001',
      });

      expect(result.success).toBe(true);
      expect(result.alternatives[0].reason).toBe('50% lighter');
      expect(result.alternatives[1].reason).toBe('Better value');
    });
  });

  // ============================================================================
  // T064: Graph-derived reasoning in responses
  // ============================================================================
  describe('T064: Graph-Derived Reasoning', () => {
    it('should include popularity insights in alternatives', async () => {
      const mockWithInsights = {
        itemName: 'Popular Tent',
        alternatives: [
          {
            id: 'alt-1',
            name: 'Popular Tent',
            brand: 'TestBrand',
            category: 'tents',
            reason: 'Most popular in Pacific Northwest region - Top 10% lightest',
          },
        ],
        totalFound: 1,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockWithInsights,
        error: null,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440002',
      });

      expect(result.success).toBe(true);
      expect(result.alternatives[0].reason).toContain('popular');
    });

    it('should return weight class comparisons in reason', async () => {
      const mockWithWeightClass = {
        itemName: 'Ultralight Tent',
        alternatives: [
          {
            id: 'alt-1',
            name: 'Ultralight Tent',
            reason: 'Top 5% lightest in 2-person tent category',
          },
        ],
        totalFound: 1,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockWithWeightClass,
        error: null,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440003',
        criteria: 'lighter',
      });

      expect(result.success).toBe(true);
      expect(result.alternatives[0].reason).toMatch(/Top \d+%/);
    });
  });

  // ============================================================================
  // T065: Filter validation (lighter than X)
  // ============================================================================
  describe('T065: Filter Validation', () => {
    it('should only return items lighter than reference', async () => {
      const referenceWeight = 1500; // grams

      const mockLighterItems = {
        itemName: 'Reference Tent',
        alternatives: [
          { id: 'alt-1', name: 'Light Tent 1', weightGrams: 1200, reason: '20% lighter' },
          { id: 'alt-2', name: 'Light Tent 2', weightGrams: 1000, reason: '33% lighter' },
          { id: 'alt-3', name: 'Ultralight Tent', weightGrams: 800, reason: '47% lighter' },
        ],
        totalFound: 3,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockLighterItems,
        error: null,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440004',
        criteria: 'lighter',
      });

      expect(result.success).toBe(true);

      // Verify all returned items are lighter than reference
      result.alternatives.forEach((alt) => {
        if (alt.weightGrams !== null) {
          expect(alt.weightGrams).toBeLessThan(referenceWeight);
        }
      });
    });

    it('should validate price constraints via cheaper criteria', async () => {
      const mockCheaperItems = {
        itemName: 'Reference Item',
        alternatives: [
          { id: 'alt-1', name: 'Budget Tent 1', priceAmount: 350 },
          { id: 'alt-2', name: 'Budget Tent 2', priceAmount: 299 },
        ],
        totalFound: 2,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockCheaperItems,
        error: null,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440005',
        criteria: 'cheaper',
      });

      expect(result.success).toBe(true);
      expect(result.alternatives.length).toBe(2);
    });
  });

  // ============================================================================
  // T066: Complex graph traversal
  // ============================================================================
  describe('T066: Complex Graph Traversal', () => {
    it('should find gear used by users with specific equipment', async () => {
      const mockTraversalResult = {
        results: [
          {
            id: 'tent-1',
            name: 'Big Agnes Copper Spur',
            coUsageScore: 0.87,
          },
          {
            id: 'tent-2',
            name: 'MSR Hubba Hubba',
            coUsageScore: 0.82,
          },
        ],
        rowCount: 2,
        executionTimeMs: 45,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockTraversalResult,
        error: null,
        latencyMs: 45,
      });

      // Schema uses cypherQuery and parameters (not query/context)
      const input: QueryGearGraphInput = {
        cypherQuery: 'MATCH (u:User)-[:OWNS]->(g:Gear {id: $gearId})<-[:PAIRS_WITH]-(t:Gear {category: "tent"}) RETURN t',
        parameters: {
          gearId: 'thermarest-neoair-xlite',
        },
      };

      const result = await executeQueryGearGraph(input);

      expect(result.success).toBe(true);
      expect(result.results).toBeDefined();
      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should handle multi-hop graph queries', async () => {
      const mockMultiHopResult = {
        results: [{ id: 'item-1', name: 'Result Item' }],
        rowCount: 1,
        executionTimeMs: 78,
      };

      mockCallTool.mockResolvedValueOnce({
        result: mockMultiHopResult,
        error: null,
        latencyMs: 78,
      });

      const result = await executeQueryGearGraph({
        cypherQuery: 'MATCH (u:User {id: $userId})-[:OWNS]->(g:Gear)<-[:SIMILAR_TO]-(alt:Gear) RETURN alt LIMIT 10',
        parameters: { userId: 'test-user' },
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // T067: MCP fallback on server unavailable
  // ============================================================================
  describe('T067: MCP Fallback Handling', () => {
    beforeEach(() => {
      // Ensure clean mock state for each test in this describe block
      mockCallTool.mockReset();
    });

    it('should return error when MCP unavailable', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: null,
        error: 'MCP client not connected and connection failed',
        latencyMs: 0,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440006',
      });

      // Should return error
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should inform user about degraded functionality', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: null,
        error: 'Connection refused',
        latencyMs: 0,
      });

      const result = await executeSearchGear({
        query: 'ultralight tents',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout gracefully with fallback message', async () => {
      // Error must include 'timeout' to trigger the fallback message
      mockCallTool.mockResolvedValueOnce({
        result: null,
        error: 'timeout: MCP request timed out after 5000ms',
        latencyMs: 5000,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440007',
      });

      expect(result.success).toBe(false);
      // Timeout should trigger fallback message containing "temporarily unavailable"
      expect(result.error).toContain('temporarily unavailable');
    });

    it('should handle empty result gracefully', async () => {
      mockCallTool.mockResolvedValueOnce({
        result: null,
        error: null,
        latencyMs: 50,
      });

      const result = await executeFindAlternatives({
        itemId: '550e8400-e29b-41d4-a716-446655440008',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('No data returned from GearGraph');
    });
  });
});
