/**
 * Generated Image Preview Component
 * Feature: 048-ai-loadout-image-gen
 * Constitution: Stateless component - displays image with loading skeleton
 */

'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface GeneratedImagePreviewProps {
  /** Cloudinary image URL (null if no image) */
  imageUrl: string | null;

  /** Alt text for accessibility */
  altText?: string;

  /** Whether image is currently loading/generating */
  isLoading?: boolean;

  /** Loadout title to display as overlay */
  loadoutTitle?: string;

  /** Item count to display as overlay */
  itemCount?: number;

  /** Total weight to display as overlay */
  totalWeight?: string;

  /** Text color class for overlay (white or black) */
  textColorClass?: 'text-white' | 'text-black';

  /** Additional CSS classes for container */
  className?: string;

  /** Click handler for image */
  onClick?: () => void;

  /** Whether this image should be loaded with priority (only for active/visible images) */
  isPriority?: boolean;
}

/**
 * Preview component for generated loadout images
 * Displays image with adaptive gradient overlay and text
 */
export function GeneratedImagePreview({
  imageUrl,
  altText,
  isLoading = false,
  loadoutTitle,
  itemCount,
  totalWeight,
  textColorClass = 'text-white',
  className,
  onClick,
  isPriority = false,
}: GeneratedImagePreviewProps) {
  const t = useTranslations('Loadouts.generatedImage');
  const resolvedAltText = altText ?? t('altText');

  return (
    <div className={cn('w-full', className)}>
      <AspectRatio ratio={16 / 9} className="overflow-hidden rounded-lg">
        {isLoading ? (
          // Loading skeleton
          <Skeleton className="h-full w-full" />
        ) : imageUrl ? (
          // Generated image with overlay
          <div
            className="group relative h-full w-full cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={onClick}
            role={onClick ? 'button' : undefined}
            tabIndex={onClick ? 0 : undefined}
            aria-label={onClick ? `View loadout image: ${altText}` : undefined}
            onKeyDown={(e) => {
              if (onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault();
                onClick();
              }
            }}
          >
            {/* Background image */}
            <Image
              src={imageUrl}
              alt={altText}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              priority={isPriority}
            />

            {/* Adaptive gradient overlay for text contrast */}
            <div
              className="absolute inset-0 bg-gradient-to-b from-transparent via-black/30 to-black/60"
              aria-hidden="true"
            />

            {/* Text overlay (if loadout info provided) */}
            {(loadoutTitle || itemCount !== undefined) && (
              <div className="absolute bottom-4 left-4 right-4 z-10">
                {loadoutTitle && (
                  <h3
                    className={cn(
                      'text-2xl font-bold drop-shadow-lg',
                      textColorClass
                    )}
                  >
                    {loadoutTitle}
                  </h3>
                )}
                {(itemCount !== undefined || totalWeight) && (
                  <p
                    className={cn(
                      'text-sm drop-shadow-md',
                      textColorClass
                    )}
                  >
                    {itemCount !== undefined && `${itemCount} items`}
                    {itemCount !== undefined && totalWeight && ' • '}
                    {totalWeight}
                  </p>
                )}
              </div>
            )}
          </div>
        ) : (
          // No image placeholder
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <p className="text-sm text-muted-foreground">No image generated</p>
          </div>
        )}
      </AspectRatio>
    </div>
  );
}
