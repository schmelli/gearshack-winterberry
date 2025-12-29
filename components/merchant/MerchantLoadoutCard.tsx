/**
 * MerchantLoadoutCard Component
 *
 * Feature: 053-merchant-integration
 * Task: T022
 *
 * Card display for merchant loadouts in grid view.
 * Shows loadout name, merchant, price, discount, and featured status.
 */

'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { Package, Weight, MapPin, Star, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { VerifiedBadge } from './MerchantBadge';
import type { MerchantLoadoutCard as LoadoutCardType } from '@/types/merchant-loadout';

// =============================================================================
// Types
// =============================================================================

export interface MerchantLoadoutCardProps {
  loadout: LoadoutCardType;
  /** Show distance to nearest location */
  showDistance?: boolean;
  /** Additional class names */
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
    return `${(grams / 1000).toFixed(1)} kg`;
  }
  return `${grams} g`;
}

// =============================================================================
// Component
// =============================================================================

export const MerchantLoadoutCard = memo(function MerchantLoadoutCard({
  loadout,
  showDistance = false,
  className,
}: MerchantLoadoutCardProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('MerchantLoadouts');

  const handleClick = () => {
    router.push(`/${locale}/community/merchant-loadouts/${loadout.slug}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="article"
      aria-label={`${loadout.name} by ${loadout.merchant.businessName}`}
    >
      {/* Hero Image */}
      <div className="relative">
        <AspectRatio ratio={16 / 9}>
          {loadout.heroImageUrl ? (
            <img
              src={loadout.heroImageUrl}
              alt={loadout.name}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-muted">
              <Package className="h-12 w-12 text-muted-foreground/50" />
            </div>
          )}
        </AspectRatio>

        {/* Featured Badge */}
        {loadout.isFeatured && (
          <Badge
            className="absolute left-2 top-2 bg-amber-500 text-white hover:bg-amber-600"
          >
            <Star className="mr-1 h-3 w-3 fill-current" />
            {t('featured')}
          </Badge>
        )}

        {/* Savings Badge */}
        {loadout.savingsPercent > 0 && (
          <Badge
            variant="secondary"
            className="absolute right-2 top-2 bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400"
          >
            {t('savePercent', { percent: loadout.savingsPercent })}
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        {/* Merchant Info */}
        <div className="mb-2 flex items-center gap-2">
          {loadout.merchant.logoUrl && (
            <img
              src={loadout.merchant.logoUrl}
              alt={loadout.merchant.businessName}
              className="h-5 w-5 rounded-full object-cover"
            />
          )}
          <span className="text-xs text-muted-foreground truncate">
            {loadout.merchant.businessName}
          </span>
          <VerifiedBadge isVerified={loadout.merchant.isVerified} size="sm" />
        </div>

        {/* Loadout Name */}
        <h3 className="font-semibold line-clamp-2 group-hover:text-primary transition-colors">
          {loadout.name}
        </h3>

        {/* Stats Row */}
        <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Package className="h-4 w-4" />
            <span>{t('itemCount', { count: loadout.itemCount })}</span>
          </div>
          {loadout.totalWeightGrams > 0 && (
            <div className="flex items-center gap-1">
              <Weight className="h-4 w-4" />
              <span>{formatWeight(loadout.totalWeightGrams)}</span>
            </div>
          )}
        </div>

        {/* Distance (if showing) - T088: Handle online-only merchants */}
        {showDistance && (
          <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {loadout.merchant.businessType === 'online' ? (
              <span>{t('shipsNationwide')}</span>
            ) : loadout.nearestLocationKm !== null ? (
              <span>{t('distanceAway', { km: loadout.nearestLocationKm.toFixed(1) })}</span>
            ) : (
              <span>{t('noLocation')}</span>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t p-4">
        {/* Price */}
        <div>
          <div className="text-lg font-bold text-primary">
            {formatPrice(loadout.bundlePrice, locale)}
          </div>
          {loadout.savingsPercent > 0 && (
            <div className="text-xs text-muted-foreground line-through">
              {formatPrice(
                loadout.bundlePrice / (1 - loadout.savingsPercent / 100),
                locale
              )}
            </div>
          )}
        </div>

        {/* View Arrow */}
        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
      </CardFooter>
    </Card>
  );
});

// =============================================================================
// Skeleton Component
// =============================================================================

export function MerchantLoadoutCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <AspectRatio ratio={16 / 9}>
        <div className="h-full w-full animate-pulse bg-muted" />
      </AspectRatio>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center gap-2">
          <div className="h-5 w-5 animate-pulse rounded-full bg-muted" />
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="h-5 w-full animate-pulse rounded bg-muted" />
        <div className="mt-2 h-4 w-3/4 animate-pulse rounded bg-muted" />
        <div className="mt-3 flex gap-4">
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
          <div className="h-4 w-16 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
      <CardFooter className="border-t p-4">
        <div className="h-6 w-20 animate-pulse rounded bg-muted" />
      </CardFooter>
    </Card>
  );
}

export default MerchantLoadoutCard;
