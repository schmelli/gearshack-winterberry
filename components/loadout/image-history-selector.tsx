/**
 * Image History Selector Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - displays up to 3 historical images
 */

'use client';

import Image from 'next/image';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GeneratedLoadoutImage } from '@/types/loadout-image';

export interface ImageHistorySelectorProps {
  /** Up to 3 historical images, ordered by generation_timestamp DESC */
  images: GeneratedLoadoutImage[];

  /** UUID of currently active image */
  activeImageId: string | null;

  /** Callback when image is selected */
  onSelectImage: (imageId: string) => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Component to browse and select from image generation history
 * Shows up to 3 most recent variations
 */
export function ImageHistorySelector({
  images,
  activeImageId,
  onSelectImage,
  className,
}: ImageHistorySelectorProps) {
  if (images.length === 0) {
    return null; // Don't show if no history
  }

  return (
    <div className={cn('space-y-2', className)}>
      <h3 className="text-sm font-medium text-muted-foreground">
        Image History ({images.length}/3)
      </h3>

      <div className="grid grid-cols-3 gap-2">
        {images.map((image, index) => {
          const isActive = image.id === activeImageId;

          return (
            <button
              key={image.id}
              onClick={() => onSelectImage(image.id)}
              className={cn(
                'group relative aspect-video overflow-hidden rounded-md border-2 transition-all',
                isActive
                  ? 'border-primary ring-2 ring-primary ring-offset-2'
                  : 'border-transparent hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary'
              )}
              aria-label={`Select image ${index + 1}`}
              aria-pressed={isActive}
            >
              {/* Image thumbnail */}
              <Image
                src={image.cloudinaryUrl}
                alt={image.altText || 'Generated image variation'}
                fill
                className="object-cover transition-transform group-hover:scale-105"
                sizes="(max-width: 768px) 33vw, 200px"
              />

              {/* Active indicator */}
              {isActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                  <div className="rounded-full bg-primary p-1">
                    <Check className="h-4 w-4 text-primary-foreground" aria-hidden="true" />
                  </div>
                </div>
              )}

              {/* Hover overlay */}
              {!isActive && (
                <div className="absolute inset-0 bg-black/0 transition-colors group-hover:bg-black/20" />
              )}

              {/* Generation timestamp tooltip */}
              <div className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                #{index + 1}
              </div>
            </button>
          );
        })}

        {/* Empty slots (show when less than 3) */}
        {images.length < 3 && (
          <>
            {Array.from({ length: 3 - images.length }).map((_, index) => (
              <div
                key={`empty-${index}`}
                className="aspect-video rounded-md border-2 border-dashed border-muted-foreground/20"
                aria-hidden="true"
              />
            ))}
          </>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-muted-foreground">
        {images.length === 3
          ? 'Maximum history reached. Generating new images will replace the oldest.'
          : 'Click an image to set it as active.'}
      </p>
    </div>
  );
}
