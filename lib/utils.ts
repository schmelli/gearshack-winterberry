import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// =============================================================================
// SECURITY: URL Validation Utilities
// =============================================================================

/**
 * SECURITY: Validates that a URL is safe for use in href attributes.
 * Prevents XSS via javascript:, data:, and other dangerous protocols.
 * @returns The validated URL if safe, null otherwise
 */
export function sanitizeExternalUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  const trimmed = url.trim();

  // Only allow http:// and https:// protocols
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.href;
  } catch {
    return null;
  }
}

// =============================================================================
// URL Cleaning Utilities
// =============================================================================

/**
 * Tracking parameters injected by Google Shopping, ad networks, and affiliate
 * systems. These have no effect on the destination content but can cause
 * caching mismatches and occasionally redirect to wrong products.
 */
const TRACKING_PARAMS = new Set([
  'srsltid',   // Google Shopping click ID
  'gclid',     // Google Ads click ID
  'gad_source',// Google Ads source
  'fbclid',    // Facebook click ID
  'msclkid',   // Microsoft Ads click ID
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'ref',       // Generic referrer
  'ref_',      // Amazon referrer variant
  'tag',       // Amazon affiliate tag
  'linkId',    // Various affiliate
  'th',        // Amazon variant selector (benign but noisy)
]);

/**
 * Strip tracking/affiliate query parameters from a product URL.
 * Returns a clean canonical URL suitable for caching and scraping.
 *
 * @example
 * cleanProductUrl('https://zpacks.com/products/duplex?srsltid=abc&utm_source=google')
 * // → 'https://zpacks.com/products/duplex'
 */
export function cleanProductUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url.trim());
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null;

    // Remove known tracking params
    for (const param of TRACKING_PARAMS) {
      parsed.searchParams.delete(param);
    }

    // If no params remain, strip the trailing '?'
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * SECURITY: Validates that a URL is from Cloudinary CDN.
 * Used for image URL manipulation to prevent URL injection attacks.
 * @returns true if the URL is a valid Cloudinary URL
 */
export function isValidCloudinaryUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Must be HTTPS from Cloudinary
    if (parsed.protocol !== 'https:') return false;
    if (!parsed.hostname.endsWith('.cloudinary.com') && parsed.hostname !== 'res.cloudinary.com') {
      return false;
    }
    // Must have /upload/ in path
    if (!parsed.pathname.includes('/upload/')) return false;
    // No path traversal
    if (parsed.pathname.includes('..') || parsed.pathname.includes('//')) return false;
    return true;
  } catch {
    return false;
  }
}
