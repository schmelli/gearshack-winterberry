/**
 * Gear Detail Content Component
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T014, T017, T017a
 *
 * Shared content component for the gear detail modal.
 * Displays all stored gear item data with skeleton loaders for external sections.
 * Stateless - receives all data via props.
 */

'use client';

import { Pencil, ExternalLink, Heart, DollarSign, HandHeart, ArrowLeftRight, Recycle, Tag } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ImageGallery } from '@/components/gear-detail/ImageGallery';
import type { GearItem } from '@/types/gear';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import { formatWeight } from '@/lib/loadout-utils';
import { GEAR_CONDITION_LABELS, GEAR_STATUS_LABELS } from '@/types/gear';
import { cn } from '@/lib/utils';
import { YouTubeCarousel } from '@/components/gear-detail/YouTubeCarousel';
import { GearInsightsSection } from '@/components/gear-detail/GearInsightsSection';
import { SpecIcon } from '@/components/gear/SpecIcon';
import type { SpecIconType } from '@/components/gear/SpecIcon';
import { MoveToInventoryButton } from '@/components/wishlist/MoveToInventoryButton';

// =============================================================================
// Types
// =============================================================================

interface GearDetailContentProps {
  /** The gear item to display */
  item: GearItem;
  /** YouTube videos (null = loading, empty array = no results) */
  youtubeVideos: YouTubeVideo[] | null;
  /** Whether YouTube is loading */
  youtubeLoading: boolean;
  /** YouTube error message (if any) */
  youtubeError: string | null;
  /** Callback to retry YouTube fetch */
  onRetryYouTube?: () => void;
  /** GearGraph insights (null = loading, empty array = no results) */
  insights: GearInsight[] | null;
  /** Whether insights are loading */
  insightsLoading: boolean;
  /** Insights error message (if any) */
  insightsError: string | null;
  /** User ID for insight feedback */
  userId?: string;
  /** Callback when edit button is clicked (for modal close) */
  onEditClick?: () => void;
  /** Callback when an insight is dismissed */
  onInsightDismissed?: (insight: GearInsight) => void;
  /** Optional class name */
  className?: string;
  /** Feature 049 US3: Whether item is from wishlist (shows Move button) */
  isWishlistItem?: boolean;
  /** Feature 049 US3: Callback to move wishlist item to inventory */
  onMoveToInventory?: (itemId: string) => Promise<void>;
  /** Feature 049 US3: Callback after successful move */
  onMoveComplete?: () => void;
}

// =============================================================================
// Helper Components
// =============================================================================

