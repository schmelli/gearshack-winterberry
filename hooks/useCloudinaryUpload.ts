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
import { useTranslations } from 'next-intl';
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
  /** Upload an external URL to Cloudinary with optional background removal */
  uploadUrl: (
    url: string,
    options: { userId: string; itemId: string; removeBackground?: boolean }
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
  const t = useTranslations('CloudinaryUpload');
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
          toast.error(t('invalidFile'), {
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
            toast.error(t('backgroundRemovalFailed'), {
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
          toast.error(t('uploadFailed'), {
            description: errorMessage,
          });
          return null;
        }

        const result: CloudinaryUploadResult = await response.json();

        // Step 4: Success
        setProgress(100);
        setStatus('success');
        toast.success(t('uploadSuccess'), {
          description: shouldRemoveBackground
            ? t('uploadSuccessWithBgRemoval')
            : t('uploadSuccessNoBgRemoval'),
        });

        return result.secure_url;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        toast.error(t('uploadError'), {
          description: errorMessage,
        });
        return null;
      }
    },
    [t]
  );

  /**
   * Upload an external URL to Cloudinary with WASM background removal
   *
   * Pipeline:
   * 1. Validate URL format (http:// or https://)
   * 2. Fetch image via proxy (to bypass CORS)
   * 3. Remove background using WASM
   * 4. Upload processed image to Cloudinary
   * 5. Return secure_url or null on error
   */
  const uploadUrl = useCallback(
    async (
      url: string,
      options: { userId: string; itemId: string; removeBackground?: boolean }
    ): Promise<string | null> => {
      const { userId, itemId, removeBackground: shouldRemoveBackground = true } = options;

      try {
        // Reset state
        setStatus('idle');
        setProgress(0);
        setError(null);

        // Step 1: Validate URL format
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
          const errorMessage = t('invalidUrlDescription');
          setError(errorMessage);
          setStatus('error');
          toast.error(t('invalidUrl'), {
            description: errorMessage,
          });
          return null;
        }

        // Step 2: Fetch image via proxy to bypass CORS
        setStatus('processing');
        setProgress(10);

        const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
        const fetchResponse = await fetch(proxyUrl);

        if (!fetchResponse.ok) {
          const errorMessage = t('imageFetchFailedDescription', { status: fetchResponse.status });
          setError(errorMessage);
          setStatus('error');
          toast.error(t('imageFetchFailed'), {
            description: errorMessage,
          });
          return null;
        }

        const imageBlob = await fetchResponse.blob();
        setProgress(25);

        // Convert blob to File for processing
        const fileName = url.split('/').pop()?.split('?')[0] || 'image.jpg';
        let fileToUpload = new File([imageBlob], fileName, { type: imageBlob.type });

        // Step 3: Remove background if requested
        if (shouldRemoveBackground) {
          setProgress(30);

          try {
            const processedBlob = await removeBackground(fileToUpload);
            fileToUpload = blobToFile(processedBlob, `${fileName.split('.')[0]}_nobg.png`);
            setProgress(60);
          } catch (processingError) {
            const errorMessage =
              processingError instanceof Error
                ? processingError.message
                : 'Failed to process image';
            setError(errorMessage);
            setStatus('error');
            toast.error(t('backgroundRemovalFailed'), {
              description: errorMessage,
            });
            return null;
          }
        }

        // Step 4: Upload to Cloudinary
        setStatus('uploading');
        setProgress(70);

        const config = getCloudinaryConfig();
        const cloudinaryUploadUrl = getCloudinaryUploadUrl(config.cloudName);

        // Construct folder path: gearshack/users/{userId}/{itemId}
        const folder = `gearshack/users/${userId}/${itemId}`;

        // Build FormData
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('upload_preset', config.uploadPreset);
        formData.append('folder', folder);

        setProgress(80);

        const response = await fetch(cloudinaryUploadUrl, {
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
          toast.error(t('uploadFailed'), {
            description: errorMessage,
          });
          return null;
        }

        const result: CloudinaryUploadResult = await response.json();

        // Step 5: Success
        setProgress(100);
        setStatus('success');
        toast.success(t('uploadSuccess'), {
          description: shouldRemoveBackground
            ? t('uploadSuccessWithBgRemoval')
            : t('urlUploadSuccess'),
        });

        return result.secure_url;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'An unexpected error occurred';
        setError(errorMessage);
        setStatus('error');
        toast.error(t('uploadError'), {
          description: errorMessage,
        });
        return null;
      }
    },
    [t]
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
    toast.success(t('uploadSuccess'), {
      description: t('widgetSuccess'),
    });
  }, [t]);

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
