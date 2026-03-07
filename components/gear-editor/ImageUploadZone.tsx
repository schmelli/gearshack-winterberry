/**
 * ImageUploadZone Component
 *
 * Feature: 038-cloudinary-hybrid-upload + 039-product-search-cloudinary
 *
 * Provides drag-and-drop file upload with background removal toggle,
 * progress indicators, and file validation. Integrates with Cloudinary
 * via useCloudinaryUpload hook.
 *
 * UI Layout:
 * 1. Drag & Drop Zone (with WASM background removal toggle)
 * 2. "OR" Divider
 * 3. URL Input Field + Search Button (opens modal)
 *
 * User can either:
 * a) Drag & drop / browse for local file
 * b) Paste a URL directly
 * c) Click search button to find product images in a modal
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useState, useRef, useCallback, useEffect, DragEvent, ChangeEvent } from 'react';
import { Upload, Loader2, X, Check, AlertCircle, Search } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { MAX_FILE_SIZE_MB } from '@/lib/cloudinary/validation';
import { ImagePreview } from '@/components/gear-editor/ImagePreview';
import { ProductSearchModal } from '@/components/gear-editor/ProductSearchModal';

// =============================================================================
// Types
// =============================================================================

export interface ImageUploadZoneProps {
  /** Current image URL (Cloudinary or Firebase) */
  value: string;
  /** Callback when image URL changes */
  onChange: (url: string) => void;
  /** User ID for organizing uploads */
  userId: string;
  /** Item ID for organizing uploads */
  itemId: string;
  /** Optional label text */
  label?: string;
  /** Brand name for search (from form) */
  brand?: string;
  /** Product name for search (from form) */
  productName?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ImageUploadZone({
  value,
  onChange,
  userId,
  itemId,
  label,
  brand = '',
  productName = '',
}: ImageUploadZoneProps) {
  const t = useTranslations('GearEditor.imageUpload');

  // State for drag-and-drop UI
  const [isDragOver, setIsDragOver] = useState(false);

  // State for background removal toggle (enabled by default per spec)
  const [removeBackground, setRemoveBackground] = useState(true);

  // State for URL input field
  const [urlInput, setUrlInput] = useState('');

  // State for search modal
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);

  // Cloudinary upload hook
  const { uploadLocal, uploadUrl, status, progress, error, reset } = useCloudinaryUpload();

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timeout ref for reset cleanup
  const resetTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
    };
  }, []);

  // Build search query from brand + product name
  const searchQuery = [brand, productName].filter(Boolean).join(' ').trim();

  // =============================================================================
  // Handlers
  // =============================================================================

  /**
   * Handle file selection and trigger upload
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      const secureUrl = await uploadLocal(file, {
        userId,
        itemId,
        removeBackground,
      });

      if (secureUrl) {
        onChange(secureUrl);
        // Clear any existing timeout before setting a new one
        if (resetTimeoutRef.current) {
          clearTimeout(resetTimeoutRef.current);
        }
        resetTimeoutRef.current = setTimeout(() => reset(), 2000);
      }
    },
    [uploadLocal, userId, itemId, removeBackground, onChange, reset]
  );

  /**
   * Handle drag over event
   */
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * Handle drag leave event
   */
  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * Handle file drop
   */
  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  /**
   * Handle file input change
   */
  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFileSelect(files[0]);
      }
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    [handleFileSelect]
  );

  /**
   * Open file browser
   */
  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  /**
   * Clear current image
   */
  const handleClearImage = useCallback(() => {
    onChange('');
    setUrlInput('');
    reset();
  }, [onChange, reset]);

  /**
   * Handle URL input submission
   */
  const handleUrlSubmit = useCallback(async () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    // Validate URL format
    if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
      return;
    }

    // Upload URL to Cloudinary
    const secureUrl = await uploadUrl(trimmedUrl, { userId, itemId, removeBackground });
    if (secureUrl) {
      onChange(secureUrl);
      setUrlInput('');
      // Clear any existing timeout before setting a new one
      if (resetTimeoutRef.current) {
        clearTimeout(resetTimeoutRef.current);
      }
      resetTimeoutRef.current = setTimeout(() => reset(), 2000);
    }
  }, [urlInput, uploadUrl, userId, itemId, removeBackground, onChange, reset]);

  /**
   * Handle image selected from search modal
   */
  const handleSearchImageSelected = useCallback((cloudinaryUrl: string) => {
    onChange(cloudinaryUrl);
    setUrlInput('');
  }, [onChange]);

  // =============================================================================
  // Render States
  // =============================================================================

  const isProcessing = status === 'processing';
  const isUploading = status === 'uploading';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isLoading = isProcessing || isUploading;

  return (
    <div className="space-y-4">
      {/* Label */}
      {label && (
        <Label className="text-base font-semibold">{label}</Label>
      )}

      {/* Image Preview (if URL exists) */}
      {value && !isLoading && (
        <div className="relative inline-block">
          <ImagePreview src={value} alt="Product image" size="lg" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-8 w-8 rounded-full shadow-lg"
            onClick={handleClearImage}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* ================================================================= */}
      {/* SECTION 1: Drag & Drop Zone */}
      {/* ================================================================= */}
      <div
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors cursor-pointer',
          isDragOver && 'border-primary bg-primary/5',
          !isDragOver && 'border-border bg-muted/20',
          isLoading && 'pointer-events-none opacity-60'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleBrowseClick();
          }
        }}
      >
        {/* Upload Icon / Status Icon */}
        <div className="mb-4">
          {isLoading && (
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          )}
          {isSuccess && (
            <Check className="h-12 w-12 text-green-600" />
          )}
          {isError && (
            <AlertCircle className="h-12 w-12 text-destructive" />
          )}
          {!isLoading && !isSuccess && !isError && (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}
        </div>

        {/* Status Text */}
        <div className="text-center space-y-2">
          {isProcessing && (
            <p className="text-sm font-medium text-primary">
              {t('removingBackground')}
            </p>
          )}
          {isUploading && (
            <p className="text-sm font-medium text-primary">
              {t('uploadingToCloudinary')}
            </p>
          )}
          {isSuccess && (
            <p className="text-sm font-medium text-green-600">
              {t('uploadSuccessful')}
            </p>
          )}
          {isError && error && (
            <p className="text-sm font-medium text-destructive">
              {error}
            </p>
          )}
          {!isLoading && !isSuccess && !isError && (
            <>
              <p className="text-sm font-medium text-foreground">
                {t('dragAndDrop')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('fileTypes', { maxSize: MAX_FILE_SIZE_MB })}
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {isLoading && progress > 0 && (
          <div className="w-full max-w-xs mt-4">
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-center text-muted-foreground mt-1">
              {progress}%
            </p>
          </div>
        )}

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={handleFileInputChange}
        />
      </div>

      {/* Background Removal Toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-muted/40 border">
        <div className="space-y-0.5">
          <Label htmlFor="remove-bg" className="text-sm font-medium cursor-pointer">
            {t('removeBackground')}
          </Label>
          <p className="text-xs text-muted-foreground">
            {t('removeBackgroundDescription')}
          </p>
        </div>
        <Switch
          id="remove-bg"
          checked={removeBackground}
          onCheckedChange={setRemoveBackground}
          disabled={isLoading}
        />
      </div>

      {/* ================================================================= */}
      {/* SECTION 2: "OR" Divider */}
      {/* ================================================================= */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            {t('or')}
          </span>
        </div>
      </div>

      {/* ================================================================= */}
      {/* SECTION 3: URL Input + Search Button */}
      {/* ================================================================= */}
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {t('enterImageUrl')}
        </p>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder={t('urlPlaceholder')}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleUrlSubmit();
              }
            }}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setIsSearchModalOpen(true)}
            disabled={isLoading || !searchQuery}
            title={searchQuery ? t('searchTooltip', { query: searchQuery }) : t('searchTooltipEmpty')}
            aria-label={t('searchTooltip', { query: searchQuery || '' })}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {urlInput && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleUrlSubmit}
            disabled={isLoading || !urlInput.trim().startsWith('http')}
            className="w-full"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('removingBackground')}
              </>
            ) : isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('uploading')}
              </>
            ) : (
              t('useThisUrl')
            )}
          </Button>
        )}
      </div>

      {/* Error Retry Button */}
      {isError && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleBrowseClick}
          className="w-full"
        >
          {t('tryAgain')}
        </Button>
      )}

      {/* Search Modal */}
      <ProductSearchModal
        open={isSearchModalOpen}
        onOpenChange={setIsSearchModalOpen}
        onImageSelected={handleSearchImageSelected}
        initialQuery={searchQuery}
        userId={userId}
        itemId={itemId}
      />
    </div>
  );
}
