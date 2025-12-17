/**
 * Image Processing Utilities
 *
 * Feature: 026-client-bg-removal
 * Constitution: Business logic in lib/, UI components stateless
 *
 * Client-side image processing using WASM-based background removal.
 * Assets are lazy-loaded from CDN on first use to avoid bundle impact.
 */

import { removeBackground as imglyRemoveBackground } from '@imgly/background-removal';

/**
 * Version of @imgly/background-removal package.
 *
 * ⚠️ IMPORTANT: This must be kept in sync with the version in package.json.
 * When updating the package, update this constant to match the new version.
 * Mismatch between the library version and CDN assets will cause runtime errors.
 */
const IMGLY_BACKGROUND_REMOVAL_VERSION = '1.7.0';

/**
 * Remove background from an image file
 *
 * Uses @imgly/background-removal WASM library for client-side processing.
 * Assets are lazy-loaded from CDN on first use (FR-008).
 *
 * @param imageFile - The image file to process
 * @returns PNG blob with transparent background
 * @throws Error if processing fails
 */
export async function removeBackground(imageFile: File): Promise<Blob> {
  try {
    const blob = await imglyRemoveBackground(imageFile, {
      publicPath: `https://unpkg.com/@imgly/background-removal@${IMGLY_BACKGROUND_REMOVAL_VERSION}/dist/`,
      debug: process.env.NODE_ENV === 'development',
      model: 'isnet_fp16', // Use fp16 model for better balance of speed and quality
      output: {
        format: 'image/png',
        quality: 0.8,
      },
    });
    return blob;
  } catch (error) {
    console.error('Background removal error:', error);

    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Failed to fetch') || error.message.includes('fetch')) {
        throw new Error('Unable to load background removal assets. Please check your internet connection.');
      } else if (error.message.includes('WebAssembly') || error.message.includes('WASM')) {
        throw new Error('Your browser does not support background removal. Please use a modern browser.');
      } else {
        throw new Error(`Background removal failed: ${error.message}`);
      }
    }

    throw new Error('Background removal failed. Please try again or upload without background removal.');
  }
}

/**
 * Convert a Blob to a File object
 *
 * @param blob - The blob to convert
 * @param filename - The filename for the new File
 * @returns File object with image/png type
 */
export function blobToFile(blob: Blob, filename: string = 'processed.png'): File {
  return new File([blob], filename, { type: 'image/png' });
}
