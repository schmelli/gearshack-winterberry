/**
 * Cloudinary Upload Hook
 * Feature: 038-cloudinary-hybrid-upload
 *
 * Handles local image uploads with WASM background removal and Cloudinary REST API upload.
 * Provides progress tracking and error handling with user-friendly messages.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import type {
  CloudinaryUploadStatus,
  CloudinaryUploadResult,
} from '@/types/cloudinary';
import {
  getCloudinaryConfig,
  getCloudinaryUploadUrl,
} from '@/lib/cloudinary/config';
import { validateImageFile } from '@/lib/cloudinary/validation';
import { removeBackground, blobToFile } from '@/lib/image-processing';

/** Hook return interface */
export interface UseCloudinaryUploadReturn {
  /** Current upload status */
  status: CloudinaryUploadStatus;
  /** Upload progress (0-100) */
  progress: number;
  /** Error message if status is 'error' */
  error: string | null;
  /** Upload a local file with optional background removal */
  uploadLocal: (
    file: File,
    options: { userId: string; itemId: string; removeBackground?: boolean }
  ) => Promise<string | null>;
  /** Upload an external URL to Cloudinary (bypasses CORS via server-side fetch) */
  uploadUrl: (
    url: string,
    options: { userId: string; itemId: string }
  ) => Promise<string | null>;
  /** Handle successful upload from Cloudinary Widget */
  handleWidgetResult: (secureUrl: string) => void;
  /** Reset state to idle */
  reset: () => void;
}

/**
 * Hook for uploading images to Cloudinary with WASM background removal
 *
 * @example
 * ```tsx
 * const { uploadLocal, status, progress, error } = useCloudinaryUpload();
 *
 * const handleUpload = async (file: File) => {
 *   const url = await uploadLocal(file, {
 *     userId: 'user123',
 *     itemId: 'item456',
 *     removeBackground: true,
 *   });
 *   if (url) {
 *     console.log('Uploaded:', url);
 *   }
 * };
 * ```
 */
