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
  const blob = await imglyRemoveBackground(imageFile, {
    publicPath: 'https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/dist/',
  });
  return blob;
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
