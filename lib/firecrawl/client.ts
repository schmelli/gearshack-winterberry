/**
 * Firecrawl Client
 *
 * A robust client for the Firecrawl API with:
 * - Zod-based configuration validation
 * - Retry with exponential backoff
 * - SSRF protection (blocks private IPs and localhost)
 * - Rate limit handling (429)
 * - Timeout management
 */

import { z } from 'zod';

// =============================================================================
// Internal Logger
// =============================================================================

/**
 * Internal logger for Firecrawl client.
 * Only logs in development mode to avoid production noise.
 */
const logger = {
  debug: (message: string, ...args: unknown[]) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Firecrawl] ${message}`, ...args);
    }
  },
  warn: (message: string, ...args: unknown[]) => {
    console.warn(`[Firecrawl] ${message}`, ...args);
  },
  error: (message: string, ...args: unknown[]) => {
    console.error(`[Firecrawl] ${message}`, ...args);
  },
};

// =============================================================================
// Configuration Schema
// =============================================================================

export const FirecrawlConfigSchema = z.object({
  apiKey: z.string().min(1, 'FIRECRAWL_API_KEY is required'),
  baseUrl: z.string().url().default('https://api.firecrawl.dev/v1'),
  timeout: z.number().int().positive().default(30000),
  maxRetries: z.number().int().min(0).max(10).default(3),
});

export type FirecrawlConfig = z.infer<typeof FirecrawlConfigSchema>;

// =============================================================================
// Request/Response Schemas
// =============================================================================

export const ScrapeOptionsSchema = z.object({
  formats: z
    .array(z.enum(['markdown', 'html', 'rawHtml', 'links', 'screenshot']))
    .optional(),
  onlyMainContent: z.boolean().optional().default(true),
  includeTags: z.array(z.string()).optional(),
  excludeTags: z.array(z.string()).optional(),
  waitFor: z.number().int().positive().optional(),
});

export type ScrapeOptions = z.infer<typeof ScrapeOptionsSchema>;

export const SearchOptionsSchema = z.object({
  limit: z.number().int().min(1).max(20).optional().default(5),
  scrapeOptions: z
    .object({
      formats: z
        .array(z.enum(['markdown', 'html', 'rawHtml', 'links']))
        .optional(),
    })
    .optional(),
});

export type SearchOptions = z.infer<typeof SearchOptionsSchema>;

// =============================================================================
// Response Types
// =============================================================================

export interface ScrapeResult {
  success: boolean;
  data: {
    markdown?: string;
    html?: string;
    rawHtml?: string;
    links?: string[];
    screenshot?: string;
    metadata?: {
      title?: string;
      description?: string;
      language?: string;
      sourceURL?: string;
      [key: string]: unknown;
    };
  };
}

export interface SearchResultItem {
  url: string;
  title?: string;
  markdown?: string;
  html?: string;
  description?: string;
}

export interface SearchResult {
  success: boolean;
  results: SearchResultItem[];
}

// =============================================================================
// Error Classes
// =============================================================================

export class FirecrawlError extends Error {
  public readonly statusCode: number;
  public readonly isRetryable: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'FirecrawlError';
    this.statusCode = statusCode;
    // Rate limits (429) and server errors (5xx) are retryable
    this.isRetryable = statusCode === 429 || statusCode >= 500;
  }
}

export class SSRFError extends Error {
  constructor(url: string) {
    super(`SSRF protection: URL "${url}" targets a private or localhost address`);
    this.name = 'SSRFError';
  }
}

export class TimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

// =============================================================================
// Retry Configuration
// =============================================================================

interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: Omit<RetryConfig, 'maxRetries'> = {
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

// =============================================================================
// SSRF Protection
// =============================================================================

/**
 * List of private IP ranges and localhost patterns to block
 */
const BLOCKED_PATTERNS = [
  // IPv4 localhost
  /^127\./,
  // IPv4 private ranges
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  // IPv4 link-local
  /^169\.254\./,
  // IPv6 localhost
  /^::1$/,
  /^0:0:0:0:0:0:0:1$/,
  // IPv6 private
  /^fe80:/i,
  /^fc00:/i,
  /^fd00:/i,
];

const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  '0.0.0.0',
  '[::1]',
  'metadata.google.internal',
  '169.254.169.254', // AWS/GCP metadata endpoint
];

/**
 * Validates a URL is not targeting a private or localhost address
 * @throws SSRFError if the URL targets a blocked address
 */
function validateUrlForSSRF(urlString: string): void {
  let url: URL;

  try {
    url = new URL(urlString);
  } catch {
    throw new SSRFError(urlString);
  }

  const hostname = url.hostname.toLowerCase();

  // Check against blocked hostnames
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new SSRFError(urlString);
  }

  // Check against blocked IP patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(hostname)) {
      throw new SSRFError(urlString);
    }
  }

  // Block non-http(s) protocols
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new SSRFError(urlString);
  }
}

// =============================================================================
// FirecrawlClient Class
// =============================================================================

export class FirecrawlClient {
  private readonly config: FirecrawlConfig;
  private readonly retryConfig: RetryConfig;

  constructor(config: Partial<FirecrawlConfig> = {}) {
    // Merge with environment variables and defaults
    const mergedConfig = {
      apiKey: config.apiKey ?? process.env.FIRECRAWL_API_KEY ?? '',
      baseUrl: config.baseUrl ?? 'https://api.firecrawl.dev/v1',
      timeout: config.timeout ?? 30000,
      maxRetries: config.maxRetries ?? 3,
    };

    // Validate configuration
    this.config = FirecrawlConfigSchema.parse(mergedConfig);

    // Set up retry configuration
    this.retryConfig = {
      ...DEFAULT_RETRY_CONFIG,
      maxRetries: this.config.maxRetries,
    };
  }

  /**
   * Scrape a single URL for content
   *
   * @param url - The URL to scrape
   * @param options - Scrape options (formats, filters, etc.)
   * @returns Scraped content in requested formats
   * @throws FirecrawlError on API errors
   * @throws SSRFError if URL targets private/localhost
   * @throws TimeoutError if request times out
   */
  async scrape(url: string, options?: Partial<ScrapeOptions>): Promise<ScrapeResult> {
    // Validate URL against SSRF
    validateUrlForSSRF(url);

    // Parse and validate options
    const validatedOptions = ScrapeOptionsSchema.parse(options ?? {});

    const request = {
      url,
      ...validatedOptions,
    };

    return this.withRetry(async () => {
      const response = await fetch(`${this.config.baseUrl}/scrape`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new FirecrawlError(
          `Scrape failed: ${errorText}`,
          response.status
        );
      }

      const data = await response.json();

      return {
        success: true,
        data: {
          markdown: data.data?.markdown,
          html: data.data?.html,
          rawHtml: data.data?.rawHtml,
          links: data.data?.links,
          screenshot: data.data?.screenshot,
          metadata: data.data?.metadata,
        },
      };
    });
  }

  /**
   * Search the web and optionally scrape results
   *
   * @param query - Search query string
   * @param options - Search options (limit, scrape formats)
   * @returns Search results with optional scraped content
   * @throws FirecrawlError on API errors
   * @throws TimeoutError if request times out
   */
  async search(query: string, options?: Partial<SearchOptions>): Promise<SearchResult> {
    if (!query.trim()) {
      throw new FirecrawlError('Search query cannot be empty', 400);
    }

    // Parse and validate options
    const validatedOptions = SearchOptionsSchema.parse(options ?? {});

    const request = {
      query,
      ...validatedOptions,
    };

    return this.withRetry(async () => {
      const response = await fetch(`${this.config.baseUrl}/search`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
        signal: AbortSignal.timeout(this.config.timeout),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new FirecrawlError(
          `Search failed: ${errorText}`,
          response.status
        );
      }

      const data = await response.json();

      return {
        success: true,
        results: data.data || [],
      };
    });
  }

  /**
   * Execute a function with retry and exponential backoff
   *
   * @param fn - The async function to execute
   * @returns The result of the function
   * @throws The last error if all retries are exhausted
   */
  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error = new Error('No attempts made');

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Handle timeout errors
        if (error instanceof Error && error.name === 'TimeoutError') {
          throw new TimeoutError(this.config.timeout);
        }

        // Handle abort errors (also timeout-related)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TimeoutError(this.config.timeout);
        }

        // Don't retry non-retryable errors
        if (error instanceof FirecrawlError && !error.isRetryable) {
          throw error;
        }

        // Don't retry SSRF errors
        if (error instanceof SSRFError) {
          throw error;
        }

        // Don't delay after the last attempt
        if (attempt === this.retryConfig.maxRetries) {
          break;
        }

        // Calculate delay with exponential backoff and jitter
        const exponentialDelay =
          this.retryConfig.baseDelayMs *
          Math.pow(this.retryConfig.backoffMultiplier, attempt);

        // Add jitter (random 0-25% of delay)
        const jitter = exponentialDelay * Math.random() * 0.25;

        const delay = Math.min(
          exponentialDelay + jitter,
          this.retryConfig.maxDelayMs
        );

        // Log retry attempt (in development)
        logger.debug(
          `Retry attempt ${attempt + 1}/${this.retryConfig.maxRetries} after ${Math.round(delay)}ms`
        );

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  /**
   * Sleep for a specified duration
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create a new FirecrawlClient instance
 *
 * @param config - Optional configuration overrides
 * @returns A configured FirecrawlClient instance
 *
 * @example
 * ```typescript
 * // Using environment variables
 * const client = createFirecrawlClient();
 *
 * // With custom configuration
 * const client = createFirecrawlClient({
 *   apiKey: 'my-api-key',
 *   timeout: 60000,
 *   maxRetries: 5,
 * });
 * ```
 */
export function createFirecrawlClient(
  config?: Partial<FirecrawlConfig>
): FirecrawlClient {
  return new FirecrawlClient(config);
}

// =============================================================================
// Re-export Types
// =============================================================================

export type { RetryConfig };
