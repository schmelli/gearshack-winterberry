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
import Image from 'next/image';
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
          'relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-lg bg-muted',
          className
        )}
      >
        <Package className="h-16 w-16 text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className={cn('relative', className)}>
      {/* Main Image */}
      <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white">
        <Image
          src={currentImage}
          alt={`${altText} - Image ${currentIndex + 1}`}
          fill
          unoptimized
          className="object-contain"
          sizes="(max-width: 512px) 100vw, 512px"
        />

        {/* Navigation Arrows */}
        {hasMultipleImages && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goToPrevious}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="sr-only">Previous image</span>
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-2 top-1/2 h-8 w-8 -translate-y-1/2 rounded-full bg-background/80 backdrop-blur-sm"
              onClick={goToNext}
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Next image</span>
            </Button>
          </>
        )}

        {/* Image Counter */}
        {hasMultipleImages && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-2 py-1 text-xs backdrop-blur-sm">
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
              <Image
                src={url}
                alt={`${altText} thumbnail ${index + 1}`}
                fill
                unoptimized
                className="object-cover"
                sizes="48px"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ImageGallery;
