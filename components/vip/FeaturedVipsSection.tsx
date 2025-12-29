'use client';

/**
 * Featured VIPs Section Component
 *
 * Feature: 052-vip-loadouts
 * Task: T025
 *
 * Section component for displaying featured VIPs on the Community page.
 * Shows a grid of VIP cards with loading and empty states.
 */

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, Star, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VipProfileCard } from './VipProfileCard';
import type { VipWithStats } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface FeaturedVipsSectionProps {
  vips: VipWithStats[];
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
  showViewAll?: boolean;
  maxItems?: number;
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function VipCardSkeleton() {
  return (
    <Card className="h-full animate-pulse">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar skeleton */}
          <div className="h-12 w-12 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            {/* Name skeleton */}
            <div className="h-5 w-24 bg-muted rounded" />
            {/* Stats skeleton */}
            <div className="flex gap-3">
              <div className="h-3 w-12 bg-muted rounded" />
              <div className="h-3 w-12 bg-muted rounded" />
            </div>
          </div>
        </div>
        {/* Bio skeleton */}
        <div className="mt-3 space-y-2">
          <div className="h-3 w-full bg-muted rounded" />
          <div className="h-3 w-2/3 bg-muted rounded" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Component
// =============================================================================

export function FeaturedVipsSection({
  vips,
  status,
  error,
  showViewAll = true,
  maxItems = 6,
}: FeaturedVipsSectionProps) {
  const locale = useLocale();
  const t = useTranslations('vip');

  const displayedVips = vips.slice(0, maxItems);
  const vipDirectoryUrl = `/${locale}/vip`;

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Star className="h-5 w-5 text-amber-500" aria-hidden="true" />
          <h2 className="text-xl font-semibold text-foreground">
            {t('featured.title')}
          </h2>
        </div>

        {showViewAll && status === 'success' && vips.length > 0 && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={vipDirectoryUrl}>
              {t('featured.viewAll')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        )}
      </div>

      {/* Content based on status */}
      {status === 'loading' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: maxItems }).map((_, i) => (
            <VipCardSkeleton key={i} />
          ))}
        </div>
      )}

      {status === 'error' && (
        <Card className="border-destructive/50">
          <CardContent className="flex items-center gap-3 py-6">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium text-destructive">
                {t('featured.errorTitle')}
              </p>
              <p className="text-sm text-muted-foreground">
                {error || t('featured.errorMessage')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {status === 'success' && displayedVips.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Star className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
            <p className="text-lg font-medium text-foreground">
              {t('featured.emptyTitle')}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t('featured.emptyMessage')}
            </p>
          </CardContent>
        </Card>
      )}

      {status === 'success' && displayedVips.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedVips.map((vip) => (
            <VipProfileCard key={vip.id} vip={vip} />
          ))}
        </div>
      )}

      {/* View All CTA for mobile */}
      {showViewAll && status === 'success' && vips.length > maxItems && (
        <div className="text-center md:hidden">
          <Button variant="outline" asChild>
            <Link href={vipDirectoryUrl}>
              {t('featured.viewAll')}
              <ArrowRight className="h-4 w-4 ml-1" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

export default FeaturedVipsSection;
