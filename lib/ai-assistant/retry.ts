/**
 * Retry Logic with Exponential Backoff
 * Feature 050: AI Assistant
 *
 * Provides retry mechanism for transient failures in AI API calls.
 * Implements exponential backoff to avoid overwhelming the API.
 */

/**
 * Retry configuration options
 */
export interface RetryOptions {
  maxAttempts?: number; // Default: 3
  initialDelayMs?: number; // Default: 1000ms (1 second)
  maxDelayMs?: number; // Default: 10000ms (10 seconds)
  backoffMultiplier?: number; // Default: 2 (exponential)
  shouldRetry?: (error: Error) => boolean; // Custom retry condition
}

/**
 * Default retry condition - retries on network errors and 5xx responses
 */
function defaultShouldRetry(error: Error): boolean {
  const message = error.message.toLowerCase();

  // Retry on network errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('econnreset') ||
    message.includes('econnrefused')
  ) {
    return true;
  }

  // Retry on 5xx server errors (if error message contains status code)
  if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
    return true;
  }

  // Don't retry on 4xx client errors (bad request, auth, etc.)
  return false;
}

/**
 * Execute a function with retry logic and exponential backoff
 *
 * @param fn - The async function to execute
 * @param options - Retry configuration options
 * @returns Result of the function
 * @throws Error if all retry attempts fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
  } = options;

  let lastError: Error | null = null;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempt++;

      // If we've exhausted attempts, throw the error
      if (attempt >= maxAttempts) {
        throw lastError;
      }

      // Check if we should retry this error
      if (!shouldRetry(lastError)) {
        throw lastError;
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelayMs * Math.pow(backoffMultiplier, attempt - 1),
        maxDelayMs
      );

      console.warn(
        `Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}. Retrying in ${delay}ms...`
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError || new Error('Unknown error in retry logic');
}

/**
 * Create a retry wrapper for a specific function with preset options
 *
 * @param fn - The function to wrap
 * @param options - Retry configuration
 * @returns Wrapped function with retry logic
 */
export function createRetryWrapper<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>,
  options: RetryOptions = {}
): (...args: TArgs) => Promise<TResult> {
  return (...args: TArgs) => {
    return withRetry(() => fn(...args), options);
  };
}
