/**
 * Distributed Rate Limiter with Upstash Redis
 * Feature 050: Security & Performance
 *
 * Production-ready rate limiting using Upstash Redis with sliding window algorithm.
 * Falls back to in-memory implementation when Redis is unavailable (development/degraded mode).
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// =============================================================================
// Redis Client Setup
// =============================================================================

let redis: Redis | null = null;
let isRedisAvailable = false;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({
      url,
      token,
    });
    isRedisAvailable = true;
    console.log('[RateLimit] Upstash Redis connected');
  } else {
    console.warn(
      '[RateLimit] Redis credentials not found. Using in-memory fallback. ' +
        'Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN for production.'
    );
  }
} catch (error) {
  console.error('[RateLimit] Failed to initialize Redis:', error);
  console.warn('[RateLimit] Falling back to in-memory rate limiting');
}

// =============================================================================
// In-Memory Fallback Implementation
// =============================================================================

interface RateLimitEntry {
  attempts: number[];
}

class InMemoryRateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly maxStoreSize = 10000;
  private lastCleanup = 0;
  private readonly cleanupIntervalMs = 5 * 60 * 1000; // 5 minutes

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
  }

  check(userId: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();

    // Lazy cleanup
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup();
      this.lastCleanup = now;
    }

    const entry = this.store.get(userId);

    if (!entry) {
      // LRU eviction if store is full
      if (this.store.size >= this.maxStoreSize) {
        let lruKey: string | null = null;
        let oldestActivity = Infinity;

        for (const [key, value] of this.store.entries()) {
          const lastAttempt = value.attempts[value.attempts.length - 1] || 0;
          if (lastAttempt < oldestActivity) {
            oldestActivity = lastAttempt;
            lruKey = key;
          }
        }

        if (lruKey) this.store.delete(lruKey);
      }

      // First attempt
      this.store.set(userId, {
        attempts: [now],
      });

      return {
        allowed: true,
        remaining: this.maxAttempts - 1,
        resetAt: now + this.windowMs,
      };
    }

    // Remove attempts outside the window
    const windowStart = now - this.windowMs;
    entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);

    // Check if limit exceeded
    if (entry.attempts.length >= this.maxAttempts) {
      this.store.set(userId, entry);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.attempts[0] ? entry.attempts[0] + this.windowMs : now + this.windowMs,
      };
    }

    // Add current attempt
    entry.attempts.push(now);
    this.store.set(userId, entry);

    return {
      allowed: true,
      remaining: this.maxAttempts - entry.attempts.length,
      resetAt: entry.attempts[0] ? entry.attempts[0] + this.windowMs : now + this.windowMs,
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [userId, entry] of this.store.entries()) {
      entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);
      if (entry.attempts.length === 0) {
        this.store.delete(userId);
      }
    }
  }
}

// =============================================================================
// Hybrid Rate Limiter (Upstash + In-Memory Fallback)
// =============================================================================

class HybridRateLimiter {
  private upstashLimiter: Ratelimit | null;
  private inMemoryLimiter: InMemoryRateLimiter;
  private readonly maxAttempts: number;
  private readonly windowMs: number;

  constructor(maxAttempts: number, windowMs: number) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.inMemoryLimiter = new InMemoryRateLimiter(maxAttempts, windowMs);

    // Initialize Upstash limiter if Redis is available
    if (redis && isRedisAvailable) {
      this.upstashLimiter = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxAttempts, `${windowMs}ms`),
        analytics: true,
        prefix: '@gearshack/ratelimit',
      });
    } else {
      this.upstashLimiter = null;
    }
  }

  /**
   * Check rate limit for a user
   * Uses Upstash Redis if available, falls back to in-memory
   *
   * @param userId - User identifier
   * @returns Rate limit result with allowed, remaining, resetAt
   */
  async check(userId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
  }> {
    // Try Upstash first
    if (this.upstashLimiter) {
      try {
        const result = await this.upstashLimiter.limit(userId);
        return {
          allowed: result.success,
          remaining: result.remaining,
          resetAt: result.reset,
        };
      } catch (error) {
        console.error('[RateLimit] Upstash error, falling back to in-memory:', error);
        // Fall through to in-memory
      }
    }

    // In-memory fallback
    return this.inMemoryLimiter.check(userId);
  }
}

// =============================================================================
// Pre-configured Rate Limiters
// =============================================================================

/**
 * Rate limiter for AI image generation
 * Limit: 5 generations per hour per user
 */
export const imageGenerationLimiter = new HybridRateLimiter(
  5, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for shakedown creation
 * Limit: 10 shakedowns per hour per user
 */
export const shakedownCreationLimiter = new HybridRateLimiter(
  10, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for shakedown feedback creation
 * Limit: 30 feedback posts per hour per user
 */
export const shakedownFeedbackLimiter = new HybridRateLimiter(
  30, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for AI assistant chat
 * Limit: 50 messages per hour per user
 */
export const aiChatLimiter = new HybridRateLimiter(
  50, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Helper to check rate limit and return appropriate response
 * Uses imageGenerationLimiter by default (for backward compatibility)
 *
 * @param userId - User identifier
 * @returns Rate limit result with headers and optional error message
 */
export async function checkRateLimit(userId: string): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  error?: string;
}> {
  const result = await imageGenerationLimiter.check(userId);

  const headers = {
    'X-RateLimit-Limit': '5',
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': new Date(result.resetAt).toISOString(),
  };

  if (!result.allowed) {
    const minutesUntilReset = Math.ceil((result.resetAt - Date.now()) / (60 * 1000));

    return {
      allowed: false,
      headers,
      error: `Rate limit exceeded. You can generate ${minutesUntilReset > 1 ? `${minutesUntilReset} minutes` : 'in less than a minute'}. Limit: 5 generations per hour.`,
    };
  }

  return {
    allowed: true,
    headers,
  };
}

/**
 * Check if Redis-based rate limiting is available
 */
export function isRedisRateLimitingAvailable(): boolean {
  return isRedisAvailable;
}
