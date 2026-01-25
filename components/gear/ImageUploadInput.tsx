/**
 * ImageUploadInput Component
 *
 * @deprecated This component is deprecated as of Feature 038 (Cloudinary Migration).
 * Use `ImageUploadZone` from `@/components/gear-editor/ImageUploadZone` instead.
 * This file is kept for backward compatibility and may be removed in a future version.
 *
 * Feature: 010-firestore-sync
 * Tasks: T020
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Reusable image upload component with Firebase Storage integration.
 * Supports both URL paste and file upload with drag-and-drop.
 */

'use client';

// =============================================================================
// DEPRECATION NOTICE
// =============================================================================
// This component has been replaced by ImageUploadZone which uses Cloudinary.
// Please migrate to: @/components/gear-editor/ImageUploadZone
// This legacy component uses Firebase Storage and will be removed in a future version.
// =============================================================================

import { useCallback, useState, useRef, useEffect } from 'react';
import { Upload, Link as LinkIcon, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePreview } from '@/components/gear-editor/ImagePreview';
import { useImageUpload } from '@/hooks/useImageUpload';

// =============================================================================
// Types
// =============================================================================

type ImageInputMode = 'url' | 'upload';

export interface ImageUploadInputProps {
  /** Current image URL value */
  value: string;
  /** Callback when URL changes (from paste or upload) */
  onUpload: (url: string) => void;
  /** Label for accessibility */
  label?: string;
  /** Description text below the input */
  description?: string;
  /** Preview size */
  size?: 'sm' | 'lg';
  /** Whether to enable Firebase upload (default: true) */
  enableFirebaseUpload?: boolean;
  /** Optional local preview URL (for external file handling) */
  localPreview?: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// =============================================================================
// Component
// =============================================================================

/**
 * Reusable image upload input component
 *
 * @deprecated Use ImageUploadZone from @/components/gear-editor/ImageUploadZone instead.
 * This component uses Firebase Storage and is being replaced by a Cloudinary-based solution.
 *
 * Features:
 * - Toggle between URL paste and file upload
 * - Drag-and-drop support
 * - Automatic Firebase Storage upload
 * - Upload progress indicator
 * - File validation (type, size)
 * - Image preview
 *
 * @example
 * ```tsx
 * // DEPRECATED - Use ImageUploadZone instead
 * function MyForm() {
 *   const [imageUrl, setImageUrl] = useState('');
 *
 *   return (
 *     <ImageUploadInput
 *       value={imageUrl}
 *       onUpload={setImageUrl}
 *       label="Product Image"
 *       description="Upload or paste image URL"
 *     />
 *   );
 * }
 * ```
 */
export function ImageUploadInput({
  value,
  onUpload,
  label = 'Image',
  description,
  size = 'lg',
  enableFirebaseUpload = true,
  localPreview,
}: ImageUploadInputProps) {
  const [mode, setMode] = useState<ImageInputMode>(value ? 'url' : 'url');
  const [error, setError] = useState<string | null>(null);
  const [tempPreview, setTempPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firebase upload hook
  const { status: uploadStatus, upload } = useImageUpload();

  // Cleanup tempPreview blob URL to prevent memory leaks
  // Use ref to track previous preview for proper cleanup
  const prevPreviewRef = useRef<string | null>(null);

  useEffect(() => {
    // Revoke previous URL when tempPreview changes
    if (prevPreviewRef.current && prevPreviewRef.current !== tempPreview) {
      URL.revokeObjectURL(prevPreviewRef.current);
    }
    prevPreviewRef.current = tempPreview;

    // Cleanup on unmount
    return () => {
      if (prevPreviewRef.current) {
        URL.revokeObjectURL(prevPreviewRef.current);
        prevPreviewRef.current = null;
      }
    };
  }, [tempPreview]);

  // Display preview
  const displayUrl = localPreview || tempPreview || value;
  const isUploading = uploadStatus === 'uploading';

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0];

      if (!file) {
        setTempPreview(null);
        return;
      }

      // Validate file type
      if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
        setError('Please select a valid image file (JPG, PNG, WebP, or GIF)');
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
        return;
      }

      // Create local preview URL for immediate feedback
      const previewUrl = URL.createObjectURL(file);
      setTempPreview(previewUrl);

      // Upload to Firebase if enabled
      if (enableFirebaseUpload) {
        const downloadUrl = await upload(file);
        if (downloadUrl) {
          // Success - set the download URL
          onUpload(downloadUrl);
          // Clean up temp preview
          URL.revokeObjectURL(previewUrl);
          setTempPreview(null);
        } else {
          // Upload failed, keep preview for retry
          setError('Upload failed. Please try again.');
        }
      }
    },
    [enableFirebaseUpload, upload, onUpload]
  );

  const handleClearFile = useCallback(() => {
    if (tempPreview) {
      URL.revokeObjectURL(tempPreview);
    }
    setTempPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  }, [tempPreview]);

  const handleModeSwitch = useCallback(
    (newMode: ImageInputMode) => {
      setMode(newMode);
      setError(null);
      if (newMode === 'url') {
        handleClearFile();
      }
    },
    [handleClearFile]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-4 items-start">
        <ImagePreview
          src={displayUrl || ''}
          alt={`${label} preview`}
          size={size}
        />
        <div className="flex-1 space-y-3">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={mode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeSwitch('url')}
              className="flex-1"
              disabled={isUploading}
            >
              <LinkIcon className="w-4 h-4 mr-1" />
              Paste URL
            </Button>
            <Button
              type="button"
              variant={mode === 'upload' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeSwitch('upload')}
              className="flex-1"
              disabled={isUploading}
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
          </div>

          {/* URL Input Mode */}
          {mode === 'url' && (
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={value}
              onChange={(e) => onUpload(e.target.value)}
              disabled={isUploading}
            />
          )}

          {/* File Upload Mode */}
          {mode === 'upload' && (
            <div className="space-y-2">
              {isUploading ? (
                // Show upload progress
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm flex-1 truncate text-muted-foreground">
                    Uploading to Firebase...
                  </span>
                </div>
              ) : tempPreview || localPreview ? (
                // Show selected file info
                <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                  <span className="text-sm flex-1 truncate text-muted-foreground">
                    Image selected
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearFile}
                    className="h-7 w-7 p-0"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Remove image</span>
                  </Button>
                </div>
              ) : (
                // Dropzone / File input
                <div
                  className={`border-2 border-dashed rounded-md p-4 text-center transition-colors ${
                    isUploading
                      ? 'cursor-not-allowed opacity-50'
                      : 'cursor-pointer hover:border-primary/50 hover:bg-muted/50'
                  }`}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    if (!isUploading) {
                      e.preventDefault();
                      e.stopPropagation();
                    }
                  }}
                  onDrop={(e) => {
                    if (!isUploading) {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files?.[0];
                      if (file && fileInputRef.current) {
                        // Create a new DataTransfer to set the file
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        fileInputRef.current.files = dt.files;
                        // Trigger the change event manually
                        const event = new Event('change', { bubbles: true });
                        fileInputRef.current.dispatchEvent(event);
                      }
                    }
                  }}
                >
                  <Upload className="w-6 h-6 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Click or drag image here
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, WebP, GIF (max {MAX_FILE_SIZE_MB}MB)
                  </p>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={isUploading}
                className="hidden"
              />
            </div>
          )}

          {/* Error Message */}
          {error && <p className="text-sm text-destructive">{error}</p>}

          {/* Description */}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}
