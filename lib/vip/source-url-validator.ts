/**
 * Source URL Validator
 *
 * Feature: 052-vip-loadouts
 * Task: T015
 *
 * Validates and identifies source URLs for VIP loadouts.
 * Supports YouTube, Vimeo, Instagram, and generic blog URLs.
 */

import { SOURCE_URL_PATTERNS, type SourcePlatform } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

export interface SourceUrlValidation {
  isValid: boolean;
  platform: SourcePlatform | 'blog' | 'unknown';
  normalizedUrl: string | null;
  error?: string;
}

export interface SourceUrlMetadata {
  platform: SourcePlatform | 'blog';
  videoId?: string;
  channelId?: string;
  username?: string;
  title?: string;
}

// =============================================================================
// URL Validation
// =============================================================================

/**
 * Validate a source URL and identify its platform
 */
export function validateSourceUrl(url: string): SourceUrlValidation {
  // Check if URL is empty
  if (!url || url.trim() === '') {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: null,
      error: 'Source URL is required',
    };
  }

  const trimmedUrl = url.trim();

  // Check if it's a valid URL
  try {
    new URL(trimmedUrl);
  } catch {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: null,
      error: 'Invalid URL format',
    };
  }

  // Must be HTTPS (or HTTP which we'll upgrade)
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return {
      isValid: false,
      platform: 'unknown',
      normalizedUrl: null,
      error: 'URL must start with http:// or https://',
    };
  }

  // Normalize to HTTPS
  const normalizedUrl = trimmedUrl.replace(/^http:\/\//i, 'https://');

  // Detect platform
  const platform = detectPlatform(normalizedUrl);

  // Platform-specific validation
  switch (platform) {
    case 'youtube':
      return validateYouTubeUrl(normalizedUrl);
    case 'vimeo':
      return validateVimeoUrl(normalizedUrl);
    case 'instagram':
      return validateInstagramUrl(normalizedUrl);
    default:
      // Generic blog URL - just needs to be valid HTTPS
      return {
        isValid: true,
        platform: 'blog',
        normalizedUrl,
      };
  }
}

/**
 * Detect the platform from a URL
 */
export function detectPlatform(url: string): SourcePlatform | 'blog' {
  if (SOURCE_URL_PATTERNS.youtube.test(url)) return 'youtube';
  if (SOURCE_URL_PATTERNS.vimeo.test(url)) return 'vimeo';
  if (SOURCE_URL_PATTERNS.instagram.test(url)) return 'instagram';
  return 'blog';
}

// =============================================================================
// Platform-Specific Validation
// =============================================================================

/**
 * Validate YouTube URL and extract video ID
 */
function validateYouTubeUrl(url: string): SourceUrlValidation {
  const patterns = [
    // Standard watch URL
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    // Short URL
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    // Embed URL
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    // Shorts
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return {
        isValid: true,
        platform: 'youtube',
        normalizedUrl: `https://www.youtube.com/watch?v=${match[1]}`,
      };
    }
  }

  // Could be a channel or playlist URL - still valid
  if (
    url.includes('youtube.com/channel/') ||
    url.includes('youtube.com/@') ||
    url.includes('youtube.com/playlist')
  ) {
    return {
      isValid: true,
      platform: 'youtube',
      normalizedUrl: url,
    };
  }

  return {
    isValid: false,
    platform: 'youtube',
    normalizedUrl: null,
    error: 'Invalid YouTube URL. Please provide a valid video, channel, or playlist URL.',
  };
}

/**
 * Validate Vimeo URL
 */
function validateVimeoUrl(url: string): SourceUrlValidation {
  // Standard video URL
  const videoPattern = /vimeo\.com\/(\d+)/;
  const match = url.match(videoPattern);

  if (match) {
    return {
      isValid: true,
      platform: 'vimeo',
      normalizedUrl: `https://vimeo.com/${match[1]}`,
    };
  }

  // Could be a user or channel URL
  if (url.includes('vimeo.com/')) {
    return {
      isValid: true,
      platform: 'vimeo',
      normalizedUrl: url,
    };
  }

  return {
    isValid: false,
    platform: 'vimeo',
    normalizedUrl: null,
    error: 'Invalid Vimeo URL',
  };
}

