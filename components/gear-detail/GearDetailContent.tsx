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

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, ExternalLink, Heart, DollarSign, HandHeart, ArrowLeftRight, Recycle, Tag, Sparkles } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
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
import { PriceTrackingSection } from '@/components/price-tracking';
import { SpecIcon } from '@/components/gear/SpecIcon';
import type { SpecIconType } from '@/components/gear/SpecIcon';
import { MoveToInventoryButton } from '@/components/wishlist/MoveToInventoryButton';
import { MerchantSourceBadge } from '@/components/wishlist/MerchantSourceBadge';
import { TopRetailPricesDisplay } from '@/components/wishlist/TopRetailPricesDisplay';
import { MsrpPriceDisplay } from '@/components/wishlist/MsrpPriceDisplay';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';
import { useWishlistPriceResults } from '@/hooks/price-tracking/useWishlistPriceResults';
import { useMsrpPrice } from '@/hooks/price-tracking/useMsrpPrice';

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


function ScrollableText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  return (
    <div className={cn('max-h-32 overflow-y-auto text-sm text-muted-foreground leading-relaxed', className)}>
      {text}
    </div>
  );
}

function DetailStatusIcons({ item, t }: { item: GearItem; t: (key: string) => string }) {
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
  // userId - reserved for insight feedback, not currently used
  onEditClick,
  onInsightDismissed,
  className,
  isWishlistItem = false,
  onMoveToInventory,
  onMoveComplete,
}: GearDetailContentProps) {
  const t = useTranslations('GearDetail');

  // Cascading Category Refactor: Derive categoryId (level 1) from productTypeId (level 3)
  const categories = useCategoriesStore((state) => state.categories);
  const categoryId = useMemo(
    () => getParentCategoryIds(item.productTypeId, categories).categoryId,
    [item.productTypeId, categories]
  );

  // Conditionally determine which accordion sections should be open by default
  const defaultOpenSections = useMemo(() => {
    const sections = ['specifications', 'reviews'];
    if (item.description || item.notes) {
      sections.push('description');
    }
    return sections;
  }, [item.description, item.notes]);

  // Fetch top 3 prices for wishlist items (shown outside accordion)
  const { priceResults, isLoading: priceResultsLoading } = useWishlistPriceResults(
    isWishlistItem ? item.id : ''
  );

  // Fetch MSRP for wishlist items
  const { msrp, isLoading: msrpLoading } = useMsrpPrice(
    isWishlistItem ? item.name : null,
    isWishlistItem ? item.brand : null,
    isWishlistItem
  );

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
                  <span className="sr-only">{t('aria.edit', { name: item.name })}</span>
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
          <DetailStatusIcons item={item} t={t} />
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
          {item.isFavourite && <Badge variant="default">{t('badges.favourite')}</Badge>}
        </div>

        {/* Feature 053 T087: Merchant Source Attribution for wishlist items */}
        {isWishlistItem && item.sourceMerchantId && (
          <MerchantSourceBadge
            sourceMerchantId={item.sourceMerchantId}
            sourceLoadoutId={item.sourceLoadoutId}
          />
        )}

        {/* Wishlist Price Overview - Always visible (not in accordion) */}
        {isWishlistItem && (
          <div className="space-y-3 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-950/10 p-4">
            {/* MSRP Display */}
            <MsrpPriceDisplay
              msrpAmount={msrp?.expectedPriceUsd ?? null}
              isLoading={msrpLoading}
              variant="inline"
            />

            {/* Top 3 Retail Prices */}
            <TopRetailPricesDisplay
              priceResults={priceResults}
              isLoading={priceResultsLoading}
              variant="full"
            />
          </div>
        )}

        {/* Collapsible Sections */}
        <Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full">
          {/* SPECIFICATIONS Section */}
          <AccordionItem value="specifications">
            <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
              {t('sections.specifications')}
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-lg bg-muted/50 p-4">
                <SpecRow
                  label={t('specLabels.weight')}
                  value={item.weightGrams ? formatWeight(item.weightGrams) : null}
                  icon="weight"
                />
                <SpecRow label={t('specLabels.model')} value={item.modelNumber} icon="model" />
                {(item.lengthCm || item.widthCm || item.heightCm) && (
                  <div className="col-span-2">
                    <p className="text-xs uppercase text-muted-foreground flex items-center gap-1.5">
                      <SpecIcon type="dimensions" size={14} className="opacity-70" />
                      {t('specLabels.dimensions')}
                    </p>
                    <p className="font-medium">
                      {item.lengthCm ?? '–'} × {item.widthCm ?? '–'} ×{' '}
                      {item.heightCm ?? '–'} cm
                    </p>
                  </div>
                )}
                <SpecRow label={t('specLabels.size')} value={item.size} icon="size" />
                <SpecRow label={t('specLabels.color')} value={item.color} icon="color" />
                <SpecRow
                  label={t('specLabels.volume')}
                  value={item.volumeLiters ? `${item.volumeLiters} L` : null}
                  icon="volume"
                />
                <SpecRow label={t('specLabels.materials')} value={item.materials} icon="materials" />
                <SpecRow label={t('specLabels.construction')} value={item.tentConstruction} icon="construction" />
                {item.quantity != null && item.quantity > 1 && (
                  <SpecRow label={t('specLabels.quantity')} value={`${item.quantity}`} icon="quantity" />
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* DESCRIPTION Section */}
          {(item.description || item.notes) && (
            <AccordionItem value="description">
              <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
                {t('sections.description')}
              </AccordionTrigger>
              <AccordionContent>
                {item.description && (
                  <div className="mb-4">
                    <ScrollableText text={item.description} />
                  </div>
                )}
                {item.notes && (
                  <div>
                    <p className="mb-1 text-xs uppercase text-muted-foreground">
                      {t('specLabels.notes')}
                    </p>
                    <ScrollableText text={item.notes} />
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          )}

          {/* PURCHASE INFO Section */}
          {(item.pricePaid || item.retailer || item.purchaseDate) && (
            <AccordionItem value="purchase">
              <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
                {t('sections.purchaseInfo')}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  {item.pricePaid != null && (
                    <span className="font-medium">
                      {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: item.currency ?? 'USD',
                      }).format(item.pricePaid)}
                    </span>
                  )}
                  {item.retailer && (
                    <span className="text-muted-foreground">
                      {t('purchaseInfo.from')} {item.retailer}
                    </span>
                  )}
                  {item.purchaseDate && (
                    <span className="text-muted-foreground">
                      {new Date(item.purchaseDate).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* Price Tracking Section - Feature 050 (only for wishlist items) */}
          {isWishlistItem && (
            <AccordionItem value="price-tracking">
              <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
                {t('sections.priceTracking')}
              </AccordionTrigger>
              <AccordionContent>
                <PriceTrackingSection item={item} />
              </AccordionContent>
            </AccordionItem>
          )}

          {/* External Links */}
          {(item.productUrl || item.brandUrl || item.retailerUrl) && (
            <AccordionItem value="links">
              <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
                {t('sections.externalLinks')}
              </AccordionTrigger>
              <AccordionContent>
                <div className="flex flex-wrap gap-2">
                  {item.productUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={item.productUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t('externalLinks.productPage')}
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
                        {t('externalLinks.brandSite')}
                      </a>
                    </Button>
                  )}
                  {item.retailerUrl && (
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={item.retailerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        {t('externalLinks.retailer')}
                      </a>
                    </Button>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          )}

          {/* REVIEWS Section */}
          <AccordionItem value="reviews">
            <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
              {t('sections.reviews')}
            </AccordionTrigger>
            <AccordionContent>
              {!item.brand || !item.name ? (
                <p className="text-sm text-muted-foreground">
                  {t('reviews.emptyMessage')}
                </p>
              ) : (
                <YouTubeCarousel
                  videos={youtubeVideos}
                  isLoading={youtubeLoading}
                  error={youtubeError}
                  onRetry={onRetryYouTube}
                />
              )}
            </AccordionContent>
          </AccordionItem>

          {/* GEAR INSIGHTS Section */}
          <AccordionItem value="insights">
            <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
              {t('sections.gearInsights')}
            </AccordionTrigger>
            <AccordionContent>
              <GearInsightsSection
                insights={insights}
                isLoading={insightsLoading}
                error={insightsError}
                gearContext={{
                  gearItemId: item.id,
                  brand: item.brand ?? undefined,
                  name: item.name,
                  categoryId: categoryId ?? undefined,
                }}
                onInsightDismissed={onInsightDismissed}
              />
            </AccordionContent>
          </AccordionItem>

          {/* GEARGRAPH DESCRIPTION Section (Placeholder for AI-generated content) */}
          {item.productTypeId && (
            <AccordionItem value="geargraph-description">
              <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  {t('sections.gearGraphDescription')}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="rounded-lg border border-dashed bg-muted/30 p-4 text-center">
                  <Sparkles className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('gearGraph.aiPlaceholder')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    {t('gearGraph.aiSubtext')}
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </div>
    </div>
  );
}

export default GearDetailContent;
