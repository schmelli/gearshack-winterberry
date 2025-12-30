/**
 * ConversionDashboard Component
 *
 * Feature: 053-merchant-integration
 * Task: T068
 *
 * Dashboard showing conversion rates, trends, and revenue analytics for merchants.
 */

'use client';

import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  DollarSign,
  Percent,
  Package,
} from 'lucide-react';
import type { ConversionAnalytics } from '@/types/conversion';

// =============================================================================
// Types
// =============================================================================

export interface ConversionDashboardProps {
  analytics: ConversionAnalytics | null;
  isLoading?: boolean;
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  isLoading?: boolean;
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  isLoading,
}: StatCardProps) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-10 w-10 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend && (
              <div className="flex items-center gap-1 pt-1">
                {trend.isPositive ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span
                  className={`text-xs font-medium ${
                    trend.isPositive ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {trend.isPositive ? '+' : ''}
                  {trend.value.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="rounded-lg bg-primary/10 p-2.5 text-primary">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ConversionDashboard({
  analytics,
  isLoading = false,
  className,
}: ConversionDashboardProps) {
  const t = useTranslations('MerchantAnalytics');

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  // Format percentage
  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  return (
    <div className={className}>
      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t('totalConversions')}
          value={analytics?.totalConversions ?? 0}
          subtitle={t('last30Days')}
          icon={<ShoppingCart className="h-5 w-5" />}
          isLoading={isLoading}
        />

        <StatCard
          title={t('conversionRate')}
          value={formatPercent(analytics?.conversionRate ?? 0)}
          subtitle={t('offersToConversions')}
          icon={<Percent className="h-5 w-5" />}
          isLoading={isLoading}
        />

        <StatCard
          title={t('totalRevenue')}
          value={formatCurrency(analytics?.totalRevenue ?? 0)}
          subtitle={t('last30Days')}
          icon={<DollarSign className="h-5 w-5" />}
          isLoading={isLoading}
        />

        <StatCard
          title={t('averageOrderValue')}
          value={formatCurrency(analytics?.averageOrderValue ?? 0)}
          subtitle={t('perConversion')}
          icon={<Package className="h-5 w-5" />}
          isLoading={isLoading}
        />
      </div>

      {/* Breakdown Section */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Conversion Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('conversionStatus')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-12" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('confirmed')}</span>
                  <Badge variant="default">
                    {analytics?.confirmedConversions ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('disputed')}</span>
                  <Badge variant="destructive">
                    {analytics?.disputedConversions ?? 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">{t('localPickup')}</span>
                  <Badge variant="secondary">
                    {formatPercent(analytics?.localPickupPercent ?? 0)}
                  </Badge>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{t('commissionSummary')}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('commissionDescription')}
                </p>
                <p className="text-2xl font-bold">
                  {formatCurrency(analytics?.totalCommissions ?? 0)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('commissionRate', { rate: '5%' })}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products */}
      {analytics?.byProduct && analytics.byProduct.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">{t('topProducts')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.byProduct.slice(0, 5).map((product, index) => (
                <div
                  key={product.catalogItemId}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="text-sm">{product.catalogItemName}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      {product.conversions} {t('sales')}
                    </span>
                    <span className="font-medium">
                      {formatCurrency(product.revenue)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