export function useCloudinaryUpload(): UseCloudinaryUploadReturn {
  const [status, setStatus] = useState<CloudinaryUploadStatus>('idle');
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  /**
   * Upload a local file to Cloudinary with optional background removal
   *
   * Pipeline:
   * 1. Validate file (size, type)
   * 2. Remove background if requested (WASM processing)
   * 3. Upload to Cloudinary via REST API
   * 4. Return secure_url or null on error
   */
  const uploadLocal = useCallback(
    async (
      file: File,
      options: { userId: string; itemId: string; removeBackground?: boolean }
    ): Promise<string | null> => {
      const { userId, itemId, removeBackground: shouldRemoveBackground = true } = options;

      try {
        // Reset state
        setStatus('idle');
        setProgress(0);
        setError(null);

        // Step 1: Validate file
        const validationError = validateImageFile(file);
        if (validationError) {
          setError(validationError);
          setStatus('error');
          toast.error('Invalid file', {
            description: validationError,
          });
          return null;
        }

        let fileToUpload: File = file;

        // Step 2: Remove background if requested
        if (shouldRemoveBackground) {
          setStatus('processing');
          setProgress(25); // Indicate processing started

          try {
            const blob = await removeBackground(file);
            fileToUpload = blobToFile(blob, `${file.name.split('.')[0]}_nobg.png`);
            setProgress(50); // Processing complete
          } catch (processingError) {
            const errorMessage =
              processingError instanceof Error
                ? processingError.message
                : 'Failed to process image';
            setError(errorMessage);
            setStatus('error');
            toast.error('Background removal failed', {
              description: errorMessage,
            });
            return null;
          }
        }

        // Step 3: Upload to Cloudinary
        setStatus('uploading');
        setProgress(shouldRemoveBackground ? 60 : 30);

        const config = getCloudinaryConfig();
        const uploadUrl = getCloudinaryUploadUrl(config.cloudName);

        // Construct folder path: gearshack/users/{userId}/{itemId}
        const folder = `gearshack/users/${userId}/${itemId}`;

        // Build FormData
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', folder);

        setProgress(70); // Upload starting

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Upload failed';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorMessage;
          } catch {
            errorMessage = `Upload failed with status ${response.status}`;
          }

          setError(errorMessage);
          setStatus('error');
          toast.error('Upload failed', {
            description: errorMessage,
          });
          return null;
        }

        const result: CloudinaryUploadResult = await response.json();

        // Step 4: Success
        setProgress(100);
        setStatus('success');
        toast.success('Image uploaded successfully', {
          description: shouldRemoveBackground
            ? 'Background removed and uploaded to Cloudinary'
            : 'Uploaded to Cloudinary',
        });

        return result.secure_url;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        toast.error('Upload error', {
          description: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Upload an external URL to Cloudinary (server-side fetch, bypasses CORS)
   *
   * Pipeline:
   * 1. Validate URL format (http:// or https://)
   * 2. Upload to Cloudinary via REST API (Cloudinary fetches the URL server-side)
   * 3. Return secure_url or null on error
   */
  const uploadUrl = useCallback(
    async (
      url: string,
      options: { userId: string; itemId: string }
    ): Promise<string | null> => {
      const { userId, itemId } = options;

      try {
        // Reset state
        setStatus('idle');
        setProgress(0);
        setError(null);

        // Step 1: Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          const errorMessage = 'Invalid URL: must start with http:// or https://';
          setError(errorMessage);
          setStatus('error');
          toast.error('Invalid URL', {
            description: errorMessage,
          });
          return null;
        }

        // Step 2: Upload URL to Cloudinary
        setStatus('uploading');
        setProgress(30);

        const config = getCloudinaryConfig();
        const uploadUrl = getCloudinaryUploadUrl(config.cloudName);

        // Construct folder path: gearshack/users/{userId}/{itemId}
        const folder = `gearshack/users/${userId}/${itemId}`;

        // Build FormData with URL as the file parameter
        const formData = new FormData();
        formData.append('file', url); // Cloudinary accepts URLs directly
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', folder);

        setProgress(60); // Upload starting

        const response = await fetch(uploadUrl, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage = 'Upload failed';
          try {
            const errorJson = JSON.parse(errorText);
            errorMessage = errorJson.error?.message || errorMessage;
          } catch {
            errorMessage = `Upload failed with status ${response.status}`;
          }

          setError(errorMessage);
          setStatus('error');
          toast.error('Upload failed', {
            description: errorMessage,
          });
          return null;
        }

        const result: CloudinaryUploadResult = await response.json();

        // Step 3: Success
        setProgress(100);
        setStatus('success');
        toast.success('Image uploaded successfully', {
          description: 'URL uploaded to Cloudinary',
        });

        return result.secure_url;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        toast.error('Upload error', {
          description: errorMessage,
        });
        return null;
      }
    },
    []
  );

  /**
   * Handle successful upload from Cloudinary Widget
   * This is a convenience method for when using the cloud widget.
   * @param secureUrl - The Cloudinary secure_url (unused but part of callback signature)
   */
  const handleWidgetResult = useCallback((secureUrl: string): void => {
    // Note: secureUrl is part of the callback signature but currently unused
    // It's available for future enhancements (e.g., validation, logging)
    void secureUrl; // Suppress unused variable warning
    setStatus('success');
    setProgress(100);
    setError(null);
    toast.success('Image uploaded successfully', {
      description: 'Image saved from Cloudinary Widget',
    });
  }, []);

  /**
   * Reset all state to idle
   */
  const reset = useCallback((): void => {
    setStatus('idle');
    setProgress(0);
    setError(null);
  }, []);

  return {
    status,
    progress,
    error,
    uploadLocal,
    uploadUrl,
    handleWidgetResult,
    reset,
  };
}
