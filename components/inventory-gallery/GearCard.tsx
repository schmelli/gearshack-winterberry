/**
 * GearCard Component
 *
 * Feature: 002-inventory-gallery
 * Displays a single gear item in the gallery with view density support
 */

'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Pencil } from 'lucide-react';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CategoryPlaceholder } from './CategoryPlaceholder';
import { StatusBadge } from './StatusBadge';
import { formatWeightForDisplay } from '@/lib/gear-utils';
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

  const showImage = item.primaryImageUrl && !imageError;
  const isCompact = viewDensity === 'compact';
  const isDetailed = viewDensity === 'detailed';

  const categoryLabel = getCategoryLabel(item.categoryId);
  const weightDisplay = formatWeightForDisplay(item.weightGrams);

  return (
    <Card
      className="group overflow-hidden border-border transition-shadow hover:shadow-md cursor-pointer"
      onClick={onClick}
    >
      {/* Image Section */}
      <div className="relative aspect-square bg-muted">
        {showImage ? (
          <Image
            src={item.primaryImageUrl!}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <CategoryPlaceholder
              categoryId={item.categoryId}
              size="lg"
              className="h-full w-full rounded-none"
            />
          </div>
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
      <CardContent className="p-3">
        {/* Brand - Always shown */}
        {item.brand && (
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {item.brand}
          </p>
        )}

        {/* Name - Always shown */}
        <h3 className="font-semibold leading-tight">{item.name}</h3>

        {/* Standard View: Category, Weight, Status */}
        {!isCompact && (
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
        )}

        {/* Detailed View: Notes snippet */}
        {isDetailed && item.notes && (
          <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
            {item.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
