/**
 * MerchantLoadoutDetail Component
 *
 * Feature: 053-merchant-integration
 * Task: T023
 *
 * Full detail view for a merchant loadout including:
 * - Items list with expert notes
 * - Bundle pricing breakdown
 * - Store availability
 * - Merchant info
 * - Add to wishlist actions
 */

'use client';

import { memo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Package,
  Weight,
  MapPin,
  Star,
  Heart,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { MerchantInfoBadge, VerifiedBadge } from './MerchantBadge';
import type {
  MerchantLoadoutDetail as LoadoutDetailType,
  LoadoutItemWithDetails,
  LoadoutAvailability,
} from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface MerchantLoadoutDetailProps {
  loadout: LoadoutDetailType;
  /** Callback when user wants to add item to wishlist */
  onAddToWishlist?: (itemId: string) => void;
  /** Callback when user wants to add entire loadout to wishlist */
  onAddAllToWishlist?: () => void;
  /** Whether user has items in wishlist already */
  wishlistedItemIds?: Set<string>;
  /** Show location sharing prompt */
  onLocationConsentRequest?: () => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(price: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function formatWeight(grams: number): string {
  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

// =============================================================================
// Sub-Components
// =============================================================================

const LoadoutItemCard = memo(function LoadoutItemCard({
  item,
  locale,
  isWishlisted,
  onAddToWishlist,
}: {
  item: LoadoutItemWithDetails;
  locale: string;
  isWishlisted: boolean;
  onAddToWishlist?: () => void;
}) {
  const t = useTranslations('MerchantLoadouts');
  const [expanded, setExpanded] = useState(false);

  const catalogItem = item.catalogItem;
  const itemTotal = catalogItem.price * item.quantity;

  return (
    <Card className="overflow-hidden">
      <div className="flex gap-4 p-4">
        {/* Item Image */}
        <div className="w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
          {catalogItem.imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={catalogItem.imageUrl}
              alt={catalogItem.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground/50" />
            </div>
          )}
        </div>

        {/* Item Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium leading-tight line-clamp-1">
                {catalogItem.name}
              </h4>
              {catalogItem.brand && (
                <p className="text-sm text-muted-foreground">{catalogItem.brand}</p>
              )}
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={isWishlisted ? 'secondary' : 'ghost'}
                    size="icon"
                    className="h-8 w-8 flex-shrink-0"
                    onClick={onAddToWishlist}
                    disabled={isWishlisted}
                  >
                    <Heart
                      className={cn(
                        'h-4 w-4',
                        isWishlisted && 'fill-current text-red-500'
                      )}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isWishlisted ? 'Already in wishlist' : t('addToWishlist')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Quantity and Price */}
          <div className="mt-2 flex items-center gap-3 text-sm">
            {item.quantity > 1 && (
              <Badge variant="outline" className="text-xs">
                ×{item.quantity}
              </Badge>
            )}
            {catalogItem.weightGrams && (
              <span className="text-muted-foreground">
                {formatWeight(catalogItem.weightGrams * item.quantity)}
              </span>
            )}
            <span className="ml-auto font-medium">
              {formatPrice(itemTotal, locale)}
            </span>
          </div>

          {/* Expert Note Toggle */}
          {item.expertNote && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-2 flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <MessageSquare className="h-3 w-3" />
              {t('expertNote')}
              {expanded ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* Expert Note Content */}
      {item.expertNote && expanded && (
        <div className="px-4 pb-4">
          <div className="rounded-lg bg-muted/50 p-3 text-sm italic">
            &ldquo;{item.expertNote}&rdquo;
          </div>
        </div>
      )}
    </Card>
  );
});

function PricingBreakdown({
  loadout,
  locale,
}: {
  loadout: LoadoutDetailType;
  locale: string;
}) {
  const t = useTranslations('MerchantLoadouts');
  const { pricing } = loadout;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{t('bundlePrice')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">
            {loadout.items.length} items individually
          </span>
          <span className="line-through text-muted-foreground">
            {formatPrice(pricing.individualTotal, locale)}
          </span>
        </div>

        {pricing.discountPercent > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-green-600 dark:text-green-400">
              Bundle discount ({pricing.discountPercent}%)
            </span>
            <span className="text-green-600 dark:text-green-400">
              -{formatPrice(pricing.discountAmount, locale)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between font-semibold">
          <span>Bundle Total</span>
          <span className="text-lg text-primary">
            {formatPrice(pricing.bundlePrice, locale)}
          </span>
        </div>

        {pricing.totalWeightGrams > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Weight className="h-4 w-4" />
            <span>Total weight: {formatWeight(pricing.totalWeightGrams)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AvailabilitySection({
  availability,
}: {
  availability: LoadoutAvailability[];
}) {
  const t = useTranslations('MerchantLoadouts');

  if (availability.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Store Availability
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('shipsNationwide')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-4 w-4" />
          Store Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {availability.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center justify-between text-sm"
          >
            <span>{loc.locationName}</span>
            <Badge
              variant={loc.isInStock ? 'default' : 'secondary'}
              className={cn(
                loc.isInStock
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-600'
              )}
            >
              {loc.isInStock ? (
                <>
                  <Check className="mr-1 h-3 w-3" />
                  {t('inStock')}
                </>
              ) : (
                <>
                  <X className="mr-1 h-3 w-3" />
                  {t('outOfStock')}
                </>
              )}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function MerchantSection({ loadout }: { loadout: LoadoutDetailType }) {
  const { merchant } = loadout;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          {merchant.logoUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={merchant.logoUrl}
              alt={merchant.businessName}
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">{merchant.businessName}</span>
              <VerifiedBadge isVerified={merchant.isVerified} size="sm" />
            </div>
            <p className="text-sm text-muted-foreground capitalize">
              {merchant.businessType} retailer
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export const MerchantLoadoutDetail = memo(function MerchantLoadoutDetail({
  loadout,
  onAddToWishlist,
  onAddAllToWishlist,
  wishlistedItemIds = new Set(),
  onLocationConsentRequest,
  className,
}: MerchantLoadoutDetailProps) {
  const t = useTranslations('MerchantLoadouts');
  const locale = useLocale();

  const allItemsWishlisted = loadout.items.every((item) =>
    wishlistedItemIds.has(item.catalogItemId)
  );

  const handleAddAllToWishlist = () => {
    if (onLocationConsentRequest) {
      onLocationConsentRequest();
    } else {
      onAddAllToWishlist?.();
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Hero Section */}
      <div className="relative">
        <AspectRatio ratio={21 / 9}>
          {loadout.heroImageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={loadout.heroImageUrl}
              alt={loadout.name}
              className="h-full w-full object-cover rounded-xl"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted rounded-xl">
              <Package className="h-16 w-16 text-muted-foreground/50" />
            </div>
          )}
        </AspectRatio>

        {/* Featured Badge */}
        {loadout.isFeatured && (
          <Badge
            className="absolute left-4 top-4 bg-amber-500 text-white hover:bg-amber-600"
          >
            <Star className="mr-1 h-3 w-3 fill-current" />
            {t('featured')}
          </Badge>
        )}
      </div>

      {/* Title and Meta */}
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">{loadout.name}</h1>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <MerchantInfoBadge
            merchant={loadout.merchant}
            showBusinessType={false}
            size="sm"
          />

          {loadout.tripType && (
            <Badge variant="outline">{loadout.tripType}</Badge>
          )}

          {loadout.season?.map((s) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>

        {loadout.description && (
          <p className="mt-4 text-muted-foreground">{loadout.description}</p>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {t('items', { count: loadout.items.length })}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddAllToWishlist}
              disabled={allItemsWishlisted}
            >
              <Heart className="mr-2 h-4 w-4" />
              {t('addAllToWishlist')}
            </Button>
          </div>

          <div className="space-y-3">
            {loadout.items.map((item) => (
              <LoadoutItemCard
                key={item.id}
                item={item}
                locale={locale}
                isWishlisted={wishlistedItemIds.has(item.catalogItemId)}
                onAddToWishlist={() => {
                  if (onLocationConsentRequest && !wishlistedItemIds.size) {
                    onLocationConsentRequest();
                  } else {
                    onAddToWishlist?.(item.catalogItemId);
                  }
                }}
              />
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Pricing */}
          <PricingBreakdown loadout={loadout} locale={locale} />

          {/* Availability */}
          <AvailabilitySection availability={loadout.availability} />

          {/* Merchant Info */}
          <MerchantSection loadout={loadout} />

          {/* Stats */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold">{loadout.viewCount}</div>
                  <div className="text-xs text-muted-foreground">Views</div>
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {loadout.wishlistAddCount}
                  </div>
                  <div className="text-xs text-muted-foreground">Wishlisted</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
});

// =============================================================================
// Skeleton
// =============================================================================

export function MerchantLoadoutDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-48 md:h-64 rounded-xl bg-muted" />
      <div className="space-y-2">
        <div className="h-8 w-3/4 bg-muted rounded" />
        <div className="h-4 w-1/2 bg-muted rounded" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-lg" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-40 bg-muted rounded-lg" />
          <div className="h-32 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}

export default MerchantLoadoutDetail;
