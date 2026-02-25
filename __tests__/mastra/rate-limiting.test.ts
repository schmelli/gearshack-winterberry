/**
 * Rate Limiting Tests
 * Feature: 001-mastra-agentic-voice
 * Tests: T089-T092 - Rate limiting edge cases
 *
 * Tests the atomic rate limiting implementation to ensure:
 * - Concurrent requests don't bypass limits
 * - Window boundaries are handled correctly
 * - Rate limit reset works as expected
 *
 * Actual rate limits (from rate-limiter.ts):
 * - simple_query: null (Unlimited)
 * - workflow: 20 per hour
 * - voice: 40 per hour
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkAndIncrementRateLimit, RATE_LIMITS, type OperationType } from '@/lib/mastra/rate-limiter';

// Mock the Supabase createClient
const mockRpc = vi.fn();
const mockSupabaseClient = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(),
        maybeSingle: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(),
    })),
  })),
  rpc: mockRpc,
};

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabaseClient)),
}));

// Mock logging to avoid console noise
vi.mock('@/lib/mastra/logging', () => ({
  logRateLimit: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('T089: Concurrent Request Handling', () => {
    it('should handle concurrent requests atomically for workflow operations', async () => {
      const userId = 'test-user-123';
      const operation: OperationType = 'workflow';
      const limit = RATE_LIMITS.workflow; // 20

      // Mock the RPC function to return success for first 20 requests, then fail
      let callCount = 0;
      mockRpc.mockImplementation(async () => {
        callCount++;
        const resetTime = new Date();
        resetTime.setHours(resetTime.getHours() + 1);
        resetTime.setMinutes(0, 0, 0);

        if (callCount <= limit) {
          return {
            data: {
              exceeded: false,
              count: callCount,
              limit: limit,
              resets_at: resetTime.toISOString(),
            },
            error: null,
          };
        } else {
          return {
            data: {
              exceeded: true,
              count: callCount,
              limit: limit,
              resets_at: resetTime.toISOString(),
            },
            error: null,
          };
        }
      });

      // Simulate 25 concurrent requests
      const requests = Array.from({ length: 25 }, () =>
        checkAndIncrementRateLimit(userId, operation)
      );

      const results = await Promise.all(requests);

      // First 20 should be allowed
      const allowed = results.filter(r => r.allowed);
      const denied = results.filter(r => !r.allowed);

      expect(allowed.length).toBe(limit);
      expect(denied.length).toBe(5);
    });

    it('should not allow double-counting due to race conditions', async () => {
      const userId = 'test-user-456';
      const operation: OperationType = 'workflow';

      let count = 0;
      mockRpc.mockImplementation(async () => {
        count++;
        const resetTime = new Date();
        resetTime.setHours(resetTime.getHours() + 1);
        resetTime.setMinutes(0, 0, 0);

        return {
          data: {
            exceeded: false,
            count: count,
            limit: RATE_LIMITS.workflow,
            resets_at: resetTime.toISOString(),
          },
          error: null,
        };
      });

      // Fire 10 concurrent requests
      const requests = Array.from({ length: 10 }, () =>
        checkAndIncrementRateLimit(userId, operation)
      );

      await Promise.all(requests);

      // RPC should have been called exactly 10 times (atomic increment)
      expect(mockRpc).toHaveBeenCalledTimes(10);
    });

    it('should allow unlimited simple_query requests', async () => {
      const userId = 'test-user-unlimited';
      const operation: OperationType = 'simple_query';

      // simple_query is unlimited - should not call RPC at all
      const requests = Array.from({ length: 100 }, () =>
        checkAndIncrementRateLimit(userId, operation)
      );

      const results = await Promise.all(requests);

      // All should be allowed
      expect(results.every(r => r.allowed)).toBe(true);
      expect(results.every(r => r.limit === null)).toBe(true);

      // RPC should NOT have been called for unlimited tier
      expect(mockRpc).not.toHaveBeenCalled();
    });
  });

  describe('T090: Window Boundary Handling', () => {
    it('should reset count when window expires', async () => {
      const userId = 'test-user-789';
      const operation: OperationType = 'voice';

      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1);
      resetTime.setMinutes(0, 0, 0);

      // First request in current window
      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: false,
          count: 1,
          limit: RATE_LIMITS.voice,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      }));

      // Second request should start new window
      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: false,
          count: 1, // Reset to 1
          limit: RATE_LIMITS.voice,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      }));

      const result1 = await checkAndIncrementRateLimit(userId, operation);
      const result2 = await checkAndIncrementRateLimit(userId, operation);

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
    });

    it('should handle requests at exact window boundary', async () => {
      const userId = 'test-user-boundary';
      const operation: OperationType = 'workflow';

      const nowDate = new Date();
      const nextHour = new Date(nowDate);
      nextHour.setHours(nextHour.getHours() + 1);
      nextHour.setMinutes(0, 0, 0);

      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: false,
          count: 1,
          limit: RATE_LIMITS.workflow,
          resets_at: nextHour.toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeDefined();
    });
  });

  describe('T091: Error Handling', () => {
    it('should handle database errors gracefully (fail open)', async () => {
      const userId = 'test-user-error';
      const operation: OperationType = 'workflow';

      mockRpc.mockImplementationOnce(async () => ({
        data: null,
        error: new Error('Database connection failed'),
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      // Should fail open (allow request) but log error
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });

    it('should handle malformed responses gracefully', async () => {
      const userId = 'test-user-malformed';
      const operation: OperationType = 'voice';

      mockRpc.mockImplementationOnce(async () => ({
        data: {
          // Missing required fields - malformed response
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      // Should handle gracefully (fail open)
      expect(result).toBeDefined();
      expect(result.allowed).toBe(true);
    });

    it('should handle invalid operation type', async () => {
      const userId = 'test-user-invalid';
      const operation = 'invalid_operation';

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Invalid operation type');
    });
  });

  describe('T092: Rate Limit Tiers', () => {
    it('should have unlimited simple_query tier', async () => {
      const userId = 'test-user-simple';
      const operation: OperationType = 'simple_query';

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull(); // Unlimited
      expect(result.remaining).toBeNull();
    });

    it('should enforce correct limits for workflow tier (20/hour)', async () => {
      const userId = 'test-user-workflow';
      const operation: OperationType = 'workflow';

      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1);
      resetTime.setMinutes(0, 0, 0);

      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: false,
          count: 19,
          limit: RATE_LIMITS.workflow,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20); // workflow limit is 20
    });

    it('should enforce correct limits for voice tier (40/hour)', async () => {
      const userId = 'test-user-voice';
      const operation: OperationType = 'voice';

      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1);
      resetTime.setMinutes(0, 0, 0);

      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: true,
          count: 40,
          limit: RATE_LIMITS.voice,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(40); // voice limit is 40
      expect(result.remaining).toBe(0);
    });

    it('should return error details when rate limit exceeded', async () => {
      const userId = 'test-user-exceeded';
      const operation: OperationType = 'workflow';

      const resetTime = new Date();
      resetTime.setHours(resetTime.getHours() + 1);
      resetTime.setMinutes(0, 0, 0);

      mockRpc.mockImplementationOnce(async () => ({
        data: {
          exceeded: true,
          count: 20,
          limit: RATE_LIMITS.workflow,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.limit).toBe(20);
      expect(result.error?.operationType).toBe('workflow');
    });
  });
});
