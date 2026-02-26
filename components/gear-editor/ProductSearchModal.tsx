/**
 * ProductSearchModal Component
 *
 * Feature: 039-product-search-cloudinary
 *
 * Modal dialog for searching product images via Google Images (Serper API).
 * Displays results in a 3x2 grid. When user selects an image, it's uploaded
 * to Cloudinary and the modal closes.
 *
 * Constitution: UI components MUST be stateless (logic in hooks)
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, Search, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useProductSearch } from '@/hooks/useProductSearch';
import { useCloudinaryUpload } from '@/hooks/useCloudinaryUpload';
import { ProductSearchGrid } from '@/components/gear-editor/ProductSearchGrid';
import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

export interface ProductSearchModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback to close the modal */
  onOpenChange: (open: boolean) => void;
  /** Callback when image is successfully uploaded to Cloudinary */
  onImageSelected: (cloudinaryUrl: string) => void;
  /** Initial search query (brand + product name) */
  initialQuery: string;
  /** User ID for Cloudinary folder organization */
  userId: string;
  /** Item ID for Cloudinary folder organization */
  itemId: string;
}

// =============================================================================
// Component
// =============================================================================

export function ProductSearchModal({
  open,
  onOpenChange,
  onImageSelected,
  initialQuery,
  userId,
  itemId,
}: ProductSearchModalProps) {
  const t = useTranslations('GearEditor');

  // Product search hook
  const { query, setQuery, results, status: searchStatus, error: searchError, search, searchWithQuery, clear } = useProductSearch();

  // Cloudinary upload hook
  const { uploadUrl, status: uploadStatus, reset: resetUpload } = useCloudinaryUpload();

  // Track which image URL is being uploaded (state for re-render on change)
  const [uploadingUrl, setUploadingUrl] = useState<string | null>(null);

  // Track if we've auto-searched for this modal open
  const hasAutoSearchedRef = useRef(false);

  // Timer ref for cleanup timeout
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-search when modal opens with initial query
  useEffect(() => {
    if (open && initialQuery && !hasAutoSearchedRef.current) {
      hasAutoSearchedRef.current = true;
      // Use searchWithQuery to immediately search with the provided query
      searchWithQuery(initialQuery);
    }
  }, [open, initialQuery, searchWithQuery]);

  // Reset state when modal closes - memoize to stabilize cleanup
  const handleClose = useCallback(() => {
    hasAutoSearchedRef.current = false;
    clear();
    resetUpload();
    setUploadingUrl(null);
  }, [clear, resetUpload]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      // Use timeout to avoid setState during render
      closeTimerRef.current = setTimeout(handleClose, 0);
      return () => {
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
      };
    }
  }, [open, handleClose]);

  // Handle image selection - upload to Cloudinary
  const handleImageSelect = async (imageUrl: string) => {
    setUploadingUrl(imageUrl);
    const cloudinaryUrl = await uploadUrl(imageUrl, { userId, itemId });

    if (cloudinaryUrl) {
      onImageSelected(cloudinaryUrl);
      onOpenChange(false); // Close modal on success
    }
    setUploadingUrl(null);
  };

  const isSearching = searchStatus === 'searching';
  const isProcessing = uploadStatus === 'processing';
  const isUploading = uploadStatus === 'uploading';
  const isLoading = isSearching || isProcessing || isUploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('productSearchModal.title')}</DialogTitle>
          <DialogDescription>
            {t('productSearchModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder={t('productSearchModal.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  search();
                }
              }}
              disabled={isLoading}
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              onClick={search}
              disabled={isLoading || !query.trim()}
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Search Error */}
          {searchStatus === 'error' && searchError && (
            <p className="text-sm text-destructive flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {searchError}
            </p>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Results Grid */}
          {!isSearching && results.length > 0 && (
            <ProductSearchGrid
              results={results}
              onSelect={handleImageSelect}
              isUploading={isProcessing || isUploading}
              selectedUrl={uploadingUrl}
            />
          )}

          {/* No Results */}
          {!isSearching && searchStatus === 'idle' && results.length === 0 && query && (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('productSearchModal.noResults')}
            </p>
          )}

          {/* Processing / Upload Progress */}
          {isProcessing && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('productSearchModal.removingBackground')}
            </div>
          )}
          {isUploading && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('productSearchModal.uploading')}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
