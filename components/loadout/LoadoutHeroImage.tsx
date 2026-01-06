/**
 * Loadout Hero Image Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - displays hero image with integrated navigation
 *
 * Premium layout with:
 * - Full-width hero image (no rounded corners for edge-to-edge feel)
 * - Top navigation bar with back link and action icons
 * - Bottom overlay with title, stats, and activity/season badges
 * - Subtle regenerate button
 * - Loading and error states
 */

'use client';

import { type ReactNode } from 'react';
import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { RefreshCw, ImageOff, Loader2, ArrowLeft } from 'lucide-react';
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

  /** Back link URL */
  backHref?: string;

  /** Back link label */
  backLabel?: string;

  /** Action buttons to display in top-right (edit, share, export, etc.) */
  actionButtons?: ReactNode;

  /** Badges to display (activity types, seasons) */
  badges?: ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * Premium hero image component for loadouts with integrated navigation,
 * action buttons, and badges overlay
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
  backHref = '/loadouts',
  backLabel = 'Back',
  actionButtons,
  badges,
  className,
}: LoadoutHeroImageProps) {
  const hasImage = !!imageUrl && !errorMessage;
  const showError = !!errorMessage && !isGenerating;

  return (
    <div className={cn('relative w-full', className)}>
      <AspectRatio ratio={16 / 9} className="overflow-hidden bg-muted">
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
              sizes="100vw"
              priority
            />

            {/* Gradient Overlays for Text Readability */}
            {/* Top gradient for navigation */}
            <div
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent"
              aria-hidden="true"
            />
            {/* Bottom gradient for title/badges */}
            <div
              className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
              aria-hidden="true"
            />
          </>
        ) : (
          !isGenerating &&
          !showError && (
            // Empty Placeholder with gradients
            <>
              <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-stone-100 to-stone-200 dark:from-stone-800 dark:to-stone-900">
                <ImageOff className="h-12 w-12 text-stone-400 dark:text-stone-600" />
                <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
                  No image
                </p>
              </div>
              {/* Still show overlays for text readability on placeholder */}
              <div
                className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent"
                aria-hidden="true"
              />
              <div
                className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent"
                aria-hidden="true"
              />
            </>
          )
        )}

        {/* Top Navigation Bar - Back Link + Action Buttons */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
          {/* Back Link */}
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{backLabel}</span>
          </Link>

          {/* Action Buttons */}
          {actionButtons && (
            <div className="flex items-center gap-1">
              {actionButtons}
            </div>
          )}
        </div>

        {/* Bottom Content - Title, Stats, Badges */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6">
          {/* Title */}
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
            {loadoutTitle}
          </h1>

          {/* Stats Row */}
          {(itemCount !== undefined || totalWeight) && (
            <p className="mt-1 text-sm text-white/90 drop-shadow-md sm:text-base">
              {itemCount !== undefined && `${itemCount} items`}
              {itemCount !== undefined && totalWeight && ' • '}
              {totalWeight}
            </p>
          )}

          {/* Badges Row */}
          {badges && (
            <div className="mt-3 flex flex-wrap gap-2">
              {badges}
            </div>
          )}
        </div>

        {/* Regenerate Button - Lower Right Corner (above badges) */}
        {onRegenerate && !isGenerating && !showError && (
          <Button
            variant="secondary"
            size="icon"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRegenerate();
            }}
            className={cn(
              'absolute right-4 z-30 sm:right-6',
              badges ? 'bottom-20 sm:bottom-24' : 'bottom-4 sm:bottom-6',
              'h-9 w-9 rounded-full',
              'bg-white/80 hover:bg-white dark:bg-black/60 dark:hover:bg-black/80',
              'shadow-lg backdrop-blur-sm',
              'opacity-70 transition-opacity hover:opacity-100',
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
