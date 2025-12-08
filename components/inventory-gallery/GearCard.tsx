/**
 * GearCard Component
 *
 * Feature: 002-inventory-gallery
 * Displays a single gear item in the gallery with view density support
 *
 * Feature: 018-gearcard-hierarchy-polish
 * US1: Compact view - horizontal layout with image left, text right
 * US2: Standard view - large square image with full metadata
 * US3: Detailed view - extra-large 4:3 image with description
 * US4: Visual polish - shadows and borders for premium feel
 *
 * Fix: Added relative positioning, improved compact layout
 */

'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { Pencil, ExternalLink } from 'lucide-react';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { CategoryPlaceholder } from './CategoryPlaceholder';
import { StatusBadge } from './StatusBadge';
import { formatWeightForDisplay, getOptimizedImageUrl } from '@/lib/gear-utils';
import { getCategoryLabel } from '@/lib/taxonomy/taxonomy-utils';

// =============================================================================
// Types
// =============================================================================

interface GearCardProps {
  /** The gear item to display */
  item: GearItem;
  /** Current view density mode */
  viewDensity: ViewDensity;
  /** Optional click handler for card body */
  onClick?: () => void;
}

// =============================================================================
// Component
// =============================================================================

export function GearCard({ item, viewDensity, onClick }: GearCardProps) {
  const [imageError, setImageError] = useState(false);

  // Feature 019: Use optimized image (nobgImages > primaryImageUrl)
  const optimizedImageUrl = getOptimizedImageUrl(item);
  const showImage = optimizedImageUrl && !imageError;
  const isCompact = viewDensity === 'compact';
  const isDetailed = viewDensity === 'detailed';

  const categoryLabel = getCategoryLabel(item.categoryId);
  const weightDisplay = formatWeightForDisplay(item.weightGrams);

  // =========================================================================
  // US1: Compact view - horizontal layout
  // =========================================================================
  if (isCompact) {
    return (
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer',
          'flex flex-row items-center h-24',
          'border-stone-200 dark:border-stone-700 shadow-sm',
          'transition-shadow hover:shadow-md'
        )}
        onClick={onClick}
      >
        {/* Image Section - Left side, fixed width, gradient in dark mode */}
        <div className="h-24 w-24 flex-shrink-0 bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 relative flex items-center justify-center">
          {showImage ? (
            <Image
              src={optimizedImageUrl}
              alt={item.name}
              fill
              className="object-contain p-2"
              sizes="96px"
              onError={() => setImageError(true)}
            />
          ) : (
            <CategoryPlaceholder
              categoryId={item.categoryId}
              size="md"
              className="h-12 w-12"
            />
          )}
        </div>

        {/* Content Section - Right side, flex-grow */}
        <div className="flex flex-1 flex-col justify-center px-4 py-2 min-w-0">
          {/* Brand - Small text */}
          {item.brand && (
            <p className="text-xs text-muted-foreground truncate">
              {item.brand}
            </p>
          )}

          {/* Name - Bold, single line */}
          <h3 className="text-sm font-medium leading-tight line-clamp-1">
            {item.name}
          </h3>

          {/* Weight - Small text */}
          {item.weightGrams && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {weightDisplay}
            </p>
          )}
        </div>

        {/* Edit Button Overlay */}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            asChild
            size="icon"
            variant="secondary"
            className="h-6 w-6 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-3 w-3" />
              <span className="sr-only">Edit {item.name}</span>
            </Link>
          </Button>
        </div>
      </Card>
    );
  }

  // =========================================================================
  // US2/US3: Standard and Detailed views - vertical layout
  // =========================================================================
  return (
    <Card
      className={cn(
        'group relative overflow-hidden cursor-pointer',
        'flex flex-col',
        'border-stone-200 dark:border-stone-700 shadow-sm',
        'transition-shadow hover:shadow-md',
        isDetailed ? 'min-h-[400px]' : 'min-h-[280px]'
      )}
      onClick={onClick}
    >
      {/* Image Section - Feature 019/021: bg-white + gradient in dark mode */}
      <div
        className={cn(
          'relative bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 flex items-center justify-center',
          isDetailed ? 'aspect-[4/3]' : 'aspect-square'
        )}
      >
        {showImage ? (
          <Image
            src={optimizedImageUrl}
            alt={item.name}
            fill
            className="object-contain"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <CategoryPlaceholder
            categoryId={item.categoryId}
            size="lg"
            className="h-full w-full rounded-none"
          />
        )}

        {/* Edit Button Overlay */}
        <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            asChild
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit {item.name}</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className="p-3 flex-1">
        {/* Brand - With hover card for manufacturer info */}
        {item.brand && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground cursor-pointer hover:text-foreground transition-colors inline-block">
                {item.brand}
              </p>
            </HoverCardTrigger>
            <HoverCardContent className="w-64" align="start">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">{item.brand}</h4>
                <p className="text-xs text-muted-foreground">
                  Manufacturer of outdoor and adventure gear.
                </p>
                {item.brandUrl && (
                  <a
                    href={item.brandUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Visit website
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </HoverCardContent>
          </HoverCard>
        )}

        {/* Name */}
        <h3
          className={cn(
            'font-semibold leading-tight',
            isDetailed ? '' : 'line-clamp-2'
          )}
        >
          {item.name}
        </h3>

        {/* Category, Weight, Status */}
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {/* Category Label */}
          {categoryLabel && (
            <span className="text-xs text-muted-foreground">
              {categoryLabel}
            </span>
          )}

          {/* Separator dot */}
          {categoryLabel && item.weightGrams && (
            <span className="text-muted-foreground">·</span>
          )}

          {/* Weight */}
          {item.weightGrams && (
            <span className="text-xs text-muted-foreground">
              {weightDisplay}
            </span>
          )}

          {/* Status Badge */}
          <StatusBadge status={item.status} className="ml-auto" />
        </div>

        {/* US3: Detailed view - Notes snippet */}
        {isDetailed && item.notes && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {item.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
