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
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;
  private lastCleanup: number = 0;
  private readonly cleanupIntervalMs: number = 5 * 60 * 1000;

  constructor(maxAttempts: number, windowMs: number, maxStoreSize: number = 10000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.maxStoreSize = maxStoreSize;

    // Note: In serverless environments, setInterval can cause memory leaks.
    // We use lazy cleanup instead - cleanup runs during check() calls.
    // Only start interval in long-running processes.
    if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'production') {
      this.cleanupIntervalId = setInterval(() => this.cleanup(), this.cleanupIntervalMs);
    }
  }

  /**
   * Clean up resources (call when rate limiter is no longer needed)
   */
  destroy(): void {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.store.clear();
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

    // Lazy cleanup in production (serverless) - run periodically during checks
    if (now - this.lastCleanup > this.cleanupIntervalMs) {
      this.cleanup();
      this.lastCleanup = now;
    }

    const entry = this.store.get(userId);

    if (!entry) {
      // Enforce max store size to prevent unbounded memory growth
      if (this.store.size >= this.maxStoreSize) {
        // LRU eviction: Remove entry with oldest activity (least recently used)
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

    // Check if limit exceeded (JavaScript's single-threaded event loop makes this atomic
    // within a single tick; NOTE: This is NOT thread-safe for multi-threaded environments)
    if (entry.attempts.length >= this.maxAttempts) {
      // Update store with cleaned attempts
      this.store.set(userId, entry);
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.attempts[0] ? entry.attempts[0] + this.windowMs : now + this.windowMs,
      };
    }

    // Add current attempt atomically with check
    entry.attempts.push(now);
    this.store.set(userId, entry);

    return {
      allowed: true,
      remaining: this.maxAttempts - entry.attempts.length,
      resetAt: entry.attempts[0] ? entry.attempts[0] + this.windowMs : now + this.windowMs,
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
 * Rate limiter for shakedown creation
 * Limit: 10 shakedowns per hour per user
 */
export const shakedownCreationLimiter = new RateLimiter(
  10, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for shakedown feedback creation
 * Limit: 30 feedback posts per hour per user
 */
export const shakedownFeedbackLimiter = new RateLimiter(
  30, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for AI assistant chat
 * Limit: 50 messages per hour per user
 */
export const aiChatLimiter = new RateLimiter(
  50, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for AI vision scan (image-to-inventory)
 * Limit: 10 scans per hour per user
 */
export const visionScanLimiter = new RateLimiter(
  10, // maxAttempts
  60 * 60 * 1000 // windowMs (1 hour)
);

/**
 * Rate limiter for on-demand product image lookups (Serper)
 * Limit: 30 lookups per hour per user (called per alternative during disambiguation)
 */
export const productImageLimiter = new RateLimiter(
  30, // maxAttempts
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
