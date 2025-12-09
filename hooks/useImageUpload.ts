/**
 * useImageUpload Hook
 *
 * Feature: 010-firestore-sync
 * Tasks: T018
 * Constitution: Business logic in hooks, UI components stateless
 *
 * Custom hook for handling image uploads to Firebase Storage.
 * Provides upload state tracking, validation, and error handling.
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { uploadGearImage, StorageUploadError } from '@/lib/firebase/storage';
import { validateUploadFile } from '@/lib/validations/storage';

// =============================================================================
// Types
// =============================================================================

export type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface UseImageUploadReturn {
  /** Current upload status */
  status: UploadStatus;
  /** Error message from last upload attempt */
  error: string | null;
  /** Upload a file and return the download URL */
  upload: (file: File) => Promise<string | null>;
  /** Reset the upload state */
  reset: () => void;
}

// =============================================================================
// Hook Implementation
// =============================================================================

/**
 * Hook for uploading gear images to Firebase Storage
 *
 * @returns Upload state and control functions
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { status, error, upload, reset } = useImageUpload();
 *
 *   const handleFileSelect = async (file: File) => {
 *     const downloadUrl = await upload(file);
 *     if (downloadUrl) {
 *       // Use the download URL
 *       console.log('Uploaded:', downloadUrl);
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       <input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
 *       {status === 'uploading' && <p>Uploading...</p>}
 *       {error && <p>Error: {error}</p>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useImageUpload(): UseImageUploadReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (file: File): Promise<string | null> => {
      console.log('[useImageUpload] ====== UPLOAD STARTED ======');
      console.log('[useImageUpload] File details:', {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      // Validate file first
      const validationError = validateUploadFile(file);
      if (validationError) {
        console.error('[useImageUpload] Validation failed:', validationError);
        setError(validationError);
        setStatus('error');
        toast.error(validationError);
        return null;
      }
      console.log('[useImageUpload] Validation passed');

      // Check auth
      if (!user?.uid) {
        console.error('[useImageUpload] No user authenticated');
        const authError = 'You must be logged in to upload images';
        setError(authError);
        setStatus('error');
        toast.error('Please log in to upload images');
        return null;
      }
      console.log('[useImageUpload] User authenticated:', user.uid);

      setStatus('uploading');
      setError(null);

      try {
        console.log('[useImageUpload] Calling uploadGearImage...');
        const result = await uploadGearImage(file, user.uid);
        console.log('[useImageUpload] Upload SUCCESS:', result.downloadUrl);
        setStatus('success');
        toast.success('Image uploaded successfully');
        return result.downloadUrl;
      } catch (err) {
        console.error('[useImageUpload] ====== UPLOAD FAILED ======');
        console.error('[useImageUpload] Error:', err);

        // FR-007, FR-008, FR-009: Provide specific error messages based on error type
        let message = 'Upload failed. Please try again.';

        if (err instanceof StorageUploadError) {
          console.error('[useImageUpload] StorageUploadError code:', err.code);
          console.error('[useImageUpload] StorageUploadError message:', err.message);
          console.error('[useImageUpload] StorageUploadError details:', err.details);

          // Use the detailed message from StorageUploadError
          message = err.message;

          // Add more context for specific codes
          if (err.code === 'FILE_TOO_LARGE') {
            message = 'File is too large. Maximum size is 10MB.';
          } else if (err.code === 'INVALID_FILE_TYPE') {
            message = `Invalid file type "${file.type}". Please use JPG, PNG, WebP, or GIF.`;
          } else if (err.code === 'NOT_AUTHENTICATED') {
            message = 'Permission denied. Please log in again.';
          }
          // For UPLOAD_FAILED, use the detailed message from storage.ts
        } else if (err instanceof Error) {
          message = err.message || message;
        }

        console.error('[useImageUpload] Final error message:', message);
        setError(message);
        setStatus('error');
        toast.error(message);
        return null;
      }
    },
    [user]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, upload, reset };
}
