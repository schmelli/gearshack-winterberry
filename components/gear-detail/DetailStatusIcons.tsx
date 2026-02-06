/**
 * DetailStatusIcons Component
 *
 * Extracted from GearDetailHeader.tsx
 * Renders status indicator icons for a gear item (favourite, for sale,
 * borrowable, tradeable, lent, sold).
 */

'use client';

import {
  Heart,
  DollarSign,
  HandHeart,
  ArrowLeftRight,
  Recycle,
  Tag,
} from 'lucide-react';
import type { GearItem } from '@/types/gear';

// =============================================================================
// Types
// =============================================================================

interface DetailStatusIconsProps {
  /** The gear item whose statuses to display */
  item: GearItem;
  /** Translation function for aria labels */
  t: (key: string) => string;
}

// =============================================================================
// Component
// =============================================================================

export function DetailStatusIcons({ item, t }: DetailStatusIconsProps) {
  const icons: React.ReactNode[] = [];

  if (item.isFavourite) {
    icons.push(
      <div key="favourite" className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/90 shadow-sm" role="img" aria-label={t('aria.favourite')}>
        <Heart className="h-3.5 w-3.5 text-white fill-white" aria-hidden="true" />
      </div>
    );
  }
  if (item.isForSale) {
    icons.push(
      <div key="for-sale" className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600/90 shadow-sm" role="img" aria-label={t('aria.forSale')}>
        <DollarSign className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
    );
  }
  if (item.canBeBorrowed) {
    icons.push(
      <div key="borrowable" className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/90 shadow-sm" role="img" aria-label={t('aria.borrowable')}>
        <HandHeart className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
    );
  }
  if (item.canBeTraded) {
    icons.push(
      <div key="tradeable" className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500/90 shadow-sm" role="img" aria-label={t('aria.tradeable')}>
        <ArrowLeftRight className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
    );
  }
  if (item.status === 'lent') {
    icons.push(
      <div key="lent" className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/90 shadow-sm" role="img" aria-label={t('aria.lent')}>
        <Recycle className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
    );
  }
  if (item.status === 'sold') {
    icons.push(
      <div key="sold" className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/90 shadow-sm" role="img" aria-label={t('aria.sold')}>
        <Tag className="h-3.5 w-3.5 text-white" aria-hidden="true" />
      </div>
    );
  }

  if (icons.length === 0) return null;
  return <div className="flex gap-1 flex-wrap">{icons}</div>;
}
