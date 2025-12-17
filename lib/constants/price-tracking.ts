/**
 * Price Tracking Constants
 * Feature: 050-price-tracking (Review fix #14)
 * Date: 2025-12-17
 *
 * Centralized configuration values to replace magic numbers throughout the codebase.
 */

/**
 * Rate Limiting
 */
export const RATE_LIMITING = {
  /** Maximum concurrent price searches */
  MAX_CONCURRENT_SEARCHES: parseInt(process.env.MAX_CONCURRENT_SEARCHES || '5', 10),

  /** Default rate limit per partner (requests per hour) */
  DEFAULT_PARTNER_RATE_LIMIT: 100,

  /** Rate limit window duration in milliseconds (1 hour) */
  RATE_WINDOW_MS: 60 * 60 * 1000,
} as const;

/**
 * Caching
 */
export const CACHE_CONFIG = {
  /** Cache TTL in hours */
  TTL_HOURS: parseInt(process.env.PRICE_CACHE_TTL_HOURS || '6', 10),

  /** Cache TTL in milliseconds */
  TTL_MS: parseInt(process.env.PRICE_CACHE_TTL_HOURS || '6', 10) * 60 * 60 * 1000,
} as const;

/**
 * Search Configuration
 */
export const SEARCH_CONFIG = {
  /** Fuzzy search similarity threshold (0-1) */
  FUZZY_SIMILARITY_THRESHOLD: 0.3,

  /** Maximum fuzzy search results */
  FUZZY_MAX_RESULTS: 50,

  /** Minimum keyword length for fuzzy matching */
  MIN_KEYWORD_LENGTH: 3,
} as const;

/**
 * Price History
 */
export const HISTORY_CONFIG = {
  /** Default days of price history to retain */
  DEFAULT_RETENTION_DAYS: 90,

  /** Default days of price history to display */
  DEFAULT_DISPLAY_DAYS: 30,
} as const;

/**
 * Geolocation
 */
export const GEO_CONFIG = {
  /** Local shop search radius in kilometers */
  LOCAL_SHOP_RADIUS_KM: 25,

  /** "Nearby" badge threshold in kilometers */
  NEARBY_THRESHOLD_KM: 10,
} as const;

/**
 * Retry Configuration
 */
export const RETRY_CONFIG = {
  /** Maximum retry attempts for failed API calls */
  MAX_RETRIES: 3,

  /** Maximum backoff delay in milliseconds */
  MAX_BACKOFF_MS: 10000,

  /** Initial backoff delay in milliseconds */
  INITIAL_BACKOFF_MS: 1000,
} as const;
