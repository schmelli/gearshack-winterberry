/**
 * Unit Tests for MCP Graph Tool Wrappers
 * Feature: 001-mastra-agentic-voice
 *
 * Comprehensive unit tests for lib/mastra/tools/mcp-graph.ts covering:
 * - Input validation schemas (Zod)
 * - Execute functions (findAlternatives, searchGear, queryGearGraph)
 * - Data transformations
 * - Error handling and fallback messages
 * - Format helpers for AI responses
 * - Tool definitions and exports
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  // Input schemas
  findAlternativesInputSchema,
  searchGearInputSchema,
  queryGearGraphInputSchema,
  // Execute functions
  executeFindAlternatives,
  executeSearchGear,
  executeQueryGearGraph,
  // Format helpers
  formatAlternativesForAI,
  formatSearchResultsForAI,
  // Tool definitions
  findAlternativesTool,
  searchGearTool,
  queryGearGraphTool,
  mcpGraphTools,
  mcpGraphToolsArray,
  // Types
  type FindAlternativesInput,
  type SearchGearInput,
  type QueryGearGraphInput,
  type FindAlternativesOutput,
  type SearchGearOutput,
  type GearAlternative,
  type GearSearchResult,
} from '@/lib/mastra/tools/mcp-graph';
import { mcpClient } from '@/lib/mastra/mcp-client';

// =============================================================================
// Mock Setup
// =============================================================================

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

// =============================================================================
// Test Data Factories
// =============================================================================

function createMockAlternative(
  overrides: Partial<GearAlternative> = {}
): GearAlternative {
  return {
    id: 'alt-uuid-1',
    name: 'Test Tent',
    brand: 'TestBrand',
    category: 'tents',
    weightGrams: 1200,
    priceAmount: 350,
    priceCurrency: 'USD',
    rating: 4.5,
    reviewCount: 42,
    imageUrl: 'https://example.com/image.jpg',
    reason: '20% lighter than original',
    ...overrides,
  };
}

function createMockSearchResult(
  overrides: Partial<GearSearchResult> = {}
): GearSearchResult {
  return {
    id: 'item-uuid-1',
    name: 'Test Item',
    brand: 'TestBrand',
    category: 'tents',
    weightGrams: 1500,
    priceAmount: 400,
    priceCurrency: 'USD',
    rating: 4.2,
    reviewCount: 28,
    imageUrl: 'https://example.com/item.jpg',
    matchScore: 85,
    ...overrides,
  };
}

// =============================================================================
// Input Schema Tests
// =============================================================================

describe('Input Schemas', () => {
  describe('findAlternativesInputSchema', () => {
    it('should accept valid input with all fields', () => {
      const input = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        criteria: 'lighter',
        maxResults: 5,
      };

      const result = findAlternativesInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.itemId).toBe(input.itemId);
        expect(result.data.criteria).toBe('lighter');
        expect(result.data.maxResults).toBe(5);
      }
    });

    it('should apply default values for optional fields', () => {
      const input = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
      };

      const result = findAlternativesInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.criteria).toBe('similar');
        expect(result.data.maxResults).toBe(5);
      }
    });

    it('should reject invalid UUID', () => {
      const input = {
        itemId: 'not-a-valid-uuid',
      };

      const result = findAlternativesInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid criteria', () => {
      const input = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        criteria: 'invalid-criteria',
      };

      const result = findAlternativesInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept all valid criteria values', () => {
      const validCriteria = ['lighter', 'cheaper', 'similar', 'higher-rated'];

      for (const criteria of validCriteria) {
        const input = {
          itemId: '550e8400-e29b-41d4-a716-446655440000',
          criteria,
        };
        const result = findAlternativesInputSchema.safeParse(input);
        expect(result.success).toBe(true);
      }
    });

    it('should reject maxResults outside valid range', () => {
      const tooLow = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        maxResults: 0,
      };
      const tooHigh = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        maxResults: 11,
      };

      expect(findAlternativesInputSchema.safeParse(tooLow).success).toBe(false);
      expect(findAlternativesInputSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('should accept maxResults at boundary values', () => {
      const min = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        maxResults: 1,
      };
      const max = {
        itemId: '550e8400-e29b-41d4-a716-446655440000',
        maxResults: 10,
      };

      expect(findAlternativesInputSchema.safeParse(min).success).toBe(true);
      expect(findAlternativesInputSchema.safeParse(max).success).toBe(true);
    });
  });

  describe('searchGearInputSchema', () => {
    it('should accept valid search query', () => {
      const input = {
        query: 'ultralight tent',
      };

      const result = searchGearInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe('ultralight tent');
        expect(result.data.maxResults).toBe(10);
      }
    });

    it('should accept query with all filters', () => {
      const input = {
        query: 'backpacking tent',
        filters: {
          category: 'tents',
          brand: 'Big Agnes',
          maxWeight: 1500,
          maxPrice: 500,
          minRating: 4.0,
        },
        maxResults: 15,
      };

      const result = searchGearInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.filters?.category).toBe('tents');
        expect(result.data.filters?.brand).toBe('Big Agnes');
        expect(result.data.filters?.maxWeight).toBe(1500);
        expect(result.data.filters?.maxPrice).toBe(500);
        expect(result.data.filters?.minRating).toBe(4.0);
      }
    });

    it('should reject query too short', () => {
      const input = {
        query: 'a',
      };

      const result = searchGearInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject query too long', () => {
      const input = {
        query: 'a'.repeat(201),
      };

      const result = searchGearInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid minRating', () => {
      const tooLow = {
        query: 'test query',
        filters: { minRating: 0 },
      };
      const tooHigh = {
        query: 'test query',
        filters: { minRating: 6 },
      };

      expect(searchGearInputSchema.safeParse(tooLow).success).toBe(false);
      expect(searchGearInputSchema.safeParse(tooHigh).success).toBe(false);
    });

    it('should reject negative weight/price', () => {
      const negativeWeight = {
        query: 'test query',
        filters: { maxWeight: -100 },
      };
      const negativePrice = {
        query: 'test query',
        filters: { maxPrice: -50 },
      };

      expect(searchGearInputSchema.safeParse(negativeWeight).success).toBe(false);
      expect(searchGearInputSchema.safeParse(negativePrice).success).toBe(false);
    });

    it('should reject maxResults outside valid range', () => {
      const tooLow = {
        query: 'test query',
        maxResults: 0,
      };
      const tooHigh = {
        query: 'test query',
        maxResults: 21,
      };

      expect(searchGearInputSchema.safeParse(tooLow).success).toBe(false);
      expect(searchGearInputSchema.safeParse(tooHigh).success).toBe(false);
    });
  });

  describe('queryGearGraphInputSchema', () => {
    it('should accept valid Cypher query', () => {
      const input = {
        cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
      };

      const result = queryGearGraphInputSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept query with parameters', () => {
      const input = {
        cypherQuery: 'MATCH (g:Gear {id: $gearId}) RETURN g',
        parameters: { gearId: 'test-id' },
      };

      const result = queryGearGraphInputSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.parameters).toEqual({ gearId: 'test-id' });
      }
    });

    it('should reject query too short', () => {
      const input = {
        cypherQuery: 'MATCH',
      };

      const result = queryGearGraphInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject query too long', () => {
      const input = {
        cypherQuery: 'MATCH (g:Gear) ' + 'a'.repeat(1000),
      };

      const result = queryGearGraphInputSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});

// =============================================================================
// Execute Functions Tests
// =============================================================================

describe('executeFindAlternatives', () => {
  it('should return successful result with alternatives', async () => {
    const mockResponse = {
      itemName: 'Original Tent',
      alternatives: [
        createMockAlternative({ id: 'alt-1', name: 'Light Tent 1' }),
        createMockAlternative({ id: 'alt-2', name: 'Light Tent 2' }),
      ],
      totalFound: 2,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: mockResponse,
      latencyMs: 150,
      error: null,
    });

    const input: FindAlternativesInput = {
      itemId: '550e8400-e29b-41d4-a716-446655440000',
      criteria: 'lighter',
      maxResults: 5,
    };

    const result = await executeFindAlternatives(input);

    expect(result.success).toBe(true);
    expect(result.itemName).toBe('Original Tent');
    expect(result.alternatives).toHaveLength(2);
    expect(result.criteria).toBe('lighter');
    expect(mockCallTool).toHaveBeenCalledWith(
      'findAlternatives',
      { itemId: input.itemId, criteria: 'lighter', maxResults: 5 },
      5000
    );
  });

  it('should transform MCP response to typed output correctly', async () => {
    const mockResponse = {
      itemName: 'Test Item',
      alternatives: [
        {
          id: 'alt-1',
          name: 'Alternative 1',
          brand: 'Brand A',
          category: 'tents',
          weightGrams: 1000,
          priceAmount: 300,
          priceCurrency: 'EUR',
          rating: 4.8,
          reviewCount: 100,
          imageUrl: 'https://img.example.com/1.jpg',
          reason: 'Best in category',
        },
      ],
      totalFound: 5,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: mockResponse,
      latencyMs: 100,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.alternatives[0].id).toBe('alt-1');
    expect(result.alternatives[0].weightGrams).toBe(1000);
    expect(result.alternatives[0].priceCurrency).toBe('EUR');
    expect(result.alternatives[0].rating).toBe(4.8);
    expect(result.totalFound).toBe(5);
  });

  it('should handle missing/null values in response', async () => {
    const mockResponse = {
      itemName: 'Test Item',
      alternatives: [
        {
          id: 'alt-1',
          // Missing most fields
        },
      ],
      totalFound: 1,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: mockResponse,
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.alternatives[0].name).toBe('');
    expect(result.alternatives[0].brand).toBe('');
    expect(result.alternatives[0].weightGrams).toBeNull();
    expect(result.alternatives[0].priceAmount).toBeNull();
    expect(result.alternatives[0].priceCurrency).toBeNull();
    expect(result.alternatives[0].rating).toBeNull();
    expect(result.alternatives[0].reviewCount).toBe(0);
    expect(result.alternatives[0].imageUrl).toBeNull();
    expect(result.alternatives[0].reason).toBe('Similar item');
  });

  it('should handle MCP error response', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: null,
      latencyMs: 0,
      error: 'Connection refused',
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Connection refused');
    expect(result.alternatives).toEqual([]);
  });

  it('should use fallback message on timeout', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: null,
      latencyMs: 5000,
      error: 'timeout: MCP request timed out after 5000ms',
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
    expect(result.error).toContain('GearGraph service');
  });

  it('should handle null data response', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: null,
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No data returned from GearGraph');
  });

  it('should handle non-array alternatives in response', async () => {
    const mockResponse = {
      itemName: 'Test Item',
      alternatives: 'not an array',
      totalFound: 0,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: mockResponse,
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.alternatives).toEqual([]);
  });

  it('should use default criteria when not provided', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: { itemName: 'Test', alternatives: [], totalFound: 0 },
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.criteria).toBe('similar');
  });
});

describe('executeSearchGear', () => {
  it('should return successful search results', async () => {
    const mockResponse = {
      results: [
        createMockSearchResult({ id: 'item-1', name: 'Tent A' }),
        createMockSearchResult({ id: 'item-2', name: 'Tent B' }),
      ],
      totalFound: 15,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: mockResponse,
      latencyMs: 200,
      error: null,
    });

    const input: SearchGearInput = {
      query: 'ultralight tent',
      filters: { category: 'tents' },
      maxResults: 10,
    };

    const result = await executeSearchGear(input);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.query).toBe('ultralight tent');
    expect(result.totalFound).toBe(15);
    expect(mockCallTool).toHaveBeenCalledWith(
      'searchGear',
      { query: 'ultralight tent', filters: { category: 'tents' }, maxResults: 10 },
      5000
    );
  });

  it('should transform search results correctly', async () => {
    const mockResponse = {
      results: [
        {
          id: 'item-1',
          name: 'Test Tent',
          brand: 'TestBrand',
          category: 'tents',
          weightGrams: 1200,
          priceAmount: 450,
          priceCurrency: 'USD',
          rating: 4.7,
          reviewCount: 85,
          imageUrl: 'https://example.com/tent.jpg',
          matchScore: 92,
        },
      ],
      totalFound: 1,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: mockResponse,
      latencyMs: 100,
      error: null,
    });

    const result = await executeSearchGear({ query: 'tent' });

    expect(result.results[0].matchScore).toBe(92);
    expect(result.results[0].weightGrams).toBe(1200);
    expect(result.results[0].rating).toBe(4.7);
  });

  it('should handle missing values in search results', async () => {
    const mockResponse = {
      results: [{ id: 'item-1' }],
      totalFound: 1,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: mockResponse,
      latencyMs: 50,
      error: null,
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.results[0].name).toBe('');
    expect(result.results[0].brand).toBe('');
    expect(result.results[0].weightGrams).toBeNull();
    expect(result.results[0].matchScore).toBe(0);
  });

  it('should handle MCP error', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: null,
      latencyMs: 0,
      error: 'Server error',
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Server error');
    expect(result.results).toEqual([]);
  });

  it('should use fallback message on timeout', async () => {
    // Error must include 'timeout' keyword to trigger fallback message
    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: null,
      latencyMs: 5000,
      error: 'timeout: Request timed out after 5000ms',
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
  });

  it('should handle null data response', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: null,
      latencyMs: 50,
      error: null,
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No data returned from GearGraph');
  });

  it('should use empty object for undefined filters', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: { results: [], totalFound: 0 },
      latencyMs: 50,
      error: null,
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.filters).toEqual({});
  });
});

describe('executeQueryGearGraph', () => {
  it('should return successful query results', async () => {
    const mockResponse = {
      results: [
        { id: 'node-1', name: 'Node 1' },
        { id: 'node-2', name: 'Node 2' },
      ],
      executionTimeMs: 45,
    };

    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: mockResponse,
      latencyMs: 45,
      error: null,
    });

    const input: QueryGearGraphInput = {
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    };

    const result = await executeQueryGearGraph(input);

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(2);
    expect(result.rowCount).toBe(2);
    expect(result.executionTimeMs).toBe(45);
  });

  it('should pass parameters to MCP call', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: { results: [], executionTimeMs: 20 },
      latencyMs: 20,
      error: null,
    });

    const input: QueryGearGraphInput = {
      cypherQuery: 'MATCH (g:Gear {id: $gearId}) RETURN g',
      parameters: { gearId: 'test-uuid' },
    };

    await executeQueryGearGraph(input);

    expect(mockCallTool).toHaveBeenCalledWith(
      'queryGearGraph',
      {
        cypherQuery: input.cypherQuery,
        parameters: { gearId: 'test-uuid' },
      },
      5000
    );
  });

  it('should reject queries with forbidden CREATE keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'CREATE (g:Gear {name: "Test"}) RETURN g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('forbidden keyword');
    expect(result.error).toContain('CREATE');
    expect(mockCallTool).not.toHaveBeenCalled();
  });

  it('should reject queries with forbidden DELETE keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) DELETE g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('DELETE');
    expect(mockCallTool).not.toHaveBeenCalled();
  });

  it('should reject queries with forbidden SET keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) SET g.name = "test" RETURN g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('SET');
    expect(mockCallTool).not.toHaveBeenCalled();
  });

  it('should reject queries with forbidden MERGE keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'MERGE (g:Gear {id: "test"}) RETURN g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('MERGE');
  });

  it('should reject queries with forbidden REMOVE keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) REMOVE g.name RETURN g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('REMOVE');
  });

  it('should reject queries with forbidden DROP keyword', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'DROP INDEX gear_index',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('DROP');
  });

  it('should be case-insensitive when checking forbidden keywords', async () => {
    const result = await executeQueryGearGraph({
      cypherQuery: 'match (g:Gear) delete g',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('DELETE');
  });

  it('should handle MCP error', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: null,
      latencyMs: 0,
      error: 'Query execution failed',
    });

    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('Query execution failed');
  });

  it('should use fallback message on timeout', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: null,
      latencyMs: 5000,
      error: 'timeout: Query timed out',
    });

    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('temporarily unavailable');
  });

  it('should handle null data response', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: null,
      latencyMs: 50,
      error: null,
    });

    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe('No data returned from GearGraph');
  });

  it('should use latencyMs from result when executionTimeMs not provided', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: { results: [] },
      latencyMs: 75,
      error: null,
    });

    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(result.executionTimeMs).toBe(75);
  });

  it('should use empty object for undefined parameters', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: { results: [], executionTimeMs: 20 },
      latencyMs: 20,
      error: null,
    });

    await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(mockCallTool).toHaveBeenCalledWith(
      'queryGearGraph',
      {
        cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
        parameters: {},
      },
      5000
    );
  });
});

// =============================================================================
// Format Helpers Tests
// =============================================================================

describe('formatAlternativesForAI', () => {
  it('should format successful results', () => {
    const output: FindAlternativesOutput = {
      success: true,
      itemId: 'test-id',
      itemName: 'Original Tent',
      criteria: 'lighter',
      alternatives: [
        createMockAlternative({
          name: 'Light Tent',
          brand: 'TestBrand',
          weightGrams: 1000,
          priceAmount: 400,
          priceCurrency: 'USD',
          rating: 4.5,
          reason: '30% lighter',
        }),
      ],
      totalFound: 1,
    };

    const formatted = formatAlternativesForAI(output);

    expect(formatted).toContain('Alternatives for "Original Tent"');
    expect(formatted).toContain('criteria: lighter');
    expect(formatted).toContain('TestBrand Light Tent');
    expect(formatted).toContain('1000g');
    expect(formatted).toContain('USD400');
    expect(formatted).toContain('4.5/5 stars');
    expect(formatted).toContain('Reason: 30% lighter');
  });

  it('should handle alternatives with missing details', () => {
    const output: FindAlternativesOutput = {
      success: true,
      itemId: 'test-id',
      itemName: 'Test Item',
      criteria: 'similar',
      alternatives: [
        {
          id: 'alt-1',
          name: 'Simple Item',
          brand: 'Brand',
          category: 'tents',
          weightGrams: null,
          priceAmount: null,
          priceCurrency: null,
          rating: null,
          reviewCount: 0,
          imageUrl: null,
          reason: 'Similar',
        },
      ],
      totalFound: 1,
    };

    const formatted = formatAlternativesForAI(output);

    expect(formatted).toContain('Brand Simple Item');
    expect(formatted).toContain('Reason: Similar');
    expect(formatted).not.toContain('null');
  });

  it('should return error message when not successful', () => {
    const output: FindAlternativesOutput = {
      success: false,
      itemId: 'test-id',
      itemName: '',
      criteria: 'similar',
      alternatives: [],
      totalFound: 0,
      error: 'Service unavailable',
    };

    const formatted = formatAlternativesForAI(output);

    expect(formatted).toBe('Service unavailable');
  });

  it('should return default message for empty alternatives', () => {
    const output: FindAlternativesOutput = {
      success: true,
      itemId: 'test-id',
      itemName: 'Test Item',
      criteria: 'similar',
      alternatives: [],
      totalFound: 0,
    };

    const formatted = formatAlternativesForAI(output);

    expect(formatted).toBe('No alternatives found for this item.');
  });

  it('should format multiple alternatives', () => {
    const output: FindAlternativesOutput = {
      success: true,
      itemId: 'test-id',
      itemName: 'Test Item',
      criteria: 'lighter',
      alternatives: [
        createMockAlternative({ name: 'Alt 1', brand: 'Brand1', reason: 'Reason 1' }),
        createMockAlternative({ name: 'Alt 2', brand: 'Brand2', reason: 'Reason 2' }),
        createMockAlternative({ name: 'Alt 3', brand: 'Brand3', reason: 'Reason 3' }),
      ],
      totalFound: 3,
    };

    const formatted = formatAlternativesForAI(output);

    expect(formatted).toContain('Brand1 Alt 1');
    expect(formatted).toContain('Brand2 Alt 2');
    expect(formatted).toContain('Brand3 Alt 3');
    expect(formatted).toContain('Reason 1');
    expect(formatted).toContain('Reason 2');
    expect(formatted).toContain('Reason 3');
  });
});

describe('formatSearchResultsForAI', () => {
  it('should format successful search results', () => {
    const output: SearchGearOutput = {
      success: true,
      query: 'ultralight tent',
      filters: { category: 'tents' },
      results: [
        createMockSearchResult({
          name: 'Copper Spur',
          brand: 'Big Agnes',
          category: 'tents',
          weightGrams: 1200,
          priceAmount: 450,
          priceCurrency: 'USD',
          rating: 4.8,
        }),
      ],
      totalFound: 5,
    };

    const formatted = formatSearchResultsForAI(output);

    expect(formatted).toContain('Search results for "ultralight tent"');
    expect(formatted).toContain('5 total');
    expect(formatted).toContain('Big Agnes Copper Spur (tents)');
    expect(formatted).toContain('1200g');
    expect(formatted).toContain('USD450');
    expect(formatted).toContain('4.8/5');
  });

  it('should handle results with missing details', () => {
    const output: SearchGearOutput = {
      success: true,
      query: 'test',
      filters: {},
      results: [
        {
          id: 'item-1',
          name: 'Simple Item',
          brand: 'Brand',
          category: 'gear',
          weightGrams: null,
          priceAmount: null,
          priceCurrency: null,
          rating: null,
          reviewCount: 0,
          imageUrl: null,
          matchScore: 0,
        },
      ],
      totalFound: 1,
    };

    const formatted = formatSearchResultsForAI(output);

    expect(formatted).toContain('Brand Simple Item (gear)');
    expect(formatted).not.toContain('null');
  });

  it('should return error message when not successful', () => {
    const output: SearchGearOutput = {
      success: false,
      query: 'test',
      filters: {},
      results: [],
      totalFound: 0,
      error: 'Search failed',
    };

    const formatted = formatSearchResultsForAI(output);

    expect(formatted).toBe('Search failed');
  });

  it('should return default message for empty results', () => {
    const output: SearchGearOutput = {
      success: true,
      query: 'rare item',
      filters: {},
      results: [],
      totalFound: 0,
    };

    const formatted = formatSearchResultsForAI(output);

    expect(formatted).toBe('No gear found matching your search.');
  });
});

// =============================================================================
// Tool Definitions Tests
// =============================================================================

describe('Tool Definitions', () => {
  describe('findAlternativesTool', () => {
    it('should have correct id and description', () => {
      expect(findAlternativesTool.id).toBe('findAlternatives');
      expect(findAlternativesTool.description).toContain('Find gear alternatives');
    });

    it('should have correct parameters schema', () => {
      expect(findAlternativesTool.parameters).toBe(findAlternativesInputSchema);
    });

    it('should execute function correctly', async () => {
      mockCallTool.mockResolvedValueOnce({
        toolName: 'findAlternatives',
        result: { itemName: 'Test', alternatives: [], totalFound: 0 },
        latencyMs: 50,
        error: null,
      });

      const result = await findAlternativesTool.execute({
        itemId: '550e8400-e29b-41d4-a716-446655440000',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('searchGearTool', () => {
    it('should have correct id and description', () => {
      expect(searchGearTool.id).toBe('searchGear');
      expect(searchGearTool.description).toContain('Search the gear catalog');
    });

    it('should have correct parameters schema', () => {
      expect(searchGearTool.parameters).toBe(searchGearInputSchema);
    });

    it('should execute function correctly', async () => {
      mockCallTool.mockResolvedValueOnce({
        toolName: 'searchGear',
        result: { results: [], totalFound: 0 },
        latencyMs: 50,
        error: null,
      });

      const result = await searchGearTool.execute({
        query: 'test query',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('queryGearGraphTool', () => {
    it('should have correct id and description', () => {
      expect(queryGearGraphTool.id).toBe('queryGearGraph');
      expect(queryGearGraphTool.description).toContain('Cypher queries');
    });

    it('should have correct parameters schema', () => {
      expect(queryGearGraphTool.parameters).toBe(queryGearGraphInputSchema);
    });

    it('should execute function correctly', async () => {
      mockCallTool.mockResolvedValueOnce({
        toolName: 'queryGearGraph',
        result: { results: [], executionTimeMs: 20 },
        latencyMs: 20,
        error: null,
      });

      const result = await queryGearGraphTool.execute({
        cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
      });

      expect(result.success).toBe(true);
    });
  });
});

// =============================================================================
// Export Tests
// =============================================================================

describe('Exports', () => {
  describe('mcpGraphTools', () => {
    it('should export all tools as object', () => {
      expect(mcpGraphTools.findAlternatives).toBe(findAlternativesTool);
      expect(mcpGraphTools.searchGear).toBe(searchGearTool);
      expect(mcpGraphTools.queryGearGraph).toBe(queryGearGraphTool);
    });
  });

  describe('mcpGraphToolsArray', () => {
    it('should export all tools as array', () => {
      expect(mcpGraphToolsArray).toHaveLength(3);
      expect(mcpGraphToolsArray).toContain(findAlternativesTool);
      expect(mcpGraphToolsArray).toContain(searchGearTool);
      expect(mcpGraphToolsArray).toContain(queryGearGraphTool);
    });
  });
});

// =============================================================================
// Edge Cases and Error Handling
// =============================================================================

describe('Edge Cases', () => {
  it('should handle undefined itemName in response', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: { alternatives: [], totalFound: 0 },
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.success).toBe(true);
    expect(result.itemName).toBe('');
  });

  it('should handle undefined totalFound in findAlternatives', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: {
        itemName: 'Test',
        alternatives: [createMockAlternative()],
      },
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.totalFound).toBe(1); // Should use alternatives.length as fallback
  });

  it('should handle undefined totalFound in searchGear', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'searchGear',
      result: {
        results: [createMockSearchResult(), createMockSearchResult()],
      },
      latencyMs: 50,
      error: null,
    });

    const result = await executeSearchGear({ query: 'test' });

    expect(result.totalFound).toBe(2); // Should use results.length as fallback
  });

  it('should handle non-array results in queryGearGraph', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'queryGearGraph',
      result: { results: 'not an array', executionTimeMs: 20 },
      latencyMs: 20,
      error: null,
    });

    const result = await executeQueryGearGraph({
      cypherQuery: 'MATCH (g:Gear) RETURN g LIMIT 10',
    });

    expect(result.success).toBe(true);
    expect(result.results).toEqual([]);
    expect(result.rowCount).toBe(0);
  });

  it('should handle alternative with wrong type for numeric fields', async () => {
    mockCallTool.mockResolvedValueOnce({
      toolName: 'findAlternatives',
      result: {
        itemName: 'Test',
        alternatives: [
          {
            id: 'alt-1',
            name: 'Test',
            weightGrams: 'not a number',
            priceAmount: 'invalid',
            rating: 'bad',
            reviewCount: 'wrong',
          },
        ],
        totalFound: 1,
      },
      latencyMs: 50,
      error: null,
    });

    const result = await executeFindAlternatives({
      itemId: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.alternatives[0].weightGrams).toBeNull();
    expect(result.alternatives[0].priceAmount).toBeNull();
    expect(result.alternatives[0].rating).toBeNull();
    expect(result.alternatives[0].reviewCount).toBe(0);
  });
});
