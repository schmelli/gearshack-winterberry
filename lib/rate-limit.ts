/**
 * Simple In-Memory Rate Limiter
 * Feature: 048-ai-loadout-image-gen
 *
 * Implements sliding window rate limiting without external dependencies.
 *
 * IMPORTANT: This is an in-memory implementation suitable for single-instance
 * deployments. For production with multiple instances, use a distributed
 * rate limiter like @upstash/ratelimit with Redis.
 */

interface RateLimitEntry {
  attempts: number[];
  resetAt: number;
}

class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private readonly maxAttempts: number;
  private readonly windowMs: number;
  private readonly maxStoreSize: number;

  constructor(maxAttempts: number, windowMs: number, maxStoreSize: number = 10000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.maxStoreSize = maxStoreSize;

    // Cleanup expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Check if user has exceeded rate limit
   *
   * @param userId - User identifier
   * @returns Rate limit result with remaining attempts
   */
  check(userId: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    const entry = this.store.get(userId);

    if (!entry) {
      // Enforce max store size to prevent unbounded memory growth
      if (this.store.size >= this.maxStoreSize) {
        // Remove oldest entry (first key in Map maintains insertion order)
        const oldestKey = this.store.keys().next().value;
        if (oldestKey) this.store.delete(oldestKey);
      }

      // First attempt - create new entry
      this.store.set(userId, {
        attempts: [now],
        resetAt: now + this.windowMs,
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
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.attempts[0] + this.windowMs,
      };
    }

    // Add current attempt
    entry.attempts.push(now);
    this.store.set(userId, entry);

    return {
      allowed: true,
      remaining: this.maxAttempts - entry.attempts.length,
      resetAt: entry.attempts[0] + this.windowMs,
    };
  }

  /**
   * Clean up expired entries to prevent memory leaks
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [userId, entry] of this.store.entries()) {
      // Remove entries with no attempts in the last window
      const windowStart = now - this.windowMs;
      entry.attempts = entry.attempts.filter(timestamp => timestamp > windowStart);

      if (entry.attempts.length === 0) {
        this.store.delete(userId);
      }
    }
  }

  /**
   * Get current rate limit info for a user
   */
  getInfo(userId: string): {
    attempts: number;
    remaining: number;
    resetAt: number | null;
  } {
    const entry = this.store.get(userId);
    if (!entry) {
      return {
        attempts: 0,
        remaining: this.maxAttempts,
        resetAt: null,
      };
    }

    const now = Date.now();
    const windowStart = now - this.windowMs;
    const validAttempts = entry.attempts.filter(timestamp => timestamp > windowStart);

    return {
      attempts: validAttempts.length,
      remaining: Math.max(0, this.maxAttempts - validAttempts.length),
      resetAt: validAttempts.length > 0 ? validAttempts[0] + this.windowMs : null,
    };
  }
}

// =============================================================================
// Pre-configured Rate Limiters
// =============================================================================

/**
 * Rate limiter for AI image generation
 * Limit: 5 generations per hour per user
 */
export const imageGenerationLimiter = new RateLimiter(
  5, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Helper to check rate limit and return appropriate response
 */
export function checkRateLimit(userId: string): {
  allowed: boolean;
  headers: Record<string, string>;
  error?: string;
} {
  const result = imageGenerationLimiter.check(userId);

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
