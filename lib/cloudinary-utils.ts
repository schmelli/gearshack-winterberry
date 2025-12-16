/**
 * Cloudinary Utility Functions
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Pure utility functions for Cloudinary URL handling
 */

/**
 * Extract public_id from a Cloudinary URL
 *
 * Handles standard Cloudinary URLs in the format:
 * https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{file}.{ext}
 *
 * @param cloudinaryUrl - Full Cloudinary URL
 * @param folderPrefix - Expected folder prefix (default: 'gearshack')
 * @returns Public ID without extension (e.g., 'gearshack/loadouts/generated/abc123')
 * @throws Error if URL format is invalid or folder prefix not found
 */
export function extractPublicId(
  cloudinaryUrl: string,
  folderPrefix = 'gearshack'
): string {
  if (!cloudinaryUrl) {
    throw new Error('Cloudinary URL is required');
  }

  // Validate URL format
  if (!cloudinaryUrl.startsWith('https://res.cloudinary.com/')) {
    throw new Error(
      `Invalid Cloudinary URL format: expected URL to start with 'https://res.cloudinary.com/', got: ${cloudinaryUrl}`
    );
  }

  const urlParts = cloudinaryUrl.split('/');
  const folderIndex = urlParts.indexOf(folderPrefix);

  if (folderIndex === -1) {
    throw new Error(
      `Invalid Cloudinary URL format: expected folder prefix '${folderPrefix}' not found in URL: ${cloudinaryUrl}`
    );
  }

  // Extract path from folder prefix onwards
  const publicIdWithExt = urlParts.slice(folderIndex).join('/');

  // Remove file extension (handles multiple dots in filename)
  // Removes only the last extension (e.g., 'file.backup.jpg' -> 'file.backup')
  const publicId = publicIdWithExt.replace(/\.[^.]+$/, '');

  if (!publicId) {
    throw new Error(
      `Failed to extract public ID from Cloudinary URL: ${cloudinaryUrl}`
    );
  }

  return publicId;
}

/**
 * Validate that a string is a valid Cloudinary URL
 *
 * @param url - URL to validate
 * @returns true if URL is a valid Cloudinary URL
 */
export function isValidCloudinaryUrl(url: string): boolean {
  if (!url) return false;
  if (!url.startsWith('https://res.cloudinary.com/')) return false;

  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}
