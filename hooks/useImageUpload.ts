/**
 * useImageUpload Hook
 *
 * @deprecated This hook is deprecated as of Feature 038 (Cloudinary Migration).
 * Use `@/hooks/useCloudinaryUpload` for all new image upload implementations.
 * This file is kept for backward compatibility but will throw an error if used.
 *
 * Migration Path:
 * - Replace with `useCloudinaryUpload` from `@/hooks/useCloudinaryUpload`
 * - Update components to use `ImageUploadZone` instead of `ImageUploadInput`
 */

'use client';

import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';

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
 * @deprecated Use `useCloudinaryUpload` from `@/hooks/useCloudinaryUpload` instead.
 * This hook no longer works as Firebase Storage has been removed.
 */
export function useImageUpload(): UseImageUploadReturn {
  const t = useTranslations('ImageUpload');
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const upload = useCallback(
    async (_file: File): Promise<string | null> => {
      const errorMessage = 'useImageUpload is deprecated. Please use useCloudinaryUpload instead.';
      console.error('[useImageUpload]', errorMessage);
      setError(errorMessage);
      setStatus('error');
      toast.error(t('unavailable'), {
        description: t('checkConnection'),
      });
      return null;
    },
    [t]
  );

  const reset = useCallback(() => {
    setStatus('idle');
    setError(null);
  }, []);

  return { status, error, upload, reset };
}
