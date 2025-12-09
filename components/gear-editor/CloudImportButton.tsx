/**
 * CloudImportButton Component
 *
 * Feature: 038-cloudinary-hybrid-upload
 * Tasks: T017, T018, T019, T020
 * User Story: US-2 (Cloud Import via Cloudinary Widget)
 *
 * Provides a button to open the Cloudinary Upload Widget for importing
 * images from cloud sources (Unsplash, URLs). Excludes local file uploads
 * as they are handled by ImageUploadZone (User Story 1).
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useState } from 'react';
import { CldUploadWidget } from 'next-cloudinary';
import type { CloudinaryUploadWidgetResults } from 'next-cloudinary';
import { Cloud, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

export interface CloudImportButtonProps {
  /** Callback with secure_url when upload succeeds */
  onUpload: (url: string) => void;
  /** User ID for organizing uploads in Cloudinary folders */
  userId: string;
  /** Item ID for organizing uploads in Cloudinary folders */
  itemId: string;
  /** Disable button during other operations */
  disabled?: boolean;
}

// =============================================================================
// Component
// =============================================================================

export function CloudImportButton({
  onUpload,
  userId,
  itemId,
  disabled = false,
}: CloudImportButtonProps) {
  // Track loading state for widget operations
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Handle successful upload from widget
   * T019: Extract secure_url and pass to form
   */
  const handleSuccess = (result: CloudinaryUploadWidgetResults) => {
    setIsLoading(false);

    // Type guard: ensure result.info is not a string (it's an object)
    if (result?.info && typeof result.info !== 'string') {
      const secureUrl = result.info.secure_url;

      if (secureUrl) {
        // Pass URL to parent component (form)
        onUpload(secureUrl);

        // Show success toast
        toast.success('Image imported successfully', {
          description: 'Cloud image has been added to your gear item',
        });
      } else {
        // Edge case: info object exists but no secure_url
        toast.error('Upload failed', {
          description: 'No image URL received from Cloudinary',
        });
      }
    } else {
      // Edge case: result.info is missing or invalid
      toast.error('Upload failed', {
        description: 'Invalid response from Cloudinary widget',
      });
    }
  };

  /**
   * Handle widget errors
   * T020: Add error handling
   */
  const handleError = (error: unknown) => {
    setIsLoading(false);

    // Extract error message
    let errorMessage = 'Unknown error occurred';
    if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }

    // Show error toast
    toast.error('Import failed', {
      description: errorMessage,
    });

    // Log to console for debugging
    console.error('[CloudImportButton] Upload error:', error);
  };

  /**
   * Handle widget open event
   * T020: Track loading state
   */
  const handleOpen = () => {
    setIsLoading(true);
  };

  /**
   * Handle widget close event
   * T020: Reset loading state if user cancels
   */
  const handleClose = () => {
    setIsLoading(false);
  };

  return (
    <CldUploadWidget
      uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
      options={{
        // T018: Configure sources - exclude 'local' (handled by US1)
        sources: ['unsplash', 'url'],
        // Organize uploads by user and item
        folder: `gearshack/users/${userId}/${itemId}`,
        // Only allow one image at a time
        maxFiles: 1,
        // Only allow images
        resourceType: 'image',
        // Additional security/UX options
        multiple: false,
        clientAllowedFormats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
        maxFileSize: 10485760, // 10MB in bytes
      }}
      onSuccess={handleSuccess}
      onError={handleError}
      onOpen={handleOpen}
      onClose={handleClose}
    >
      {({ open }) => (
        <Button
          type="button"
          variant="outline"
          onClick={() => open()}
          disabled={disabled || isLoading}
          className="w-full sm:w-auto"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Opening...
            </>
          ) : (
            <>
              <Cloud className="w-4 h-4 mr-2" />
              Import from Cloud
            </>
          )}
        </Button>
      )}
    </CldUploadWidget>
  );
}
