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
