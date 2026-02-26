/**
 * Cloudinary Utility Tests
 *
 * Tests for Cloudinary URL handling, public ID extraction,
 * and image optimization utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  extractPublicId,
  isValidCloudinaryUrl,
  optimizeCloudinaryUrl,
} from '@/lib/cloudinary-utils';

// =============================================================================
// Test Constants
// =============================================================================

const CLOUD_NAME = 'gearshack-test';
const VALID_URL_BASE = `https://res.cloudinary.com/${CLOUD_NAME}`;

// Sample Cloudinary URLs
const SAMPLE_URLS = {
  standard: `${VALID_URL_BASE}/image/upload/v1234567890/gearshack/loadouts/generated/abc123.jpg`,
  withTransformations: `${VALID_URL_BASE}/image/upload/f_auto,q_auto/v1234567890/gearshack/loadouts/test.png`,
  pngImage: `${VALID_URL_BASE}/image/upload/v1234567890/gearshack/inventory/tent.png`,
  nestedFolder: `${VALID_URL_BASE}/image/upload/v1234567890/gearshack/users/avatars/user123.webp`,
  multipleDotsFilename: `${VALID_URL_BASE}/image/upload/v1234567890/gearshack/backup/file.backup.jpg`,
};

// =============================================================================
// extractPublicId Tests
// =============================================================================

describe('extractPublicId', () => {
  describe('Valid URLs', () => {
    it('should extract public ID from standard URL', () => {
      const publicId = extractPublicId(SAMPLE_URLS.standard);
      expect(publicId).toBe('gearshack/loadouts/generated/abc123');
    });

    it('should extract public ID from URL with transformations', () => {
      const publicId = extractPublicId(SAMPLE_URLS.withTransformations);
      expect(publicId).toBe('gearshack/loadouts/test');
    });

    it('should extract public ID from PNG image', () => {
      const publicId = extractPublicId(SAMPLE_URLS.pngImage);
      expect(publicId).toBe('gearshack/inventory/tent');
    });

    it('should handle nested folder structure', () => {
      const publicId = extractPublicId(SAMPLE_URLS.nestedFolder);
      expect(publicId).toBe('gearshack/users/avatars/user123');
    });

    it('should handle filename with multiple dots', () => {
      const publicId = extractPublicId(SAMPLE_URLS.multipleDotsFilename);
      expect(publicId).toBe('gearshack/backup/file.backup');
    });

    it('should work with custom folder prefix', () => {
      const url = `${VALID_URL_BASE}/image/upload/v123/custom-folder/images/test.jpg`;
      const publicId = extractPublicId(url, 'custom-folder');
      expect(publicId).toBe('custom-folder/images/test');
    });
  });

  describe('Invalid URLs', () => {
    it('should throw error for empty URL', () => {
      expect(() => extractPublicId('')).toThrow('Cloudinary URL is required');
    });

    it('should throw error for non-Cloudinary URL', () => {
      expect(() => extractPublicId('https://example.com/image.jpg')).toThrow(
        /expected URL to start with/
      );
    });

    it('should throw error when folder prefix not found', () => {
      const url = `${VALID_URL_BASE}/image/upload/v123/other-folder/test.jpg`;
      expect(() => extractPublicId(url, 'gearshack')).toThrow(
        /folder prefix 'gearshack' not found/
      );
    });

    it('should throw error for HTTP (non-HTTPS) URL', () => {
      const httpUrl = 'http://res.cloudinary.com/test/image/upload/test.jpg';
      expect(() => extractPublicId(httpUrl)).toThrow(/expected URL to start with/);
    });
  });
});

// =============================================================================
// isValidCloudinaryUrl Tests
// =============================================================================

describe('isValidCloudinaryUrl', () => {
  describe('Valid URLs', () => {
    it('should return true for standard Cloudinary URL', () => {
      expect(isValidCloudinaryUrl(SAMPLE_URLS.standard)).toBe(true);
    });

    it('should return true for URL with transformations', () => {
      expect(isValidCloudinaryUrl(SAMPLE_URLS.withTransformations)).toBe(true);
    });

    it('should return true for URL with nested folders', () => {
      expect(isValidCloudinaryUrl(SAMPLE_URLS.nestedFolder)).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    it('should return false for empty string', () => {
      expect(isValidCloudinaryUrl('')).toBe(false);
    });

    it('should return false for null-like values', () => {
      expect(isValidCloudinaryUrl(undefined as unknown as string)).toBe(false);
      expect(isValidCloudinaryUrl(null as unknown as string)).toBe(false);
    });

    it('should return false for non-Cloudinary URLs', () => {
      expect(isValidCloudinaryUrl('https://example.com/image.jpg')).toBe(false);
      expect(isValidCloudinaryUrl('https://s3.amazonaws.com/bucket/image.jpg')).toBe(false);
    });

    it('should return false for HTTP URLs', () => {
      expect(isValidCloudinaryUrl('http://res.cloudinary.com/test/image.jpg')).toBe(false);
    });

    it('should return false for malformed URLs', () => {
      expect(isValidCloudinaryUrl('not-a-url')).toBe(false);
      expect(isValidCloudinaryUrl('cloudinary.com/image.jpg')).toBe(false);
    });
  });
});

// =============================================================================
// optimizeCloudinaryUrl Tests
// =============================================================================

describe('optimizeCloudinaryUrl', () => {
  describe('Standard Optimization', () => {
    it('should add default transformations', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard);

      expect(optimized).toContain('f_auto');
      expect(optimized).toContain('q_auto:good');
      expect(optimized).toContain('c_limit');
      expect(optimized).toContain('w_800');
    });

    it('should inject transformations after /upload/', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard);
      const uploadIndex = optimized.indexOf('/upload/');
      const afterUpload = optimized.substring(uploadIndex + 8);

      expect(afterUpload).toMatch(/^f_auto,q_auto:good,c_limit,w_800\//);
    });

    it('should preserve the rest of the URL path', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard);

      expect(optimized).toContain('gearshack/loadouts/generated/abc123.jpg');
    });
  });

  describe('Custom Options', () => {
    it('should apply custom width', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        width: 400,
      });

      expect(optimized).toContain('w_400');
    });

    it('should apply custom quality', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        quality: 'auto:best',
      });

      expect(optimized).toContain('q_auto:best');
    });

    it('should apply specific format', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        format: 'webp',
      });

      expect(optimized).toContain('f_webp');
    });

    it('should apply all custom options together', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        width: 1200,
        quality: 'auto:low',
        format: 'jpg',
      });

      expect(optimized).toContain('w_1200');
      expect(optimized).toContain('q_auto:low');
      expect(optimized).toContain('f_jpg');
    });
  });

  describe('Edge Cases', () => {
    it('should return original URL if empty', () => {
      const result = optimizeCloudinaryUrl('');
      expect(result).toBe('');
    });

    it('should return original URL if not a Cloudinary URL', () => {
      const externalUrl = 'https://example.com/image.jpg';
      const result = optimizeCloudinaryUrl(externalUrl);
      expect(result).toBe(externalUrl);
    });

    it('should return original URL if no /upload/ segment', () => {
      const malformedUrl = `${VALID_URL_BASE}/raw/v123/file.pdf`;
      const result = optimizeCloudinaryUrl(malformedUrl);
      expect(result).toBe(malformedUrl);
    });

    it('should handle URL that already has transformations', () => {
      // Note: This adds additional transformations after existing ones
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.withTransformations);

      expect(optimized).toContain('f_auto,q_auto:good,c_limit,w_800');
    });
  });

  describe('Quality Options', () => {
    it('should accept auto quality', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        quality: 'auto',
      });
      expect(optimized).toContain('q_auto');
    });

    it('should accept auto:low quality', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        quality: 'auto:low',
      });
      expect(optimized).toContain('q_auto:low');
    });

    it('should accept auto:best quality', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        quality: 'auto:best',
      });
      expect(optimized).toContain('q_auto:best');
    });
  });

  describe('Format Options', () => {
    it('should accept png format', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        format: 'png',
      });
      expect(optimized).toContain('f_png');
    });

    it('should accept jpg format', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        format: 'jpg',
      });
      expect(optimized).toContain('f_jpg');
    });

    it('should accept webp format', () => {
      const optimized = optimizeCloudinaryUrl(SAMPLE_URLS.standard, {
        format: 'webp',
      });
      expect(optimized).toContain('f_webp');
    });
  });
});
