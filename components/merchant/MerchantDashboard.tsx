/**
 * MerchantDashboard Component
 *
 * Feature: 053-merchant-integration
 * Task: T038
 *
 * Dashboard overview for merchant portal with key metrics and quick actions.
 */

'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Package,
  Eye,
  Heart,
  TrendingUp,
  Plus,
  ArrowRight,
  ShoppingBag,
  MapPin,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { MerchantLoadout, LoadoutStatus } from '@/types/merchant-loadout';
import type { Merchant, MerchantLocation } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface MerchantDashboardProps {
  /** Merchant profile */
  merchant: Merchant | null;
  /** All loadouts */
  loadouts: MerchantLoadout[];
  /** Store locations */
  locations: MerchantLocation[];
  /** Loading state */
  isLoading?: boolean;
  /** Path to loadouts list */
  loadoutsPath: string;
  /** Path to create loadout */
  createLoadoutPath: string;
  /** Path to settings */
  settingsPath: string;
}

export interface DashboardMetric {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// =============================================================================
// Component
// =============================================================================

export function MerchantDashboard({
  merchant,
  loadouts,
  locations,
  isLoading = false,
  loadoutsPath,
  createLoadoutPath,
  settingsPath,
}: MerchantDashboardProps) {
  const t = useTranslations('MerchantDashboard');
  const router = useRouter();

  // ---------------------------------------------------------------------------
  // Derived Metrics
  // ---------------------------------------------------------------------------
  const metrics = useMemo(() => {
    const published = loadouts.filter((l) => l.status === 'published');
    const totalViews = loadouts.reduce((sum, l) => sum + l.viewCount, 0);
    const totalWishlistAdds = loadouts.reduce((sum, l) => sum + l.wishlistAddCount, 0);

    return {
      totalLoadouts: loadouts.length,
      publishedLoadouts: published.length,
      totalViews,
      totalWishlistAdds,
      conversionRate:
        totalViews > 0 ? ((totalWishlistAdds / totalViews) * 100).toFixed(1) : '0.0',
    };
  }, [loadouts]);

  const statusCounts = useMemo(() => {
    const counts: Record<LoadoutStatus, number> = {
      draft: 0,
      pending_review: 0,
      published: 0,
      archived: 0,
    };
    loadouts.forEach((l) => {
      counts[l.status]++;
    });
    return counts;
  }, [loadouts]);

  const recentLoadouts = useMemo(
    () =>
      [...loadouts]
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5),
    [loadouts]
  );

  // ---------------------------------------------------------------------------
  // Status Badge
  // ---------------------------------------------------------------------------
  const getStatusBadge = (status: LoadoutStatus) => {
    const variants: Record<LoadoutStatus, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      draft: 'secondary',
      pending_review: 'outline',
      published: 'default',
      archived: 'destructive',
    };
    return <Badge variant={variants[status]}>{status.replace('_', ' ')}</Badge>;
  };

  // ---------------------------------------------------------------------------
  // Loading State
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return <MerchantDashboardSkeleton />;
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('welcome', { name: merchant?.businessName ?? t('merchant') })}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={() => router.push(createLoadoutPath)}>
          <Plus className="mr-2 h-4 w-4" />
          {t('createLoadout')}
        </Button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          label={t('metrics.totalLoadouts')}
          value={metrics.totalLoadouts}
          icon={<Package className="h-5 w-5" />}
        />
        <MetricCard
          label={t('metrics.published')}
          value={metrics.publishedLoadouts}
          icon={<ShoppingBag className="h-5 w-5" />}
        />
        <MetricCard
          label={t('metrics.totalViews')}
          value={metrics.totalViews}
          icon={<Eye className="h-5 w-5" />}
        />
        <MetricCard
          label={t('metrics.wishlistAdds')}
          value={metrics.totalWishlistAdds}
          icon={<Heart className="h-5 w-5" />}
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Recent Loadouts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">{t('recentLoadouts')}</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(loadoutsPath)}
            >
              {t('viewAll')}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentLoadouts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-muted-foreground">{t('noLoadouts')}</p>
                <Button
                  variant="link"
                  onClick={() => router.push(createLoadoutPath)}
                  className="mt-2"
                >
                  {t('createFirst')}
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentLoadouts.map((loadout) => (
                  <li
                    key={loadout.id}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`${loadoutsPath}/${loadout.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate">{loadout.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        {new Date(loadout.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(loadout.status)}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats & Actions */}
        <div className="space-y-4">
          {/* Status Breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">{t('statusBreakdown')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <StatusItem
                  label={t('status.draft')}
                  count={statusCounts.draft}
                  color="bg-gray-400"
                />
                <StatusItem
                  label={t('status.pendingReview')}
                  count={statusCounts.pending_review}
                  color="bg-yellow-400"
                />
                <StatusItem
                  label={t('status.published')}
                  count={statusCounts.published}
                  color="bg-green-500"
                />
                <StatusItem
                  label={t('status.archived')}
                  count={statusCounts.archived}
                  color="bg-red-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Store Locations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg">{t('storeLocations')}</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(settingsPath)}
              >
                {t('manage')}
              </Button>
            </CardHeader>
            <CardContent>
              {locations.length === 0 ? (
                <div className="flex items-center gap-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">{t('noLocations')}</p>
                    <p className="text-xs opacity-80">{t('noLocationsHint')}</p>
                  </div>
                </div>
              ) : (
                <ul className="space-y-2">
                  {locations.slice(0, 3).map((location) => (
                    <li
                      key={location.id}
                      className="flex items-center gap-2 text-sm"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="truncate">{location.name}</span>
                      {location.isPrimary && (
                        <Badge variant="outline" className="text-xs">
                          Primary
                        </Badge>
                      )}
                    </li>
                  ))}
                  {locations.length > 3 && (
                    <li className="text-xs text-muted-foreground pl-6">
                      +{locations.length - 3} more
                    </li>
                  )}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Conversion Rate */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {t('conversionRate')}
                  </p>
                  <p className="text-3xl font-bold">{metrics.conversionRate}%</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {t('conversionHint')}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatusItem({
  label,
  count,
  color,
}: {
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn('w-3 h-3 rounded-full', color)} />
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="ml-auto font-medium">{count}</span>
    </div>
  );
}

// =============================================================================
// Skeleton
// =============================================================================

export function MerchantDashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48 mt-2" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default MerchantDashboard;
