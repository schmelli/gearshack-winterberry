/**
 * Fallback Image Placeholder Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - displays loading states and fallback images
 */

'use client';

import Image from 'next/image';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export type PlaceholderState = 'loading' | 'error' | 'fallback' | 'empty';

export interface FallbackImagePlaceholderProps {
  /** Current state of the image */
  state: PlaceholderState;

  /** Fallback image URL (when state is 'fallback') */
  fallbackUrl?: string;

  /** Alt text for fallback image */
  altText?: string;

  /** Error message to display */
  errorMessage?: string;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Placeholder component for various loading and error states
 * Used when AI generation is in progress, failed, or using fallback
 */
export function FallbackImagePlaceholder({
  state,
  fallbackUrl,
  altText = 'Fallback loadout image',
  errorMessage = 'Failed to generate image',
  className,
}: FallbackImagePlaceholderProps) {
  return (
    <div className={cn('w-full', className)}>
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg">
        {state === 'loading' && (
          // Loading skeleton with animated pulse
          <div className="relative h-full w-full">
            <Skeleton className="h-full w-full" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-sm text-muted-foreground">Generating image...</p>
            </div>
          </div>
        )}

        {state === 'error' && (
          // Error state
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-destructive/10">
            <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">
                Generation Failed
              </p>
              <p className="text-xs text-muted-foreground">{errorMessage}</p>
            </div>
          </div>
        )}

        {state === 'fallback' && fallbackUrl && (
          // Fallback image with subtle indicator
          <div className="relative h-full w-full">
            <Image
              src={fallbackUrl}
              alt={altText}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
            {/* Subtle badge indicating this is a fallback */}
            <div className="absolute right-2 top-2 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
              Default Image
            </div>
          </div>
        )}

        {state === 'empty' && (
          // Empty state (no image and not loading)
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-muted">
            <ImageOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">No image</p>
          </div>
        )}
      </AspectRatio>
    </div>
  );
}