function SpecRow({
  label,
  value,
  icon,
  className,
}: {
  label: string;
  value: string | null | undefined;
  icon?: SpecIconType;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
        {icon && <SpecIcon type={icon} size={14} className="opacity-70" />}
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}


function TruncatedText({
  text,
  maxLength = 200,
  className,
}: {
  text: string;
  maxLength?: number;
  className?: string;
}) {
  const isTruncated = text.length > maxLength;
  const displayText = isTruncated ? `${text.slice(0, maxLength)}...` : text;

  return (
    <p className={cn('text-sm text-muted-foreground', className)} title={isTruncated ? text : undefined}>
      {displayText}
    </p>
  );
}

function DetailStatusIcons({ item }: { item: GearItem }) {
  const icons: React.ReactNode[] = [];

  if (item.isFavourite) {
    icons.push(
      <div key="favourite" className="flex items-center justify-center h-6 w-6 rounded-full bg-red-500/90 shadow-sm" title="Favourite">
        <Heart className="h-3.5 w-3.5 text-white fill-white" />
      </div>
    );
  }
  if (item.isForSale) {
    icons.push(
      <div key="for-sale" className="flex items-center justify-center h-6 w-6 rounded-full bg-green-600/90 shadow-sm" title="For Sale">
        <DollarSign className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (item.canBeBorrowed) {
    icons.push(
      <div key="borrowable" className="flex items-center justify-center h-6 w-6 rounded-full bg-blue-500/90 shadow-sm" title="Can be Borrowed">
        <HandHeart className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (item.canBeTraded) {
    icons.push(
      <div key="tradeable" className="flex items-center justify-center h-6 w-6 rounded-full bg-purple-500/90 shadow-sm" title="Up for Trade">
        <ArrowLeftRight className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (item.status === 'lent') {
    icons.push(
      <div key="lent" className="flex items-center justify-center h-6 w-6 rounded-full bg-emerald-500/90 shadow-sm" title="Currently Lent">
        <Recycle className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }
  if (item.status === 'sold') {
    icons.push(
      <div key="sold" className="flex items-center justify-center h-6 w-6 rounded-full bg-amber-500/90 shadow-sm" title="Sold">
        <Tag className="h-3.5 w-3.5 text-white" />
      </div>
    );
  }

  if (icons.length === 0) return null;
  return <div className="flex gap-1 flex-wrap">{icons}</div>;
}

// =============================================================================
// Component
// =============================================================================

export function GearDetailContent({
  item,
  youtubeVideos,
  youtubeLoading,
  youtubeError,
  onRetryYouTube,
  insights,
  insightsLoading,
  insightsError,
  userId,
  onEditClick,
  onInsightDismissed,
  className,
  isWishlistItem = false,
  onMoveToInventory,
  onMoveComplete,
}: GearDetailContentProps) {
  return (
    <div className={cn('max-h-[80vh] overflow-y-auto', className)}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="space-y-2">
          {/* Product name with edit button snug to the right */}
          <div className="flex items-start gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <h2
                    className="text-xl font-semibold leading-tight line-clamp-2 cursor-default"
                    title={item.name.length > 60 ? item.name : undefined}
                  >
                    {item.name}
                  </h2>
                </TooltipTrigger>
                {item.description && (
                  <TooltipContent side="bottom" className="max-w-xs">
                    <p className="text-sm">{item.description}</p>
                  </TooltipContent>
                )}
              </Tooltip>
            </TooltipProvider>
            {/* Action buttons */}
            <div className="flex items-center gap-1 shrink-0 -mt-0.5">
              {/* Feature 049 US3: Move to Inventory button for wishlist items */}
              {isWishlistItem && onMoveToInventory && (
                <MoveToInventoryButton
                  itemId={item.id}
                  itemName={item.name}
                  onMove={onMoveToInventory}
                  onMoveComplete={onMoveComplete}
                  variant="ghost"
                  iconOnly
                  className="h-7 w-7"
                />
              )}
              {/* Edit button snug to name */}
              <Button
                asChild
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onEditClick}
              >
                <Link href={`/inventory/${item.id}/edit`}>
                  <Pencil className="h-4 w-4" />
                  <span className="sr-only">Edit {item.name}</span>
                </Link>
              </Button>
            </div>
          </div>
          {/* Brand with optional link */}
          {item.brand && (
            <div>
              {item.brandUrl ? (
                <a
                  href={item.brandUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                >
                  {item.brand}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">{item.brand}</p>
              )}
            </div>
          )}
          {/* Status icons row */}
          <DetailStatusIcons item={item} />
        </div>

        {/* Image Gallery */}
        <ImageGallery
          primaryImageUrl={item.primaryImageUrl}
          galleryImageUrls={item.galleryImageUrls}
          altText={item.name}
        />

        {/* Badges: Condition, Status, Category */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">
            {GEAR_CONDITION_LABELS[item.condition]}
          </Badge>
          <Badge variant="outline">{GEAR_STATUS_LABELS[item.status]}</Badge>
          {item.isFavourite && <Badge variant="default">Favourite</Badge>}
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
          <SpecRow
            label="Weight"
            value={item.weightGrams ? formatWeight(item.weightGrams) : null}
            icon="weight"
          />
          <SpecRow label="Model" value={item.modelNumber} icon="model" />
          {(item.lengthCm || item.widthCm || item.heightCm) && (
            <div className="col-span-2">
              <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                <SpecIcon type="dimensions" size={14} className="opacity-70" />
                Dimensions (L × W × H)
              </p>
              <p className="font-medium">
                {item.lengthCm ?? '–'} × {item.widthCm ?? '–'} ×{' '}
                {item.heightCm ?? '–'} cm
              </p>
            </div>
          )}
        </div>

        {/* Description (T017a: Truncate long descriptions) */}
        {item.description && (
          <div>
            <p className="mb-1 text-xs uppercase text-muted-foreground">
              Description
            </p>
            <TruncatedText text={item.description} maxLength={300} />
          </div>
        )}

        {/* Notes (T017a: Truncate long notes) */}
        {item.notes && (
          <div>
            <p className="mb-1 text-xs uppercase text-muted-foreground">
              Notes
            </p>
            <TruncatedText text={item.notes} maxLength={200} />
          </div>
        )}

        {/* Purchase Info */}
        {(item.pricePaid || item.retailer || item.purchaseDate) && (
          <div className="border-t pt-4">
            <p className="mb-2 text-xs uppercase text-muted-foreground">
              Purchase Info
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              {item.pricePaid && (
                <span className="font-medium">
                  {item.currency ?? '$'}
                  {item.pricePaid.toFixed(2)}
                </span>
              )}
              {item.retailer && (
                <span className="text-muted-foreground">
                  from {item.retailer}
                </span>
              )}
              {item.purchaseDate && (
                <span className="text-muted-foreground">
                  {new Date(item.purchaseDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        )}

        {/* External Links */}
        {(item.productUrl || item.brandUrl || item.retailerUrl) && (
          <div className="flex flex-wrap gap-2">
            {item.productUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={item.productUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Product Page
                </a>
              </Button>
            )}
            {item.brandUrl && (
              <Button variant="outline" size="sm" asChild>
                <a
                  href={item.brandUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="mr-1 h-3 w-3" />
                  Brand Site
                </a>
              </Button>
            )}
          </div>
        )}

        {/* T042: YouTube Reviews Section */}
        <div className="border-t pt-4">
          <p className="mb-3 text-xs uppercase text-muted-foreground">
            Reviews
          </p>
          {/* T043: Show message when brand/name missing */}
          {!item.brand && !item.name ? (
            <p className="text-sm text-muted-foreground">
              Add brand and name to find reviews
            </p>
          ) : (
            <YouTubeCarousel
              videos={youtubeVideos}
              isLoading={youtubeLoading}
              error={youtubeError}
              onRetry={onRetryYouTube}
            />
          )}
        </div>

        {/* T059: Gear Insights Section */}
        <div className="border-t pt-4">
          <p className="mb-3 text-xs uppercase text-muted-foreground">
            Gear Insights
          </p>
          <GearInsightsSection
            insights={insights}
            isLoading={insightsLoading}
            error={insightsError}
            gearContext={{
              gearItemId: item.id,
              brand: item.brand ?? undefined,
              name: item.name,
              categoryId: item.categoryId ?? undefined,
            }}
            onInsightDismissed={onInsightDismissed}
          />
        </div>
      </div>
    </div>
  );
}

export default GearDetailContent;
