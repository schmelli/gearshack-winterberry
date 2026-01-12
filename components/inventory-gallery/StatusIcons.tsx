/**
 * StatusIcons Component
 *
 * Feature: 041-gear-status-icons
 * Extracted from: GearCard.tsx
 *
 * Displays status icons for gear items (favourite, for sale, borrowable, etc.)
 */

import {
  Heart,
  DollarSign,
  HandHeart,
  ArrowLeftRight,
  Recycle,
  Tag,
} from 'lucide-react';

import type { GearItem } from '@/types/gear';
import { cn } from '@/lib/utils';

interface StatusTranslations {
  favourite: string;
  forSale: string;
  borrowable: string;
  tradeable: string;
  lent: string;
  sold: string;
}

interface StatusIconsProps {
  item: GearItem;
  translations: StatusTranslations;
  className?: string;
}

export function StatusIcons({ item, translations, className }: StatusIconsProps): React.ReactElement | null {
  const icons: React.ReactNode[] = [];

  if (item.isFavourite) {
    icons.push(
      <div
        key="favourite"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/90 shadow-sm"
        title={translations.favourite}
      >
        <Heart className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    );
  }

  if (item.isForSale) {
    icons.push(
      <div
        key="for-sale"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600/90 shadow-sm"
        title={translations.forSale}
      >
        <DollarSign className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (item.canBeBorrowed) {
    icons.push(
      <div
        key="borrowable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/90 shadow-sm"
        title={translations.borrowable}
      >
        <HandHeart className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (item.canBeTraded) {
    icons.push(
      <div
        key="tradeable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500/90 shadow-sm"
        title={translations.tradeable}
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (item.status === 'lent') {
    icons.push(
      <div
        key="lent"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/90 shadow-sm"
        title={translations.lent}
      >
        <Recycle className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (item.status === 'sold') {
    icons.push(
      <div
        key="sold"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/90 shadow-sm"
        title={translations.sold}
      >
        <Tag className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (icons.length === 0) return null;

  return <div className={cn('flex gap-1 flex-wrap', className)}>{icons}</div>;
}

export default StatusIcons;
