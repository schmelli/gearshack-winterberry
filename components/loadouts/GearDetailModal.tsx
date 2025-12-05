/**
 * GearDetailModal Component
 *
 * Feature: 006-ui-makeover
 * FR-017: Display detailed gear info in modal on card body click
 *
 * Feature: 009-grand-visual-polish
 * FR-022: Separate Edit icon from Close icon (no overlap)
 * FR-023: Edit icon positioned to the left of the title
 */

'use client';

import { Package, Pencil } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { GearItem } from '@/types/gear';
import { formatWeight, CATEGORY_LABELS } from '@/lib/loadout-utils';
import { GEAR_CONDITION_LABELS } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface GearDetailModalProps {
  item: GearItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailModal({
  item,
  open,
  onOpenChange,
}: GearDetailModalProps) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <ScrollArea className="max-h-[85vh]">
          <div className="space-y-4 p-6">
            {/* Header - FR-022, FR-023: Edit icon left of title, separated from close button */}
            <DialogHeader>
              <div className="flex items-center gap-2">
                <Button
                  asChild
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0"
                >
                  <Link href={`/inventory/${item.id}/edit`}>
                    <Pencil className="h-4 w-4" />
                    <span className="sr-only">Edit {item.name}</span>
                  </Link>
                </Button>
                <DialogTitle className="text-xl">{item.name}</DialogTitle>
              </div>
            </DialogHeader>

            {/* Image */}
            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-muted">
              {item.primaryImageUrl ? (
                <Image
                  src={item.primaryImageUrl}
                  alt={item.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 512px) 100vw, 512px"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Info Grid */}
            <div className="space-y-4">
              {/* Brand & Category */}
              <div className="flex flex-wrap items-center gap-2">
                {item.brand && (
                  <Badge variant="secondary">{item.brand}</Badge>
                )}
                {item.categoryId && (
                  <Badge variant="outline">
                    {CATEGORY_LABELS[item.categoryId] ?? item.categoryId}
                  </Badge>
                )}
                <Badge variant="outline">
                  {GEAR_CONDITION_LABELS[item.condition]}
                </Badge>
              </div>

              {/* Specifications */}
              <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                <div>
                  <p className="text-xs uppercase text-muted-foreground">Weight</p>
                  <p className="font-medium">
                    {item.weightGrams ? formatWeight(item.weightGrams) : 'N/A'}
                  </p>
                </div>
                {item.modelNumber && (
                  <div>
                    <p className="text-xs uppercase text-muted-foreground">Model</p>
                    <p className="font-medium">{item.modelNumber}</p>
                  </div>
                )}
                {(item.lengthCm || item.widthCm || item.heightCm) && (
                  <div className="col-span-2">
                    <p className="text-xs uppercase text-muted-foreground">
                      Dimensions (L × W × H)
                    </p>
                    <p className="font-medium">
                      {item.lengthCm ?? '–'} × {item.widthCm ?? '–'} ×{' '}
                      {item.heightCm ?? '–'} cm
                    </p>
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <div>
                  <p className="mb-1 text-xs uppercase text-muted-foreground">
                    Notes
                  </p>
                  <p className="text-sm text-muted-foreground">{item.notes}</p>
                </div>
              )}

              {/* Purchase Info */}
              {(item.pricePaid || item.retailer) && (
                <div className="border-t pt-4">
                  <p className="mb-2 text-xs uppercase text-muted-foreground">
                    Purchase Info
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    {item.pricePaid && (
                      <span>
                        {item.currency ?? '$'}
                        {item.pricePaid.toFixed(2)}
                      </span>
                    )}
                    {item.retailer && (
                      <span className="text-muted-foreground">
                        from {item.retailer}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