/**
 * Validate Instagram URL
 */
function validateInstagramUrl(url: string): SourceUrlValidation {
  const patterns = [
    // Post
    /instagram\.com\/p\/([a-zA-Z0-9_-]+)/,
    // Reel
    /instagram\.com\/reel\/([a-zA-Z0-9_-]+)/,
    // IGTV
    /instagram\.com\/tv\/([a-zA-Z0-9_-]+)/,
    // Profile
    /instagram\.com\/([a-zA-Z0-9_.]+)\/?$/,
  ];

  for (const pattern of patterns) {
    if (pattern.test(url)) {
      return {
        isValid: true,
        platform: 'instagram',
        normalizedUrl: url.replace(/\/$/, ''), // Remove trailing slash
      };
    }
  }

  return {
    isValid: false,
    platform: 'instagram',
    normalizedUrl: null,
    error: 'Invalid Instagram URL. Please provide a post, reel, or profile URL.',
  };
}

// =============================================================================
// URL Metadata Extraction
// =============================================================================

/**
 * Extract metadata from a source URL
 */
export function extractSourceMetadata(url: string): SourceUrlMetadata | null {
  const validation = validateSourceUrl(url);
  if (!validation.isValid || !validation.normalizedUrl) return null;

  const normalizedUrl = validation.normalizedUrl;
  const platform = validation.platform;

  switch (platform) {
    case 'youtube':
      return extractYouTubeMetadata(normalizedUrl);
    case 'instagram':
      return extractInstagramMetadata(normalizedUrl);
    case 'vimeo':
      return extractVimeoMetadata(normalizedUrl);
    default:
      return { platform: 'blog' };
  }
}

function extractYouTubeMetadata(url: string): SourceUrlMetadata {
  const metadata: SourceUrlMetadata = { platform: 'youtube' };

  // Extract video ID
  const videoMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (videoMatch) {
    metadata.videoId = videoMatch[1];
  }

  // Extract channel handle
  const channelMatch = url.match(/youtube\.com\/@([a-zA-Z0-9_-]+)/);
  if (channelMatch) {
    metadata.username = channelMatch[1];
  }

  return metadata;
}

function extractInstagramMetadata(url: string): SourceUrlMetadata {
  const metadata: SourceUrlMetadata = { platform: 'instagram' };

  // Extract username from profile URL
  const profileMatch = url.match(/instagram\.com\/([a-zA-Z0-9_.]+)\/?$/);
  if (profileMatch && !['p', 'reel', 'tv'].includes(profileMatch[1])) {
    metadata.username = profileMatch[1];
  }

  return metadata;
}

function extractVimeoMetadata(url: string): SourceUrlMetadata {
  const metadata: SourceUrlMetadata = { platform: 'vimeo' };

  // Extract video ID
  const videoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (videoMatch) {
    metadata.videoId = videoMatch[1];
  }

  return metadata;
}

// =============================================================================
// URL Display Helpers
// =============================================================================

/**
 * Get display label for source URL platform
 */
export function getSourcePlatformLabel(platform: SourcePlatform | 'blog'): string {
  const labels: Record<SourcePlatform | 'blog', string> = {
    youtube: 'YouTube',
    vimeo: 'Vimeo',
    instagram: 'Instagram',
    blog: 'Blog',
  };
  return labels[platform];
}

/**
 * Get icon name for source URL platform (lucide-react)
 */
export function getSourcePlatformIcon(platform: SourcePlatform | 'blog'): string {
  const icons: Record<SourcePlatform | 'blog', string> = {
    youtube: 'Youtube',
    vimeo: 'Video',
    instagram: 'Instagram',
    blog: 'ExternalLink',
  };
  return icons[platform];
}

/**
 * Get call-to-action text for viewing source
 */
export function getSourceCtaText(platform: SourcePlatform | 'blog'): string {
  const ctas: Record<SourcePlatform | 'blog', string> = {
    youtube: 'Watch Video',
    vimeo: 'Watch Video',
    instagram: 'View Post',
    blog: 'Read Article',
  };
  return ctas[platform];
}
