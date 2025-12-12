/**
 * Cloudinary Configuration
 * Feature: 038-cloudinary-hybrid-upload
 */

import type { CloudinaryConfig } from '@/types/cloudinary';

/**
 * Get Cloudinary configuration from environment variables
 * @throws Error if required environment variables are missing
 */
export function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName) {
    throw new Error(
      'Missing NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  if (!uploadPreset) {
    throw new Error(
      'Missing NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET environment variable. ' +
      'Please add it to your .env.local file.'
    );
  }

  return {
    cloudName,
    uploadPreset,
  };
}

/** Cloudinary upload API endpoint */
export function getCloudinaryUploadUrl(cloudName: string): string {
  return `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;
}
