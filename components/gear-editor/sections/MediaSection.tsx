/**
 * MediaSection Component
 *
 * Feature: 001-gear-item-editor
 * Tasks: T040-T042, T044
 * Constitution: UI components MUST be stateless (logic in hooks)
 *
 * Feature: 010-firestore-sync
 * Tasks: T019-T020 - Integrated Firebase Storage upload
 *
 * Functional Fixes Sprint:
 * - Added image upload UI with local file selection
 * - Dual approach: Paste URL or Upload Image
 * - Local preview using URL.createObjectURL
 * - Firebase Storage integration for file uploads
 *
 * Displays form fields for media management:
 * - Primary image URL with preview (URL or file upload)
 * - Gallery image URLs (multiple) with previews
 */

'use client';

import { useCallback, useState, useRef } from 'react';
import { useFormContext, useFieldArray } from 'react-hook-form';
import { Plus, Trash2, Upload, Link as LinkIcon, X, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { useImageUpload } from '@/hooks/useImageUpload';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ImagePreview } from '@/components/gear-editor/ImagePreview';
import type { GearItemFormData } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

type ImageInputMode = 'url' | 'upload';

interface LocalImageState {
  file: File | null;
  previewUrl: string | null;
}

// =============================================================================
// Constants
// =============================================================================

const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// =============================================================================
// ImageUploadInput Component
// =============================================================================

interface ImageUploadInputProps {
  value: string;
  onChange: (value: string) => void;
  onFileSelect?: (file: File | null, previewUrl: string | null) => void;
  localPreview?: string | null;
  label: string;
  description?: string;
  size?: 'sm' | 'lg';
  /** If true, automatically upload to Firebase on file select */
  enableFirebaseUpload?: boolean;
}

function ImageUploadInput({
  value,
  onChange,
  onFileSelect,
  localPreview,
  label,
  description,
  size = 'lg',
  enableFirebaseUpload = false,
}: ImageUploadInputProps) {
  const [mode, setMode] = useState<ImageInputMode>(value ? 'url' : 'url');
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Firebase upload hook (only used if enableFirebaseUpload is true)
  const { status: uploadStatus, upload } = useImageUpload();

  // Display either the local preview (from file upload) or the URL value
  const displayUrl = localPreview || value;
  const isUploading = uploadStatus === 'uploading';

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      setError(null);
      const file = event.target.files?.[0];

      if (!file) {
        onFileSelect?.(null, null);
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
      onFileSelect?.(file, previewUrl);

      // If Firebase upload is enabled, upload immediately
      if (enableFirebaseUpload) {
        const downloadUrl = await upload(file);
        if (downloadUrl) {
          // Set the download URL as the field value
          onChange(downloadUrl);
          // Clear local preview since we now have the Firebase URL
          onFileSelect?.(null, null);
          // Clean up the local preview URL
          URL.revokeObjectURL(previewUrl);
        } else {
          // Upload failed, keep the local preview
          setError('Upload failed. Please try again.');
          toast.error('Image upload failed. Please try again.');
        }
      } else {
        // Not uploading to Firebase, just clear the URL field
        onChange('');
      }
    },
    [onChange, onFileSelect, enableFirebaseUpload, upload]
  );

  const handleClearFile = useCallback(() => {
    onFileSelect?.(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setError(null);
  }, [onFileSelect]);

  const handleModeSwitch = useCallback(
    (newMode: ImageInputMode) => {
      setMode(newMode);
      setError(null);
      if (newMode === 'url') {
        // Clear file when switching to URL mode
        handleClearFile();
      } else {
        // Clear URL when switching to upload mode
        onChange('');
      }
    },
    [onChange, handleClearFile]
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
            >
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
            {/* Image Search - Coming in V2 */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                >
                  <Search className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64" align="end">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Image Search</h4>
                  <p className="text-sm text-muted-foreground">
                    Image search coming in V2. For now, use &quot;Paste URL&quot; or &quot;Upload&quot; to add images.
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* URL Input Mode */}
          {mode === 'url' && (
            <Input
              type="url"
              placeholder="https://example.com/image.jpg"
              value={value}
              onChange={(e) => onChange(e.target.value)}
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
              ) : localPreview ? (
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

// =============================================================================
// MediaSection Component
// =============================================================================

export function MediaSection() {
  const form = useFormContext<GearItemFormData>();

  // Local state for file previews (UI only - actual upload handled elsewhere)
  const [primaryImageLocal, setPrimaryImageLocal] = useState<LocalImageState>({
    file: null,
    previewUrl: null,
  });

  // Use field array for gallery images
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'galleryImageUrls' as never,
  });

  const handleAddGalleryImage = useCallback(() => {
    append('' as never);
  }, [append]);

  const handlePrimaryFileSelect = useCallback((file: File | null, previewUrl: string | null) => {
    // Clean up previous preview URL to avoid memory leaks
    if (primaryImageLocal.previewUrl) {
      URL.revokeObjectURL(primaryImageLocal.previewUrl);
    }
    setPrimaryImageLocal({ file, previewUrl });
  }, [primaryImageLocal.previewUrl]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium">Media</h3>

      {/* Primary Image */}
      <div className="space-y-4">
        <FormField
          control={form.control}
          name="primaryImageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Primary Image</FormLabel>
              <FormControl>
                <ImageUploadInput
                  value={field.value || ''}
                  onChange={field.onChange}
                  onFileSelect={handlePrimaryFileSelect}
                  localPreview={primaryImageLocal.previewUrl}
                  label="Primary image"
                  description="Main product image displayed in inventory lists. Files are uploaded to Firebase Storage."
                  size="lg"
                  enableFirebaseUpload={true}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Gallery Images */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <FormLabel className="text-base">Gallery Images</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddGalleryImage}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Image
          </Button>
        </div>

        <FormDescription>
          Additional product images for detailed views
        </FormDescription>

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center border border-dashed rounded-md">
            No gallery images added yet. Click &quot;Add Image&quot; to add one.
          </p>
        ) : (
          <div className="space-y-3">
            {fields.map((field, index) => (
              <FormField
                key={field.id}
                control={form.control}
                name={`galleryImageUrls.${index}`}
                render={({ field: inputField }) => (
                  <FormItem>
                    <div className="flex gap-3 items-start">
                      <ImagePreview
                        src={inputField.value || ''}
                        alt={`Gallery image ${index + 1} preview`}
                        size="sm"
                      />
                      <div className="flex-1">
                        <FormControl>
                          <Input
                            type="url"
                            placeholder="https://example.com/image.jpg"
                            {...inputField}
                          />
                        </FormControl>
                        <FormMessage />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => remove(index)}
                        aria-label={`Remove gallery image ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </FormItem>
                )}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
