/**
 * Unit Tests for reviewExpensiveRecommendation Tool
 * Feature: Critic-Agent pattern for expensive purchase recommendations (Kap. 21)
 *
 * Tests cover:
 * - Below-threshold skip (no LLM call)
 * - Above-threshold happy path (mocked generateObject)
 * - Timeout handling (AbortError)
 * - General error handling
 * - Input schema validation (Zod)
 * - Tool definition structure
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// =============================================================================
// Mock Setup — must be before imports
// =============================================================================

// Mock the shared gateway
const mockModel = vi.fn();
vi.mock('@/lib/mastra/gateway', () => ({
  getSharedGateway: vi.fn(() => {
    // Gateway is a callable that returns a model when called with a model ID
    const gateway = vi.fn(() => mockModel);
    return gateway;
  }),
  getSharedGatewayOrNull: vi.fn(),
}));

// Mock generateObject from 'ai' SDK
const mockGenerateObject = vi.fn();
vi.mock('ai', () => ({
  generateObject: (...args: unknown[]) => mockGenerateObject(...args),
}));

// Mock @mastra/core/tools
vi.mock('@mastra/core/tools', () => ({
  createTool: vi.fn((config: Record<string, unknown>) => config),
}));

// Mock config
vi.mock('@/lib/mastra/config', () => ({
  COMPLEXITY_ROUTING_CONFIG: {
    SIMPLE_MODEL: 'anthropic/claude-haiku-4-5',
    COMPLEX_MODEL: 'anthropic/claude-sonnet-4-5',
    ENABLED: true,
  },
}));

// =============================================================================
// Import after mocks
// =============================================================================

import {
  reviewExpensiveRecommendationTool,
  type ReviewRecommendationInput,
  type ReviewRecommendationOutput,
} from '@/lib/mastra/tools/review-recommendation';

// =============================================================================
// Test Data Factories
// =============================================================================

function createInput(overrides: Partial<ReviewRecommendationInput> = {}): ReviewRecommendationInput {
  return {
    recommendedItem: 'Hilleberg Nallo 2 GT',
    priceEur: 850,
    userNeed: '3-season solo hiking in the Alps',
    ...overrides,
  };
}

function createReviewOutput(overrides: Partial<ReviewRecommendationOutput> = {}): ReviewRecommendationOutput {
  return {
    concerns: ['High price for occasional use'],
    cheaperAlternative: 'Nordisk Oppland 2 LW',
    cheaperAlternativePrice: 450,
    recommendation: 'reconsider',
    reasoning: 'The Nordisk Oppland offers similar wind resistance at almost half the price.',
    ...overrides,
  };
}

// =============================================================================
// Tests
// =============================================================================

describe('reviewExpensiveRecommendation', () => {
  // The tool is exported as a createTool config object (since createTool is mocked)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tool = reviewExpensiveRecommendationTool as any;

  beforeEach(() => {
    mockGenerateObject.mockReset();
    mockModel.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---------------------------------------------------------------------------
  // Tool definition structure
  // ---------------------------------------------------------------------------

  describe('tool definition', () => {
    it('has the correct id', () => {
      expect(tool.id).toBe('reviewExpensiveRecommendation');
    });

    it('has a description that mentions the price threshold', () => {
      expect(tool.description).toContain('€300');
    });

    it('has an inputSchema defined', () => {
      expect(tool.inputSchema).toBeDefined();
    });

    it('has an execute function', () => {
      expect(typeof tool.execute).toBe('function');
    });

    it('description mentions all three verdicts', () => {
      expect(tool.description).toContain('proceed');
      expect(tool.description).toContain('reconsider');
      expect(tool.description).toContain('check_used_market');
    });
  });

  // ---------------------------------------------------------------------------
  // Below-threshold: skip review (no LLM call)
  // ---------------------------------------------------------------------------

  describe('below threshold', () => {
    it('skips review for items under €300', async () => {
      const input = createInput({ priceEur: 199 });
      const result = await tool.execute(input);

      expect(result.success).toBe(true);
      expect(result.reviewed).toBe(false);
      expect(result.thresholdEur).toBe(300);
      expect(result.review).toBeUndefined();
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('skips review for items at exactly €299.99', async () => {
      const input = createInput({ priceEur: 299.99 });
      const result = await tool.execute(input);

      expect(result.success).toBe(true);
      expect(result.reviewed).toBe(false);
      expect(mockGenerateObject).not.toHaveBeenCalled();
    });

    it('does NOT skip review for items at exactly €300', async () => {
      const reviewOutput = createReviewOutput({ recommendation: 'proceed' });
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ priceEur: 300 });
      const result = await tool.execute(input);

      expect(result.reviewed).toBe(true);
      expect(mockGenerateObject).toHaveBeenCalledOnce();
    });

    it('returns thresholdEur in the response even when skipped', async () => {
      const input = createInput({ priceEur: 50 });
      const result = await tool.execute(input);

      expect(result.thresholdEur).toBe(300);
    });
  });

  // ---------------------------------------------------------------------------
  // Above threshold: happy path (mocked generateObject)
  // ---------------------------------------------------------------------------

  describe('above threshold — happy path', () => {
    it('calls generateObject for items above threshold', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ priceEur: 850 });
      await tool.execute(input);

      expect(mockGenerateObject).toHaveBeenCalledOnce();
    });

    it('returns the review with success=true and reviewed=true', async () => {
      const reviewOutput = createReviewOutput({ recommendation: 'proceed' });
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ priceEur: 500 });
      const result = await tool.execute(input);

      expect(result.success).toBe(true);
      expect(result.reviewed).toBe(true);
      expect(result.review).toEqual(reviewOutput);
    });

    it('passes the item name and price in the prompt', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({
        recommendedItem: 'Arc\'teryx Alpha SV',
        priceEur: 750,
      });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Arc\'teryx Alpha SV');
      expect(callArgs.prompt).toContain('€750');
    });

    it('passes user need in the prompt', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ userNeed: 'Winter mountaineering in Scotland' });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('Winter mountaineering in Scotland');
    });

    it('includes user inventory in the prompt when provided', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({
        userInventory: ['MSR Hubba Hubba 2', 'Osprey Exos 58'],
      });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('MSR Hubba Hubba 2');
      expect(callArgs.prompt).toContain('Osprey Exos 58');
    });

    it('handles missing inventory gracefully', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ userInventory: undefined });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('inventory is unknown');
    });

    it('handles empty inventory array', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ userInventory: [] });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.prompt).toContain('inventory is unknown');
    });

    it('passes an abortSignal for timeout', async () => {
      const reviewOutput = createReviewOutput();
      mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

      const input = createInput({ priceEur: 400 });
      await tool.execute(input);

      const callArgs = mockGenerateObject.mock.calls[0][0];
      expect(callArgs.abortSignal).toBeDefined();
    });

    it('returns all three recommendation types correctly', async () => {
      for (const verdict of ['proceed', 'reconsider', 'check_used_market'] as const) {
        const reviewOutput = createReviewOutput({ recommendation: verdict });
        mockGenerateObject.mockResolvedValueOnce({ object: reviewOutput });

        const input = createInput({ priceEur: 500 });
        const result = await tool.execute(input);

        expect(result.review?.recommendation).toBe(verdict);
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling: timeout (AbortError)
  // ---------------------------------------------------------------------------

  describe('timeout handling', () => {
    it('returns success=false with timeout message on AbortError', async () => {
      const abortError = new DOMException('The operation was aborted', 'AbortError');
      mockGenerateObject.mockRejectedValueOnce(abortError);

      const input = createInput({ priceEur: 500 });
      const result = await tool.execute(input);

      expect(result.success).toBe(false);
      expect(result.reviewed).toBe(true);
      expect(result.error).toContain('timed out');
      expect(result.review).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // Error handling: general errors
  // ---------------------------------------------------------------------------

  describe('general error handling', () => {
    it('returns success=false with generic message on non-abort errors', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('API rate limit exceeded'));

      const input = createInput({ priceEur: 500 });
      const result = await tool.execute(input);

      expect(result.success).toBe(false);
      expect(result.reviewed).toBe(true);
      expect(result.error).toContain('unavailable');
      expect(result.review).toBeUndefined();
    });

    it('returns success=false for non-Error thrown values', async () => {
      mockGenerateObject.mockRejectedValueOnce('string error');

      const input = createInput({ priceEur: 500 });
      const result = await tool.execute(input);

      expect(result.success).toBe(false);
      expect(result.reviewed).toBe(true);
      expect(result.error).toBeDefined();
    });

    it('logs the error to console.error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockGenerateObject.mockRejectedValueOnce(new Error('Network failure'));

      const input = createInput({ priceEur: 500 });
      await tool.execute(input);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[reviewExpensiveRecommendation] Review failed:',
        'Network failure'
      );
      consoleSpy.mockRestore();
    });

    it('still returns thresholdEur on error', async () => {
      mockGenerateObject.mockRejectedValueOnce(new Error('fail'));

      const input = createInput({ priceEur: 500 });
      const result = await tool.execute(input);

      expect(result.thresholdEur).toBe(300);
    });
  });

  // ---------------------------------------------------------------------------
  // Input schema validation
  // ---------------------------------------------------------------------------

  describe('input schema validation', () => {
    const schema = tool.inputSchema;

    it('accepts valid input', () => {
      const result = schema.safeParse(createInput());
      expect(result.success).toBe(true);
    });

    it('rejects empty recommendedItem', () => {
      const result = schema.safeParse(createInput({ recommendedItem: '' }));
      expect(result.success).toBe(false);
    });

    it('rejects recommendedItem over 500 chars', () => {
      const result = schema.safeParse(createInput({ recommendedItem: 'a'.repeat(501) }));
      expect(result.success).toBe(false);
    });

    it('rejects zero price', () => {
      const result = schema.safeParse(createInput({ priceEur: 0 }));
      expect(result.success).toBe(false);
    });

    it('rejects negative price', () => {
      const result = schema.safeParse(createInput({ priceEur: -100 }));
      expect(result.success).toBe(false);
    });

    it('rejects empty userNeed', () => {
      const result = schema.safeParse(createInput({ userNeed: '' }));
      expect(result.success).toBe(false);
    });

    it('rejects userNeed over 1000 chars', () => {
      const result = schema.safeParse(createInput({ userNeed: 'x'.repeat(1001) }));
      expect(result.success).toBe(false);
    });

    it('accepts missing userInventory', () => {
      const input = { recommendedItem: 'Test', priceEur: 400, userNeed: 'Hiking' };
      const result = schema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects inventory item over 200 chars', () => {
      const result = schema.safeParse(createInput({
        userInventory: ['a'.repeat(201)],
      }));
      expect(result.success).toBe(false);
    });

    it('rejects inventory array over 50 items', () => {
      const result = schema.safeParse(createInput({
        userInventory: Array.from({ length: 51 }, (_, i) => `Item ${i}`),
      }));
      expect(result.success).toBe(false);
    });

    it('accepts inventory array at exactly 50 items', () => {
      const result = schema.safeParse(createInput({
        userInventory: Array.from({ length: 50 }, (_, i) => `Item ${i}`),
      }));
      expect(result.success).toBe(true);
    });
  });
});
