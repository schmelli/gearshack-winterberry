/**
 * Shared Serper API Helpers
 *
 * Common utilities for building Serper image search queries and validating
 * image URLs. Used by both the server-side catalog matcher and the
 * client-facing product-image API route.
 */

/** Default timeout for Serper API requests (5 seconds) */
export const SERPER_TIMEOUT_MS = 5000;

/**
 * Build a Serper image search query for a product.
 * Shared between server-side catalog matcher and client-facing API route
 * to keep the two call sites in sync.
 */
export function buildProductImageQuery(
  brand: string | null,
  productName: string
): string {
  return [brand, productName, 'outdoor gear product']
    .filter(Boolean)
    .join(' ');
}

/**
 * Validate that a URL uses a safe scheme (http or https).
 * Prevents javascript: or data: URLs from untrusted external API responses.
 */
export function sanitizeImageUrl(url: unknown): string | null {
  if (typeof url !== 'string') return null;
  return /^https?:\/\//i.test(url) ? url : null;
}
