/**
 * Gear Detail Content Component
 *
 * Feature: 045-gear-detail-modal
 * Tasks: T014, T017, T017a
 *
 * Shared content component for the gear detail modal.
 * Displays all stored gear item data with skeleton loaders for external sections.
 * Stateless - receives all data via props.
 *
 * Orchestrates extracted sub-components:
 * - GearDetailHeader (name, brand, status icons, action buttons)
 * - GearDetailSpecifications (specs grid)
 * - GearDetailPurchaseInfo (price, retailer, date)
 * - GearDetailExternalLinks (sanitized external URLs)
 * - GearDetailWishlistPricing (manufacturer, eBay, reseller prices)
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ImageGallery } from '@/components/gear-detail/ImageGallery';
import { GearDetailHeader } from '@/components/gear-detail/GearDetailHeader';
import { GearDetailSpecifications } from '@/components/gear-detail/GearDetailSpecifications';
import { GearDetailPurchaseInfo } from '@/components/gear-detail/GearDetailPurchaseInfo';
import { GearDetailExternalLinks } from '@/components/gear-detail/GearDetailExternalLinks';
import { GearDetailWishlistPricing } from '@/components/gear-detail/GearDetailWishlistPricing';
import { YouTubeCarousel } from '@/components/gear-detail/YouTubeCarousel';
import { GearInsightsSection } from '@/components/gear-detail/GearInsightsSection';
import { MerchantSourceBadge } from '@/components/wishlist/MerchantSourceBadge';
import { useCategoriesStore } from '@/hooks/useCategoriesStore';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { getParentCategoryIds } from '@/lib/utils/category-helpers';
import { useMsrpPrice } from '@/hooks/price-tracking/useMsrpPrice';
import { cn } from '@/lib/utils';
import type { GearItem } from '@/types/gear';
import type { YouTubeVideo } from '@/types/youtube';
import type { GearInsight } from '@/types/geargraph';
import { GEAR_CONDITION_LABELS, GEAR_STATUS_LABELS } from '@/types/gear';

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
  /** Whether YouTube quota is exhausted (retry won't help) */
  youtubeQuotaExhausted?: boolean;
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
// Scrollable Text Helper
// =============================================================================

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

// =============================================================================
// Component
// =============================================================================

export function GearDetailContent({
  item,
  youtubeVideos,
  youtubeLoading,
  youtubeError,
  youtubeQuotaExhausted = false,
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
  const { profile } = useAuthContext();

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

  // Fetch MSRP for wishlist items
  const { msrp, isLoading: msrpLoading } = useMsrpPrice(
    isWishlistItem ? item.name : null,
    isWishlistItem ? item.brand : null,
    isWishlistItem
  );

  // Feature 057: Derive product type keywords for eBay filtering
  const productTypeKeywords = useMemo(() => {
    if (!item.productTypeId || !categories.length) return [];
    const category = categories.find(c => c.id === item.productTypeId);
    if (category) {
      const categoryName = category.i18n?.en || category.label || '';
      return categoryName.split(/\s+/).filter((k: string) => k.length > 2);
    }
    return [];
  }, [item.productTypeId, categories]);

  return (
    <div className={cn('max-h-[80vh] overflow-y-auto', className)}>
      <div className="space-y-6 p-6">
        {/* Header */}
        <GearDetailHeader
          item={item}
          onEditClick={onEditClick}
          isWishlistItem={isWishlistItem}
          onMoveToInventory={onMoveToInventory}
          onMoveComplete={onMoveComplete}
        />

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

        {/* Feature 057: Price tracking sections for wishlist items */}
        {isWishlistItem && (
          <GearDetailWishlistPricing
            gearItemId={item.id}
            itemName={item.name}
            brandName={item.brand}
            manufacturerPrice={item.manufacturerPrice}
            manufacturerCurrency={item.manufacturerCurrency}
            productUrl={item.productUrl}
            brandUrl={item.brandUrl}
            msrpAmount={msrp?.expectedPriceUsd ?? null}
            msrpLoading={msrpLoading}
            productTypeKeywords={productTypeKeywords}
            countryCode={profile?.rawProfile?.preferred_locale?.split('-')[1]?.toUpperCase() || 'DE'}
            userLocation={
              profile?.rawProfile?.latitude && profile?.rawProfile?.longitude
                ? { latitude: profile.rawProfile.latitude, longitude: profile.rawProfile.longitude }
                : null
            }
          />
        )}

        {/* Collapsible Sections */}
        <Accordion type="multiple" defaultValue={defaultOpenSections} className="w-full">
          {/* SPECIFICATIONS Section */}
          <AccordionItem value="specifications">
            <AccordionTrigger className="text-xs uppercase text-muted-foreground hover:no-underline">
              {t('sections.specifications')}
            </AccordionTrigger>
            <AccordionContent>
              <GearDetailSpecifications item={item} />
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
                <GearDetailPurchaseInfo
                  pricePaid={item.pricePaid}
                  currency={item.currency}
                  retailer={item.retailer}
                  purchaseDate={item.purchaseDate}
                />
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
                <GearDetailExternalLinks
                  productUrl={item.productUrl}
                  brandUrl={item.brandUrl}
                  retailerUrl={item.retailerUrl}
                />
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
                  isQuotaExhausted={youtubeQuotaExhausted}
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

        </Accordion>
      </div>
    </div>
  );
}

export default GearDetailContent;
