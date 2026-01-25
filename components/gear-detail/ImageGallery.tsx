/**
 * Image Gallery Component
 *
 * Feature: 045-gear-detail-modal
 * Task: T016
 *
 * Displays the primary image and allows browsing through gallery images.
 * Shows a placeholder when no images are available.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface ImageGalleryProps {
  /** Primary image URL */
  primaryImageUrl: string | null;
  /** Array of gallery image URLs */
  galleryImageUrls: string[];
  /** Alt text for images */
  altText: string;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function ImageGallery({
  primaryImageUrl,
  galleryImageUrls,
  altText,
  className,
}: ImageGalleryProps) {
  const t = useTranslations('ImageGallery');

  // Combine primary and gallery images
  const allImages = [
    ...(primaryImageUrl ? [primaryImageUrl] : []),
    ...galleryImageUrls.filter((url) => url !== primaryImageUrl),
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const hasMultipleImages = allImages.length > 1;
  const currentImage = allImages[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? allImages.length - 1 : prev - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev === allImages.length - 1 ? 0 : prev + 1));
  };

  // No images - show placeholder
  if (allImages.length === 0) {
    return (
      <div
        className={cn(
          'relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-muted',
          className
        )}
      >
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main Image - constrained height, centered */}
      <div className="relative flex h-48 w-full items-center justify-center overflow-hidden rounded-lg bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentImage}
          alt={`${altText} - Image ${currentIndex + 1}`}
          className="max-h-full max-w-full object-contain"
        />

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goToPrevious}
              aria-label={t('aria.previousImage')}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 z-10 h-8 w-8 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goToNext}
              aria-label={t('aria.nextImage')}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 z-10 -translate-x-1/2 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
            {currentIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip (if more than 1 image) */}
      {hasMultipleImages && allImages.length <= 6 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {allImages.map((url, index) => (
            <button
              key={url}
              onClick={() => setCurrentIndex(index)}
              className={cn(
                'relative h-12 w-12 shrink-0 overflow-hidden rounded-md border-2 transition-all',
                index === currentIndex
                  ? 'border-primary'
                  : 'border-transparent opacity-60 hover:opacity-100'
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt={`${altText} thumbnail ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
