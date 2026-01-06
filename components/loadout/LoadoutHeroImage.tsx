/**
 * Loadout Hero Image Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - displays hero image with title overlay
 *
 * Displays the AI-generated hero image with:
 * - Elegant title overlay with gradient for readability
 * - Subtle regenerate button in lower right corner
 * - Loading spinner during generation
 * - Graceful error state handling
 */

'use client';

import Image from 'next/image';
import { RefreshCw, ImageOff, Loader2 } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface LoadoutHeroImageProps {
  /** Cloudinary image URL (null if no image) */
  imageUrl: string | null;

  /** Alt text for accessibility */
  altText?: string;

  /** Loadout title to display on the image */
  loadoutTitle: string;

  /** Item count to display */
  itemCount?: number;

  /** Total weight to display */
  totalWeight?: string;

  /** Whether image is currently being generated */
  isGenerating?: boolean;

  /** Error message if generation failed */
  errorMessage?: string;

  /** Callback to regenerate image */
  onRegenerate?: () => void;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Hero image component for loadouts with elegant title overlay
 * and subtle regenerate button
 */
export function LoadoutHeroImage({
  imageUrl,
  altText = 'Loadout hero image',
  loadoutTitle,
  itemCount,
  totalWeight,
  isGenerating = false,
  errorMessage,
  onRegenerate,
  className,
}: LoadoutHeroImageProps) {
  const hasImage = !!imageUrl && !errorMessage;
  const showError = !!errorMessage && !isGenerating;

  return (
    <div className={cn('relative w-full', className)}>
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-xl bg-muted">
        {/* Loading State */}
        {isGenerating && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-forest-50 to-moss-100 dark:from-forest-900 dark:to-moss-900">
            <Loader2 className="h-8 w-8 animate-spin text-forest-600 dark:text-forest-400" />
            <p className="mt-3 text-sm font-medium text-forest-700 dark:text-forest-300">
              Generating image...
            </p>
          </div>
        )}

        {/* Error State */}
        {showError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30">
            <ImageOff className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            <p className="mt-3 text-sm font-medium text-amber-700 dark:text-amber-300">
              Image unavailable
            </p>
            {onRegenerate && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRegenerate}
                className="mt-3"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Try again
              </Button>
            )}
          </div>
        )}

        {/* Image or Placeholder */}
        {hasImage && !isGenerating ? (
          <>
            {/* Background Image */}
            <Image
              src={imageUrl}
              alt={altText}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 896px, 896px"
              priority
            />

            {/* Gradient Overlay for Text Readability */}
            <div
              className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
              aria-hidden="true"
            />

            {/* Title Overlay - Bottom Left */}
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6">
              <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
                {loadoutTitle}
              </h1>
              {(itemCount !== undefined || totalWeight) && (
                <p className="mt-1 text-sm text-white/90 drop-shadow-md sm:text-base">
                  {itemCount !== undefined && `${itemCount} items`}
                  {itemCount !== undefined && totalWeight && ' • '}
                  {totalWeight}
                </p>
              )}
            </div>
          </>
        ) : (
          !isGenerating &&
          !showError && (
            // Empty Placeholder
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
              <ImageOff className="h-12 w-12 text-stone-400 dark:text-stone-600" />
              <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                No image
              </p>
            </div>
          )
        )}

        {/* Regenerate Button - Lower Right Corner */}
        {onRegenerate && !isGenerating && !showError && (
          <Button
            variant="secondary"
            size="icon"
            onClick={onRegenerate}
            className={cn(
              'absolute bottom-3 right-3 z-20',
              'h-9 w-9 rounded-full',
              'bg-white/80 hover:bg-white dark:bg-black/60 dark:hover:bg-black/80',
              'shadow-lg backdrop-blur-sm',
              'opacity-60 transition-opacity hover:opacity-100',
              'focus:opacity-100 focus:ring-2 focus:ring-forest-500'
            )}
            aria-label="Regenerate image"
            title="Generate new image"
          >
            <RefreshCw className="h-4 w-4 text-stone-700 dark:text-stone-300" />
          </Button>
        )}
      </AspectRatio>
    </div>
  );
}
