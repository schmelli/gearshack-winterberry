/**
 * File Validation for Cloudinary Uploads
 * Feature: 038-cloudinary-hybrid-upload
 */

/** Maximum file size in bytes (10MB) */
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Maximum file size in MB for display */
export const MAX_FILE_SIZE_MB = 10;

/** Accepted image MIME types */
export const ACCEPTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
] as const;

export type AcceptedImageType = typeof ACCEPTED_IMAGE_TYPES[number];

/**
 * Validate an image file for Cloudinary upload
 * @param file - The file to validate
 * @returns null if valid, error message string if invalid
 */
export function validateImageFile(file: File): string | null {
  // Check file type
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type as AcceptedImageType)) {
    return `Invalid file type "${file.type}". Please select a valid image file (JPG, PNG, WebP, or GIF).`;
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE_BYTES) {
    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    return `File size (${sizeMB}MB) exceeds the maximum allowed size of ${MAX_FILE_SIZE_MB}MB.`;
  }

  return null;
}

/**
 * Check if a file type is an accepted image type
 */
export function isAcceptedImageType(mimeType: string): mimeType is AcceptedImageType {
  return ACCEPTED_IMAGE_TYPES.includes(mimeType as AcceptedImageType);
}
