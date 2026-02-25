/**
 * Server-only Cloudinary Utility Functions
 * Feature: 048-ai-loadout-image-gen
 *
 * These functions require Node.js APIs (cloudinary SDK uses 'fs')
 * and must NOT be imported from client components.
 */

export { extractPublicId } from './cloudinary-utils';

/**
 * Delete image from Cloudinary using Admin API
 *
 * Requires server-side credentials (CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET).
 * Used for GDPR data deletion.
 *
 * @param publicId - Cloudinary public ID (e.g., 'gearshack/loadouts/generated/abc123')
 * @returns true if deletion succeeded, false otherwise
 */
export async function deleteCloudinaryImage(publicId: string): Promise<boolean> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('[Cloudinary] Missing credentials for deletion:', {
      hasCloudName: !!cloudName,
      hasApiKey: !!apiKey,
      hasApiSecret: !!apiSecret,
    });
    return false;
  }

  try {
    const { v2: cloudinary } = await import('cloudinary');

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok' || result.result === 'not found') {
      console.log(`[Cloudinary] Image deleted: ${publicId}`);
      return true;
    } else {
      console.warn(`[Cloudinary] Delete returned unexpected result: ${result.result} for ${publicId}`);
      return false;
    }
  } catch (error) {
    console.error(
      `[Cloudinary] Failed to delete image ${publicId}:`,
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}
