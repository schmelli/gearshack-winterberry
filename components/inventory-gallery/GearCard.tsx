'use client';

import { Link } from '@/i18n/navigation';
import Image from 'next/image';
import { useState } from 'react';
import { Pencil, ExternalLink, StickyNote, FileText, Heart, Recycle, Tag, DollarSign, HandHeart, ArrowLeftRight } from 'lucide-react';
import type { GearItem } from '@/types/gear';
import type { ViewDensity } from '@/types/inventory';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area'; // Stelle sicher, dass du diese Komponente hast
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card';
import { cn } from '@/lib/utils';
import { CategoryPlaceholder } from './CategoryPlaceholder';
import { formatWeightForDisplay, getOptimizedImageUrl } from '@/lib/gear-utils';
import { SpecIcon } from '@/components/gear/SpecIcon';

// =============================================================================
// Status Icons Component - Feature 041
// =============================================================================

interface StatusIconsProps {
  item: GearItem;
  className?: string;
}

function StatusIcons({ item, className }: StatusIconsProps) {
  const icons: React.ReactNode[] = [];

  // Heart icon for favourites
  if (item.isFavourite) {
    icons.push(
      <div
        key="favourite"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/90 shadow-sm"
        title="Favourite"
      >
        <Heart className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    );
  }

  // Dollar sign for items for sale
  if (item.isForSale) {
    icons.push(
      <div
        key="for-sale"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600/90 shadow-sm"
        title="For Sale"
      >
        <DollarSign className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Hand heart icon for items that can be borrowed
  if (item.canBeBorrowed) {
    icons.push(
      <div
        key="borrowable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/90 shadow-sm"
        title="Can be Borrowed"
      >
        <HandHeart className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Arrow swap icon for items that can be traded
  if (item.canBeTraded) {
    icons.push(
      <div
        key="tradeable"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500/90 shadow-sm"
        title="Up for Trade"
      >
        <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Recycle icon for lent items
  if (item.status === 'lent') {
    icons.push(
      <div
        key="lent"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/90 shadow-sm"
        title="Currently Lent"
      >
        <Recycle className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  // Tag icon for sold items
  if (item.status === 'sold') {
    icons.push(
      <div
        key="sold"
        className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/90 shadow-sm"
        title="Sold"
      >
        <Tag className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (icons.length === 0) return null;

  return (
    <div className={cn("flex gap-1 flex-wrap", className)}>
      {icons}
    </div>
  );
}

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
  /** Function to get category label by ID */
  getCategoryLabel?: (categoryId: string | null) => string;
}

// =============================================================================
// Component
// =============================================================================

export function GearCard({ item, viewDensity, onClick, getCategoryLabel }: GearCardProps) {
  const [imageError, setImageError] = useState(false);

  // Feature 019: Use optimized image (nobgImages > primaryImageUrl)
  const optimizedImageUrl = getOptimizedImageUrl(item);
  const showImage = optimizedImageUrl && !imageError;
  const isCompact = viewDensity === 'compact';
  const isDetailed = viewDensity === 'detailed';
  const isStandard = viewDensity === 'standard';

  const categoryLabel = getCategoryLabel ? getCategoryLabel(item.categoryId) : null;
  const weightDisplay = formatWeightForDisplay(item.weightGrams);

  // =========================================================================
  // US1: Compact view - horizontal layout
  // =========================================================================
  if (isCompact) {
    return (
      <Card
        className={cn(
          'group relative overflow-hidden cursor-pointer',
          'flex flex-row items-center h-20', // Reduced height slightly
          'border-stone-200 dark:border-stone-700 shadow-sm',
          'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600'
        )}
        onClick={onClick}
      >
        {/* Image Section */}
        <div className="h-20 w-20 flex-shrink-0 bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 relative flex items-center justify-center border-r border-stone-100 dark:border-stone-800">
          {showImage ? (
            <Image
              src={optimizedImageUrl}
              alt={item.name}
              fill
              unoptimized // Fix 412 Errors
              className="object-contain p-1.5"
              sizes="80px"
              onError={() => setImageError(true)}
            />
          ) : (
            <CategoryPlaceholder
              categoryId={item.categoryId}
              size="sm"
              className="h-10 w-10"
            />
          )}
          {/* Status Icons (Overlay top-left) - Feature 041 */}
          <StatusIcons item={item} className="absolute top-1 left-1 scale-75 origin-top-left" />
        </div>

        {/* Content Section */}
        <div className="flex flex-1 flex-col justify-center px-4 py-1.5 min-w-0">
          <div className="flex justify-between items-baseline gap-2">
            <h3 className="text-sm font-medium leading-tight line-clamp-1 text-foreground">
              {item.name}
            </h3>
            {item.weightGrams && (
              <span className="text-xs text-muted-foreground flex-shrink-0 font-mono flex items-center gap-1">
                <SpecIcon type="weight" size={12} className="opacity-60" />
                {weightDisplay}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2 mt-0.5">
            {item.brand && (
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {item.brand}
              </p>
            )}
            {categoryLabel && (
              <>
                <span className="text-[10px] text-stone-300 dark:text-stone-700">•</span>
                <span className="text-xs text-muted-foreground truncate">
                  {categoryLabel}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Edit Button Overlay */}
        <div className="absolute right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
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
        'transition-all hover:shadow-md hover:border-stone-300 dark:hover:border-stone-600',
        // Standard ist jetzt kompakter, Detailed wächst mit
        isDetailed ? 'min-h-[450px]' : 'min-h-[260px]'
      )}
      onClick={onClick}
    >
      {/* Image Section */}
      <div
        className={cn(
          'relative bg-white dark:bg-gradient-to-b dark:from-stone-800 dark:to-stone-950 flex items-center justify-center border-b border-stone-100 dark:border-stone-800',
          // Standard: 3/2 (flacher/breiter) | Detailed: 1/1 (großes Quadrat)
          isDetailed ? 'aspect-square' : 'aspect-[3/2]'
        )}
      >
        {showImage ? (
          <Image
            src={optimizedImageUrl}
            alt={item.name}
            fill
            unoptimized // Fix 412 Errors
            className="object-contain p-4 transition-transform group-hover:scale-105 duration-500"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            onError={() => setImageError(true)}
          />
        ) : (
          <CategoryPlaceholder
            categoryId={item.categoryId}
            size={isDetailed ? 'lg' : 'md'}
            className="h-full w-full rounded-none opacity-50"
          />
        )}

        {/* Status Icons (Overlay top-left) - Feature 041 */}
        <StatusIcons item={item} className="absolute top-2 left-2" />

        {/* Edit Button (Overlay top-right) */}
        <div className="absolute right-2 top-2 opacity-0 translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-200">
          <Button
            asChild
            size="icon"
            variant="secondary"
            className="h-8 w-8 shadow-sm bg-background/90 hover:bg-background"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Content Section */}
      <CardContent className={cn("flex flex-col flex-1", isDetailed ? "p-5" : "p-3")}>
        
        {/* Header: Brand & Weight */}
        <div className="flex justify-between items-start mb-1">
          {item.brand ? (
             <HoverCard>
             <HoverCardTrigger asChild>
               <p className="text-xs font-semibold uppercase tracking-wider text-primary/80 cursor-pointer hover:text-primary transition-colors">
                 {item.brand}
               </p>
             </HoverCardTrigger>
             <HoverCardContent className="w-64" align="start">
               <div className="space-y-2">
                 <h4 className="text-sm font-semibold">{item.brand}</h4>
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
          ) : (
            <span /> // Spacer
          )}
          
          {item.weightGrams && (
            <span className={cn(
              "text-muted-foreground font-mono flex items-center gap-1",
              isDetailed ? "text-sm" : "text-xs"
            )}>
              <SpecIcon type="weight" size={isDetailed ? 14 : 12} className="opacity-60" />
              {weightDisplay}
            </span>
          )}
        </div>

        {/* Title */}
        <h3
          className={cn(
            'font-bold text-foreground mb-2',
            isDetailed ? 'text-xl leading-snug' : 'text-sm leading-tight line-clamp-2'
          )}
        >
          {item.name}
        </h3>

        {/* Category & Details Line */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {categoryLabel && (
             <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground">
               {categoryLabel}
             </span>
          )}
        </div>

        {/* DETAILED VIEW: Description & Notes */}
        {isDetailed && (
          <div className="mt-4 pt-4 border-t border-border space-y-4 flex-1">
            
            {/* Description Section */}
            {item.description && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <FileText className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">Description</span>
                </div>
                {/* Fallback div if ScrollArea is missing, but prefer ScrollArea */}
                <div className="h-24 overflow-y-auto pr-2 text-sm text-muted-foreground leading-relaxed custom-scrollbar">
                   {item.description}
                </div>
              </div>
            )}

            {/* Notes Section */}
            {item.notes && (
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-500">
                  <StickyNote className="h-3.5 w-3.5" />
                  <span className="text-xs font-semibold uppercase tracking-wide">My Notes</span>
                </div>
                <div className="max-h-20 overflow-y-auto pr-2 text-sm italic text-emerald-800 dark:text-emerald-300/80 bg-emerald-50/50 dark:bg-emerald-900/10 p-2 rounded-md border border-emerald-100 dark:border-emerald-900/20">
                  {item.notes}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}