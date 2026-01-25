/**
 * Simple In-Memory Rate Limiter
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Prevent cache miss storms and API quota exhaustion
 *
 * Note: This is a simple implementation for MVP. For production with multiple
 * server instances, consider using Redis-based rate limiting (@upstash/ratelimit).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
}

class RateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private cleanupIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(options: RateLimitOptions) {
    this.maxRequests = options.maxRequests;
    this.windowMs = options.windowMs;

    // Cleanup expired entries every minute
    // Store interval ID for potential cleanup (though singletons typically live forever)
    this.cleanupIntervalId = setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Stop the cleanup interval (for graceful shutdown)
   */
  destroy() {
    if (this.cleanupIntervalId !== null) {
      clearInterval(this.cleanupIntervalId);
      this.cleanupIntervalId = null;
    }
    this.requests.clear();
  }

  /**
   * Check if request should be allowed
   */
  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = this.requests.get(identifier);

    // No previous requests or window expired
    if (!entry || entry.resetAt < now) {
      const newEntry: RateLimitEntry = {
        count: 1,
        resetAt: now + this.windowMs,
      };
      this.requests.set(identifier, newEntry);
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: newEntry.resetAt,
      };
    }

    // Within window - check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      };
    }

    // Increment count
    entry.count++;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetAt < now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Clear all entries (useful for testing)
   */
  clear() {
    this.requests.clear();
  }
}

// =============================================================================
// Exported Rate Limiters
// =============================================================================

/**
 * eBay Search Rate Limiter
 * - 20 requests per user per 5 minutes
 * - Prevents cache miss storms and API quota exhaustion
 */
export const ebaySearchRateLimiter = new RateLimiter({
  maxRequests: 20,
  windowMs: 5 * 60 * 1000, // 5 minutes
});

/**
 * Reseller Search Rate Limiter
 * - 30 requests per user per 5 minutes
 * - More lenient as it primarily uses cached data
 */
export const resellerSearchRateLimiter = new RateLimiter({
  maxRequests: 30,
  windowMs: 5 * 60 * 1000, // 5 minutes
});
