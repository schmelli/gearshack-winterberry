/**
 * ItemFeedbackHeader Component
 *
 * Extracted from ItemFeedbackModal.tsx
 * Displays gear item information at the top of the feedback modal:
 * image, name, brand, category, and weight.
 */

'use client';

import { Package, Scale } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';

// =============================================================================
// Types
// =============================================================================

export interface GearItemInfo {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
}

interface ItemFeedbackHeaderProps {
  /** The gear item to display */
  gearItem: GearItemInfo;
}

// =============================================================================
// Helper
// =============================================================================

function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) {
    return '--';
  }

  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

// =============================================================================
// Component
// =============================================================================

export function ItemFeedbackHeader({ gearItem }: ItemFeedbackHeaderProps) {
  return (
    <div className="flex items-start gap-4 pb-4 border-b border-border">
      {/* Item Image */}
      <Avatar className="size-16 rounded-lg shrink-0">
        {gearItem.imageUrl ? (
          <AvatarImage
            src={gearItem.imageUrl}
            alt={gearItem.name}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
          <Package className="size-6" />
        </AvatarFallback>
      </Avatar>

      {/* Item Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="font-semibold text-foreground truncate">
          {gearItem.name}
        </h3>
        {gearItem.brand && (
          <p className="text-sm text-muted-foreground truncate">
            {gearItem.brand}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {gearItem.category && (
            <span className="truncate">
              {gearItem.category}
            </span>
          )}
          {gearItem.weight !== null && gearItem.weight !== undefined && (
            <span className="flex items-center gap-1 shrink-0">
              <Scale className="size-3" />
              {formatWeight(gearItem.weight)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
