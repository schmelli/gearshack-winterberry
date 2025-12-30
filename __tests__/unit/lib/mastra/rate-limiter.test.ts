/**
 * Rate Limiter Unit Tests
 * Feature: T024 [US1] - Rate Limiting Logic
 *
 * Comprehensive unit tests for the rate limiter module covering:
 * - RATE_LIMITS constant validation
 * - checkRateLimit function (read-only check)
 * - checkAndIncrementRateLimit function (atomic operation)
 * - getRateLimitStatus function (status across all types)
 * - Edge cases, error handling, and time-based behavior
 *
 * Uses vi.useFakeTimers() for testing time-based rate limiting behavior.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Set up mocks before any imports that use them
// Using inline mock functions to avoid hoisting issues
vi.mock('@/lib/supabase/server', () => {
  return {
    createClient: vi.fn(() => Promise.resolve({
      from: vi.fn(),
      rpc: vi.fn(),
    })),
  };
});

vi.mock('@/lib/mastra/logging', () => ({
  logRateLimit: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
  logDebug: vi.fn(),
  logWarn: vi.fn(),
}));

// Import after mocks are set up
import {
  RATE_LIMITS,
  checkRateLimit,
  checkAndIncrementRateLimit,
  getRateLimitStatus,
} from '@/lib/mastra/rate-limiter';

// Import mocked modules to access mock functions
import { createClient } from '@/lib/supabase/server';
import { logRateLimit, logError } from '@/lib/mastra/logging';

// Cast to mock functions for type safety
const mockCreateClient = createClient as ReturnType<typeof vi.fn>;
const mockLogRateLimit = logRateLimit as ReturnType<typeof vi.fn>;
const mockLogError = logError as ReturnType<typeof vi.fn>;

// =============================================================================
// Test Helpers
// =============================================================================

// Shared mock functions that get configured per test
let mockRpc: ReturnType<typeof vi.fn>;
let mockFrom: ReturnType<typeof vi.fn>;
let mockSelect: ReturnType<typeof vi.fn>;
let mockEq: ReturnType<typeof vi.fn>;
let mockSingle: ReturnType<typeof vi.fn>;

/**
 * Sets up the mock Supabase client with fresh mock functions
 */
function setupMockSupabaseClient() {
  mockRpc = vi.fn();
  mockFrom = vi.fn();
  mockSelect = vi.fn();
  mockEq = vi.fn();
  mockSingle = vi.fn();

  const mockClient = {
    from: mockFrom,
    rpc: mockRpc,
  };

  mockCreateClient.mockResolvedValue(mockClient);
}

/**
 * Helper to create a valid RPC response
 */
function createRpcResponse(overrides: Partial<{
  exceeded: boolean;
  count: number;
  limit: number;
  resets_at: string;
}> = {}) {
  const resetTime = new Date();
  resetTime.setHours(resetTime.getHours() + 1);
  resetTime.setMinutes(0, 0, 0);

  return {
    exceeded: false,
    count: 1,
    limit: 20,
    resets_at: resetTime.toISOString(),
    ...overrides,
  };
}

/**
 * Helper to set up mockFrom chain for checkRateLimit
 */
function setupMockFromChain(response: { data: unknown; error: unknown }) {
  mockSingle.mockResolvedValue(response);
  mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
  mockSelect.mockReturnValue({ eq: mockEq });
  mockFrom.mockReturnValue({ select: mockSelect });
}

/**
 * Helper to create a window start time for a given hours ago
 */
function createWindowStart(hoursAgo: number = 0): string {
  const date = new Date();
  date.setHours(date.getHours() - hoursAgo);
  return date.toISOString();
}

// =============================================================================
// RATE_LIMITS Constants Tests
// =============================================================================

describe('RATE_LIMITS', () => {
  describe('Constant Values', () => {
    it('should have null limit for simple_query (unlimited)', () => {
      expect(RATE_LIMITS.simple_query).toBeNull();
    });

    it('should have limit of 20 for workflow', () => {
      expect(RATE_LIMITS.workflow).toBe(20);
    });

    it('should have limit of 40 for voice', () => {
      expect(RATE_LIMITS.voice).toBe(40);
    });

    it('should have exactly three operation types', () => {
      const keys = Object.keys(RATE_LIMITS);
      expect(keys).toHaveLength(3);
      expect(keys).toContain('simple_query');
      expect(keys).toContain('workflow');
      expect(keys).toContain('voice');
    });
  });

  describe('Type Safety', () => {
    it('should be readonly (const assertion)', () => {
      // TypeScript ensures this is readonly at compile time
      // At runtime we just verify the values exist
      expect(RATE_LIMITS).toBeDefined();
      expect(typeof RATE_LIMITS).toBe('object');
    });
  });
});

