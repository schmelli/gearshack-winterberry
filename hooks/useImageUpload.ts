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
      // Validate file first
      const validationError = validateUploadFile(file);
      if (validationError) {
        setError(validationError);
        setStatus('error');
        toast.error(validationError);
        return null;
      }

      // Check auth
      if (!user?.uid) {
        const authError = 'You must be logged in to upload images';
        setError(authError);
        setStatus('error');
        toast.error('Please log in to upload images');
        return null;
      }

      setStatus('uploading');
      setError(null);

      try {
        const result = await uploadGearImage(file, user.uid);
        setStatus('success');
        toast.success('Image uploaded successfully');
        return result.downloadUrl;
      } catch (err) {
        // FR-007, FR-008, FR-009: Provide specific error messages based on error type
        let message = 'Upload failed. Please try again.';

        if (err instanceof StorageUploadError) {
          switch (err.code) {
            case 'FILE_TOO_LARGE':
              message = 'File is too large. Maximum size is 10MB.';
              break;
            case 'INVALID_FILE_TYPE':
              message = 'Invalid file type. Please use JPG, PNG, WebP, or GIF.';
              break;
            case 'NOT_AUTHENTICATED':
              message = 'Permission denied. Please log in again.';
              break;
            case 'UPLOAD_FAILED':
              message = 'Upload failed. Please check your connection and try again.';
              break;
          }
        } else if (err instanceof Error) {
          // Use the error message if it's more specific
          message = err.message || message;
        }

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
