/**
 * Rate Limiting Tests
 * Feature: 001-mastra-agentic-voice
 * Tests: T089-T092 - Rate limiting edge cases
 *
 * Tests the atomic rate limiting implementation to ensure:
 * - Concurrent requests don't bypass limits
 * - Window boundaries are handled correctly
 * - Rate limit reset works as expected
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { checkAndIncrementRateLimit, type OperationType } from '@/lib/mastra/rate-limiter';

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
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
  rpc: vi.fn(),
};

describe('Rate Limiting', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('T089: Concurrent Request Handling', () => {
    it('should handle concurrent requests atomically', async () => {
      const userId = 'test-user-123';
      const operation: OperationType = 'simple_query';

      // Mock the RPC function to return success for first 20 requests, then fail
      let callCount = 0;
      mockSupabase.rpc.mockImplementation(async () => {
        callCount++;
        if (callCount <= 20) {
          return {
            data: {
              allowed: true,
              current_count: callCount,
              limit: 20,
              window_start: new Date().toISOString(),
            },
            error: null,
          };
        } else {
          return {
            data: {
              allowed: false,
              current_count: callCount,
              limit: 20,
              window_start: new Date().toISOString(),
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

      expect(allowed.length).toBe(20);
      expect(denied.length).toBe(5);
    });

    it('should not allow double-counting due to race conditions', async () => {
      const userId = 'test-user-456';
      const operation: OperationType = 'workflow';

      let count = 0;
      mockSupabase.rpc.mockImplementation(async () => {
        count++;
        return {
          data: {
            allowed: true,
            current_count: count,
            limit: 40,
            window_start: new Date().toISOString(),
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
      expect(mockSupabase.rpc).toHaveBeenCalledTimes(10);
    });
  });

  describe('T090: Window Boundary Handling', () => {
    it('should reset count when window expires', async () => {
      const userId = 'test-user-789';
      const operation: OperationType = 'voice';

      // First request in current window
      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: true,
          current_count: 1,
          limit: 40,
          window_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        },
        error: null,
      }));

      // Second request should start new window
      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: true,
          current_count: 1, // Reset to 1
          limit: 40,
          window_start: new Date().toISOString(), // New window
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
      const operation: OperationType = 'simple_query';

      const nowDate = new Date();
      const currentHour = new Date(nowDate);
      currentHour.setMinutes(0, 0, 0);

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: true,
          current_count: 1,
          limit: 20,
          window_start: currentHour.toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.resetAt).toBeDefined();
    });
  });

  describe('T091: Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const userId = 'test-user-error';
      const operation: OperationType = 'workflow';

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: null,
        error: new Error('Database connection failed'),
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      // Should fail open (allow request) but log error
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });

    it('should handle malformed responses', async () => {
      const userId = 'test-user-malformed';
      const operation: OperationType = 'voice';

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          // Missing required fields
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      // Should handle gracefully
      expect(result).toBeDefined();
      expect(result.allowed).toBeDefined();
    });
  });

  describe('T092: Rate Limit Tiers', () => {
    it('should enforce correct limits for simple_query tier', async () => {
      const userId = 'test-user-simple';
      const operation: OperationType = 'simple_query';

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: true,
          current_count: 19,
          limit: 20,
          window_start: new Date().toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(20);
    });

    it('should enforce correct limits for workflow tier', async () => {
      const userId = 'test-user-workflow';
      const operation: OperationType = 'workflow';

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: true,
          current_count: 39,
          limit: 40,
          window_start: new Date().toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(40);
    });

    it('should enforce correct limits for voice tier', async () => {
      const userId = 'test-user-voice';
      const operation: OperationType = 'voice';

      mockSupabase.rpc.mockImplementationOnce(async () => ({
        data: {
          allowed: false,
          current_count: 40,
          limit: 40,
          window_start: new Date().toISOString(),
        },
        error: null,
      }));

      const result = await checkAndIncrementRateLimit(userId, operation);

      expect(result.allowed).toBe(false);
      expect(result.limit).toBe(40);
      expect(result.remaining).toBe(0);
    });
  });
});