// =============================================================================
// checkRateLimit Tests
// =============================================================================

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Unlimited Operations (simple_query)', () => {
    it('should always allow simple_query without database call', async () => {
      const result = await checkRateLimit('user-123', 'simple_query');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
      expect(mockFrom).not.toHaveBeenCalled();
      expect(mockLogRateLimit).toHaveBeenCalledWith('user-123', 'simple_query', true);
    });

    it('should return resetAt even for unlimited operations', async () => {
      const result = await checkRateLimit('user-456', 'simple_query');

      expect(result.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getMinutes()).toBe(0);
      expect(result.resetAt.getSeconds()).toBe(0);
    });
  });

  describe('Invalid Operation Types', () => {
    it('should reject invalid operation type', async () => {
      const result = await checkRateLimit('user-789', 'invalid_type');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.message).toContain('Invalid operation type');
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should set default operationType in error for invalid type', async () => {
      const result = await checkRateLimit('user-000', 'bogus');

      expect(result.error?.operationType).toBe('workflow');
      expect(result.error?.limit).toBe(0);
    });
  });

  describe('No Existing Rate Limit Record', () => {
    it('should allow request when no record exists (PGRST116 error)', async () => {
      setupMockFromChain({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      const result = await checkRateLimit('new-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.remaining).toBe(RATE_LIMITS.workflow);
      expect(mockLogRateLimit).toHaveBeenCalledWith('new-user', 'workflow', true, RATE_LIMITS.workflow);
    });
  });

  describe('Existing Rate Limit Record', () => {
    it('should allow request when count is below limit', async () => {
      setupMockFromChain({
        data: { count: 5, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('existing-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.remaining).toBe(15); // 20 - 5
      expect(result.limit).toBe(20);
    });

    it('should deny request when count equals limit', async () => {
      setupMockFromChain({
        data: { count: 20, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('at-limit-user', 'workflow');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
    });

    it('should deny request when count exceeds limit', async () => {
      setupMockFromChain({
        data: { count: 25, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('over-limit-user', 'workflow');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset when window has expired', async () => {
      setupMockFromChain({
        data: { count: 20, window_start: createWindowStart(2) }, // 2 hours ago
        error: null,
      });

      const result = await checkRateLimit('expired-window-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(0);
      expect(result.remaining).toBe(RATE_LIMITS.workflow);
    });
  });

  describe('Voice Operation Type', () => {
    it('should use correct limit for voice operations (40)', async () => {
      setupMockFromChain({
        data: { count: 30, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('voice-user', 'voice');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBe(40);
      expect(result.remaining).toBe(10); // 40 - 30
    });

    it('should deny voice operation at limit', async () => {
      setupMockFromChain({
        data: { count: 40, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('voice-limit-user', 'voice');

      expect(result.allowed).toBe(false);
      expect(result.error?.limit).toBe(40);
      expect(result.error?.operationType).toBe('voice');
    });
  });

  describe('Database Error Handling', () => {
    it('should fail open on database error (not PGRST116)', async () => {
      setupMockFromChain({
        data: null,
        error: { code: 'DB_ERROR', message: 'Connection failed' },
      });

      const result = await checkRateLimit('db-error-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should fail open on unexpected exception', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await checkRateLimit('exception-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('Reset Time Calculation', () => {
    it('should calculate reset time at top of next hour', async () => {
      // Current time: 2024-06-15T14:30:00.000Z
      const result = await checkRateLimit('time-user', 'simple_query');

      // Use getUTCHours to avoid timezone issues in tests
      expect(result.resetAt.getUTCHours()).toBe(15);
      expect(result.resetAt.getUTCMinutes()).toBe(0);
      expect(result.resetAt.getUTCSeconds()).toBe(0);
    });

    it('should use window end time when record exists', async () => {
      const windowStart = new Date('2024-06-15T14:00:00.000Z');
      setupMockFromChain({
        data: { count: 5, window_start: windowStart.toISOString() },
        error: null,
      });

      const result = await checkRateLimit('window-user', 'workflow');

      // Window end should be 1 hour after window start
      expect(result.resetAt.getUTCHours()).toBe(15);
    });
  });

  describe('Error Message Formatting', () => {
    it('should format error message with remaining time', async () => {
      setupMockFromChain({
        data: { count: 20, window_start: createWindowStart(0.5) },
        error: null,
      });

      const result = await checkRateLimit('error-msg-user', 'workflow');

      expect(result.error?.message).toContain('Rate limit exceeded');
      expect(result.error?.message).toContain('workflow');
      expect(result.error?.message).toContain('20 requests per hour');
      expect(result.error?.message).toMatch(/\d+ minute/);
    });
  });
});

// =============================================================================
// checkAndIncrementRateLimit Tests
// =============================================================================

describe('checkAndIncrementRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Unlimited Operations (simple_query)', () => {
    it('should always allow simple_query without RPC call', async () => {
      const result = await checkAndIncrementRateLimit('user-123', 'simple_query');

      expect(result.allowed).toBe(true);
      expect(result.limit).toBeNull();
      expect(result.remaining).toBeNull();
      expect(mockRpc).not.toHaveBeenCalled();
      expect(mockLogRateLimit).toHaveBeenCalledWith('user-123', 'simple_query', true);
    });
  });

  describe('Invalid Operation Types', () => {
    it('should reject invalid operation type', async () => {
      const result = await checkAndIncrementRateLimit('user-invalid', 'unknown_op');

      expect(result.allowed).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.message).toContain('Invalid operation type');
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle empty string operation type', async () => {
      const result = await checkAndIncrementRateLimit('user-empty', '');

      expect(result.allowed).toBe(false);
      expect(result.error?.message).toContain('Invalid operation type');
    });
  });

  describe('Successful Rate Limit Check and Increment', () => {
    it('should allow and increment when under limit (workflow)', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 5, limit: 20 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('under-limit-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(5);
      expect(result.remaining).toBe(15);
      expect(result.limit).toBe(20);
      expect(mockRpc).toHaveBeenCalledWith('check_and_increment_rate_limit', {
        p_user_id: 'under-limit-user',
        p_endpoint: 'mastra_workflow',
        p_limit: 20,
        p_window_hours: 1,
      });
    });

    it('should allow and increment when under limit (voice)', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 10, limit: 40 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('voice-user', 'voice');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(10);
      expect(result.remaining).toBe(30);
      expect(result.limit).toBe(40);
      expect(mockRpc).toHaveBeenCalledWith('check_and_increment_rate_limit', {
        p_user_id: 'voice-user',
        p_endpoint: 'mastra_voice',
        p_limit: 40,
        p_window_hours: 1,
      });
    });

    it('should allow first request (count = 1)', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 1, limit: 20 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('first-request-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.currentCount).toBe(1);
      expect(result.remaining).toBe(19);
    });

    it('should allow request at exactly limit - 1', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 19, limit: 20 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('near-limit-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });
  });

  describe('Rate Limit Exceeded', () => {
    it('should deny when rate limit exceeded (workflow)', async () => {
      const resetTime = new Date('2024-06-15T15:00:00.000Z');
      mockRpc.mockResolvedValue({
        data: {
          exceeded: true,
          count: 20,
          limit: 20,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('exceeded-user', 'workflow');

      expect(result.allowed).toBe(false);
      expect(result.currentCount).toBe(20);
      expect(result.remaining).toBe(0);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('RATE_LIMIT_EXCEEDED');
      expect(result.error?.operationType).toBe('workflow');
      expect(result.error?.limit).toBe(20);
    });

    it('should deny when rate limit exceeded (voice)', async () => {
      const resetTime = new Date('2024-06-15T15:00:00.000Z');
      mockRpc.mockResolvedValue({
        data: {
          exceeded: true,
          count: 40,
          limit: 40,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('voice-exceeded-user', 'voice');

      expect(result.allowed).toBe(false);
      expect(result.error?.operationType).toBe('voice');
      expect(result.error?.limit).toBe(40);
    });

    it('should include reset time in error', async () => {
      const resetTime = new Date('2024-06-15T15:00:00.000Z');
      mockRpc.mockResolvedValue({
        data: {
          exceeded: true,
          count: 20,
          limit: 20,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('reset-time-user', 'workflow');

      expect(result.error?.resetAt).toBeInstanceOf(Date);
      expect(result.resetAt.getTime()).toBe(resetTime.getTime());
    });

    it('should format user-friendly error message', async () => {
      const resetTime = new Date('2024-06-15T15:00:00.000Z');
      mockRpc.mockResolvedValue({
        data: {
          exceeded: true,
          count: 20,
          limit: 20,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('message-user', 'workflow');

      expect(result.error?.message).toContain('Rate limit exceeded');
      expect(result.error?.message).toContain('workflow operations');
      expect(result.error?.message).toContain('20 requests per hour');
      expect(result.error?.message).toMatch(/\d+ minute/);
    });
  });

  describe('Database Error Handling', () => {
    it('should fail open on RPC error', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: new Error('RPC failed'),
      });

      const result = await checkAndIncrementRateLimit('rpc-error-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should fail open on unexpected exception', async () => {
      mockRpc.mockImplementation(() => {
        throw new Error('Connection timeout');
      });

      const result = await checkAndIncrementRateLimit('exception-user', 'voice');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(result.limit).toBe(40);
      expect(mockLogError).toHaveBeenCalled();
    });
  });

  describe('Malformed Response Handling', () => {
    it('should fail open on malformed response (missing fields)', async () => {
      mockRpc.mockResolvedValue({
        data: { exceeded: false }, // Missing count, limit, resets_at
        error: null,
      });

      const result = await checkAndIncrementRateLimit('malformed-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should fail open on null response', async () => {
      mockRpc.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await checkAndIncrementRateLimit('null-data-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });

    it('should fail open on array response', async () => {
      mockRpc.mockResolvedValue({
        data: [],
        error: null,
      });

      const result = await checkAndIncrementRateLimit('array-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });

    it('should fail open on wrong type for exceeded', async () => {
      mockRpc.mockResolvedValue({
        data: {
          exceeded: 'false', // string instead of boolean
          count: 5,
          limit: 20,
          resets_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('wrong-type-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });

    it('should fail open on wrong type for count', async () => {
      mockRpc.mockResolvedValue({
        data: {
          exceeded: false,
          count: '5', // string instead of number
          limit: 20,
          resets_at: new Date().toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('wrong-count-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeNull();
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent requests atomically', async () => {
      let callCount = 0;
      const limit = RATE_LIMITS.workflow;

      mockRpc.mockImplementation(async () => {
        callCount++;
        const resetTime = new Date();
        resetTime.setHours(resetTime.getHours() + 1);
        resetTime.setMinutes(0, 0, 0);

        return {
          data: {
            exceeded: callCount > limit,
            count: callCount,
            limit: limit,
            resets_at: resetTime.toISOString(),
          },
          error: null,
        };
      });

      // Fire 25 concurrent requests
      const requests = Array.from({ length: 25 }, () =>
        checkAndIncrementRateLimit('concurrent-user', 'workflow')
      );

      const results = await Promise.all(requests);

      const allowed = results.filter(r => r.allowed);
      const denied = results.filter(r => !r.allowed);

      expect(allowed.length).toBe(limit);
      expect(denied.length).toBe(5);
      expect(mockRpc).toHaveBeenCalledTimes(25);
    });
  });

  describe('Logging Verification', () => {
    it('should log allowed rate limit check', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 5, limit: 20 }),
        error: null,
      });

      await checkAndIncrementRateLimit('log-allowed-user', 'workflow');

      expect(mockLogRateLimit).toHaveBeenCalledWith('log-allowed-user', 'workflow', true, 15);
    });

    it('should log denied rate limit check', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: true, count: 20, limit: 20 }),
        error: null,
      });

      await checkAndIncrementRateLimit('log-denied-user', 'workflow');

      expect(mockLogRateLimit).toHaveBeenCalledWith('log-denied-user', 'workflow', false, 0);
    });
  });
});

// =============================================================================
// getRateLimitStatus Tests
// =============================================================================

describe('getRateLimitStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Successful Status Retrieval', () => {
    it('should return status for all operation types', async () => {
      // Setup mock for parallel queries - use fixed timestamps
      const workflowWindowStart = new Date('2024-06-15T14:00:00.000Z');
      const voiceWindowStart = new Date('2024-06-15T14:00:00.000Z');

      mockSingle.mockResolvedValueOnce({
        data: { count: 5, window_start: workflowWindowStart.toISOString() },
        error: null,
      }).mockResolvedValueOnce({
        data: { count: 10, window_start: voiceWindowStart.toISOString() },
        error: null,
      });

      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const status = await getRateLimitStatus('status-user');

      expect(status.simple_query).toEqual({
        limit: null,
        remaining: null,
        unlimited: true,
      });

      expect(status.workflow.limit).toBe(20);
      expect(status.workflow.remaining).toBe(15); // 20 - 5
      expect(status.workflow.resetAt).toBeInstanceOf(Date);

      expect(status.voice.limit).toBe(40);
      expect(status.voice.remaining).toBe(30); // 40 - 10
      expect(status.voice.resetAt).toBeInstanceOf(Date);
    });

    it('should return full quota when no records exist', async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows found' },
      });

      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const status = await getRateLimitStatus('new-user');

      expect(status.workflow.remaining).toBe(20);
      expect(status.voice.remaining).toBe(40);
    });

    it('should reset remaining when window expired', async () => {
      mockSingle.mockResolvedValueOnce({
        data: { count: 20, window_start: createWindowStart(2) }, // 2 hours ago
        error: null,
      }).mockResolvedValueOnce({
        data: { count: 40, window_start: createWindowStart(2) }, // 2 hours ago
        error: null,
      });

      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const status = await getRateLimitStatus('expired-user');

      expect(status.workflow.remaining).toBe(20);
      expect(status.voice.remaining).toBe(40);
    });
  });

  describe('Error Handling', () => {
    it('should return default values on database error', async () => {
      mockFrom.mockImplementation(() => {
        throw new Error('Database unavailable');
      });

      const status = await getRateLimitStatus('error-user');

      expect(status.simple_query.unlimited).toBe(true);
      expect(status.workflow.remaining).toBe(20);
      expect(status.voice.remaining).toBe(40);
      expect(mockLogError).toHaveBeenCalled();
    });

    it('should handle partial errors gracefully', async () => {
      const windowStart = new Date('2024-06-15T14:00:00.000Z');
      mockSingle.mockResolvedValueOnce({
        data: { count: 5, window_start: windowStart.toISOString() },
        error: null,
      }).mockResolvedValueOnce({
        data: null,
        error: { code: 'DB_ERROR', message: 'Query failed' },
      });

      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const status = await getRateLimitStatus('partial-error-user');

      expect(status.workflow.remaining).toBe(15);
      expect(status.voice.remaining).toBe(40); // Default on error
    });
  });

  describe('Reset Time Accuracy', () => {
    it('should calculate correct reset times', async () => {
      const workflowWindowStart = new Date('2024-06-15T14:00:00.000Z');
      const voiceWindowStart = new Date('2024-06-15T14:15:00.000Z');

      mockSingle.mockResolvedValueOnce({
        data: { count: 5, window_start: workflowWindowStart.toISOString() },
        error: null,
      }).mockResolvedValueOnce({
        data: { count: 10, window_start: voiceWindowStart.toISOString() },
        error: null,
      });

      mockEq.mockReturnValue({ eq: mockEq, single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });
      mockFrom.mockReturnValue({ select: mockSelect });

      const status = await getRateLimitStatus('reset-time-user');

      // Use UTC hours/minutes to avoid timezone issues
      expect(status.workflow.resetAt.getUTCHours()).toBe(15);
      expect(status.workflow.resetAt.getUTCMinutes()).toBe(0);

      expect(status.voice.resetAt.getUTCHours()).toBe(15);
      expect(status.voice.resetAt.getUTCMinutes()).toBe(15);
    });
  });
});

// =============================================================================
// Time-Based Behavior Tests
// =============================================================================

describe('Time-Based Behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Window Reset Logic', () => {
    it('should reset at start of next hour', async () => {
      vi.setSystemTime(new Date('2024-06-15T14:59:59.999Z'));

      const result = await checkRateLimit('edge-user', 'simple_query');

      // Should reset at 15:00:00 (use UTC to avoid timezone issues)
      expect(result.resetAt.getUTCHours()).toBe(15);
      expect(result.resetAt.getUTCMinutes()).toBe(0);
    });

    it('should handle midnight boundary', async () => {
      vi.setSystemTime(new Date('2024-06-15T23:30:00.000Z'));

      const result = await checkRateLimit('midnight-user', 'simple_query');

      // Use UTC to avoid timezone issues
      expect(result.resetAt.getUTCHours()).toBe(0);
      expect(result.resetAt.getUTCDate()).toBe(16);
    });

    it('should handle month boundary', async () => {
      vi.setSystemTime(new Date('2024-06-30T23:30:00.000Z'));

      const result = await checkRateLimit('month-boundary-user', 'simple_query');

      // Use UTC to avoid timezone issues
      expect(result.resetAt.getUTCMonth()).toBe(6); // July (0-indexed)
      expect(result.resetAt.getUTCDate()).toBe(1);
    });
  });

  describe('Minutes Until Reset', () => {
    it('should calculate correct minutes for error message', async () => {
      vi.setSystemTime(new Date('2024-06-15T14:45:00.000Z'));

      // Use a window that started at 14:00, so it ends at 15:00
      // Current time is 14:45, so ~15 minutes until reset
      setupMockFromChain({
        data: { count: 20, window_start: new Date('2024-06-15T14:00:00.000Z').toISOString() },
        error: null,
      });

      const result = await checkRateLimit('minutes-user', 'workflow');

      // Reset at 15:00, current time is 14:45, so ~15 minutes
      expect(result.error?.message).toContain('15 minute');
    });

    it('should use singular minute when exactly 1 minute', async () => {
      vi.setSystemTime(new Date('2024-06-15T14:59:00.000Z'));

      setupMockFromChain({
        data: { count: 20, window_start: new Date('2024-06-15T14:00:00.000Z').toISOString() },
        error: null,
      });

      const result = await checkRateLimit('singular-user', 'workflow');

      expect(result.error?.message).toContain('1 minute');
      expect(result.error?.message).not.toContain('1 minutes');
    });
  });
});

// =============================================================================
// Endpoint Mapping Tests
// =============================================================================

describe('Endpoint Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
  });

  it('should map workflow to mastra_workflow endpoint', async () => {
    mockRpc.mockResolvedValue({
      data: createRpcResponse(),
      error: null,
    });

    await checkAndIncrementRateLimit('endpoint-user', 'workflow');

    expect(mockRpc).toHaveBeenCalledWith(
      'check_and_increment_rate_limit',
      expect.objectContaining({ p_endpoint: 'mastra_workflow' })
    );
  });

  it('should map voice to mastra_voice endpoint', async () => {
    mockRpc.mockResolvedValue({
      data: createRpcResponse({ limit: 40 }),
      error: null,
    });

    await checkAndIncrementRateLimit('endpoint-user', 'voice');

    expect(mockRpc).toHaveBeenCalledWith(
      'check_and_increment_rate_limit',
      expect.objectContaining({ p_endpoint: 'mastra_voice' })
    );
  });
});

// =============================================================================
// Edge Cases
// =============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockSupabaseClient();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T14:30:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('User ID Edge Cases', () => {
    it('should handle empty user ID', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse(),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('', 'workflow');

      expect(result.allowed).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith(
        'check_and_increment_rate_limit',
        expect.objectContaining({ p_user_id: '' })
      );
    });

    it('should handle very long user ID', async () => {
      const longUserId = 'a'.repeat(1000);
      mockRpc.mockResolvedValue({
        data: createRpcResponse(),
        error: null,
      });

      const result = await checkAndIncrementRateLimit(longUserId, 'workflow');

      expect(result.allowed).toBe(true);
    });

    it('should handle special characters in user ID', async () => {
      const specialUserId = 'user-123_test@example.com';
      mockRpc.mockResolvedValue({
        data: createRpcResponse(),
        error: null,
      });

      const result = await checkAndIncrementRateLimit(specialUserId, 'workflow');

      expect(result.allowed).toBe(true);
    });
  });

  describe('Count Edge Cases', () => {
    it('should handle count of exactly 0', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 0 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('zero-count-user', 'workflow');

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(20);
    });

    it('should handle very large count', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: true, count: 999999 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('large-count-user', 'workflow');

      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should clamp remaining to 0 (not negative)', async () => {
      mockRpc.mockResolvedValue({
        data: createRpcResponse({ exceeded: false, count: 25, limit: 20 }),
        error: null,
      });

      const result = await checkAndIncrementRateLimit('negative-remaining-user', 'workflow');

      expect(result.remaining).toBe(0);
      expect(result.remaining).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Timezone Edge Cases', () => {
    it('should handle UTC timestamps correctly', async () => {
      const resetTime = new Date('2024-06-15T15:00:00.000Z');
      mockRpc.mockResolvedValue({
        data: {
          exceeded: false,
          count: 5,
          limit: 20,
          resets_at: resetTime.toISOString(),
        },
        error: null,
      });

      const result = await checkAndIncrementRateLimit('utc-user', 'workflow');

      expect(result.resetAt.getTime()).toBe(resetTime.getTime());
    });
  });
});
