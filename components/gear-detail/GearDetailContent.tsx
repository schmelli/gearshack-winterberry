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

import { Pencil, ExternalLink } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ImageGallery } from '@/components/gear-detail/ImageGallery';
import type { GearItem } from '@/types/gear';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import { formatWeight } from '@/lib/loadout-utils';
import { GEAR_CONDITION_LABELS, GEAR_STATUS_LABELS } from '@/types/gear';
import { cn } from '@/lib/utils';
import { YouTubeCarousel } from '@/components/gear-detail/YouTubeCarousel';
import { GearInsightsSection } from '@/components/gear-detail/GearInsightsSection';

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
  /** Callback when edit button is clicked (for modal close) */
  onEditClick?: () => void;
  /** Optional class name */
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function SpecRow({
  label,
  value,
  className,
}: {
  label: string;
  value: string | null | undefined;
  className?: string;
}) {
  if (!value) return null;
  return (
    <div className={className}>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
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
  onEditClick,
  className,
}: GearDetailContentProps) {
  return (
    <ScrollArea className={cn('max-h-[80vh]', className)}>
      <div className="space-y-6 p-6">
        {/* Header with Edit Button */}
        <div className="flex items-start gap-3">
          <Button
            asChild
            size="icon"
            variant="ghost"
            className="h-8 w-8 shrink-0"
            onClick={onEditClick}
          >
            <Link href={`/inventory/${item.id}/edit`}>
              <Pencil className="h-4 w-4" />
              <span className="sr-only">Edit {item.name}</span>
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            {/* T017a: Truncate long names */}
            <h2
              className="text-xl font-semibold leading-tight line-clamp-2"
              title={item.name.length > 60 ? item.name : undefined}
            >
              {item.name}
            </h2>
            {item.brand && (
              <p className="mt-1 text-sm text-muted-foreground">{item.brand}</p>
            )}
          </div>
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
          />
          <SpecRow label="Model" value={item.modelNumber} />
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
          />
        </div>
      </div>
    </ScrollArea>
  );
}

export default GearDetailContent;
