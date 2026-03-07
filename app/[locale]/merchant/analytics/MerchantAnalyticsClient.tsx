/**
 * MerchantAnalyticsClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T070
 *
 * Client component for merchant analytics page.
 */

'use client';

import { useTranslations } from 'next-intl';
import { useMerchantProfile, useConversionTracking } from '@/hooks/merchant';
import { ConversionDashboard } from '@/components/merchant/ConversionDashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart3,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { ConversionStatus } from '@/types/conversion';
import Image from 'next/image';

// =============================================================================
// Helper Functions
// =============================================================================

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(dateStr));
}

function getStatusBadge(status: ConversionStatus) {
  switch (status) {
    case 'confirmed':
      return (
        <Badge variant="default" className="gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Confirmed
        </Badge>
      );
    case 'disputed':
      return (
        <Badge variant="destructive" className="gap-1">
          <Ban className="h-3 w-3" />
          Disputed
        </Badge>
      );
    case 'refunded':
      return (
        <Badge variant="secondary" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Refunded
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1">
          <Clock className="h-3 w-3" />
          Pending
        </Badge>
      );
  }
}

// =============================================================================
// Component
// =============================================================================

export function MerchantAnalyticsClient() {
  const t = useTranslations('MerchantAnalytics');
  const { merchant, isLoading: profileLoading } = useMerchantProfile();

  const {
    conversions,
    analytics,
    isLoading,
    error,
    pagination,
    setFilters,
    refresh,
  } = useConversionTracking(merchant?.id);

  if (profileLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!merchant) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('noAccess')}</AlertTitle>
        <AlertDescription>{t('noAccessDescription')}</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>{t('errorTitle')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            {t('title')}
          </h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {t('refresh')}
        </Button>
      </div>

      {/* Analytics Dashboard */}
      <ConversionDashboard analytics={analytics} isLoading={isLoading} />

      {/* Conversions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t('recentConversions')}</CardTitle>
          <Select
            value={pagination.limit.toString()}
            onValueChange={(value) => {
              const parsed = parseInt(value, 10);
              if (Number.isFinite(parsed) && parsed > 0) {
                setFilters({ limit: parsed });
              }
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 {t('perPage')}</SelectItem>
              <SelectItem value="20">20 {t('perPage')}</SelectItem>
              <SelectItem value="50">50 {t('perPage')}</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : conversions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              {t('noConversions')}
            </p>
          ) : (
            <>
              {/* Desktop: Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('product')}</TableHead>
                      <TableHead className="text-right">{t('salePrice')}</TableHead>
                      <TableHead className="text-right">{t('commission')}</TableHead>
                      <TableHead>{t('date')}</TableHead>
                      <TableHead>{t('status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conversions.map((conversion) => (
                      <TableRow key={conversion.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {conversion.catalogItem.imageUrl ? (
                              <Image
                                src={conversion.catalogItem.imageUrl}
                                alt={conversion.catalogItem.name}
                                width={40}
                                height={40}
                                className="rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-muted rounded-md" />
                            )}
                            <div>
                              <p className="font-medium text-sm">
                                {conversion.catalogItem.name}
                              </p>
                              {conversion.catalogItem.brand && (
                                <p className="text-xs text-muted-foreground">
                                  {conversion.catalogItem.brand}
                                </p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(conversion.salePrice)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {formatCurrency(conversion.commissionAmount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(conversion.conversionDate)}
                        </TableCell>
                        <TableCell>{getStatusBadge(conversion.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile: Analytics Cards */}
              <div className="space-y-3 md:hidden">
                {conversions.map((conversion) => (
                  <Card key={conversion.id} className="p-4">
                    <div className="flex items-center gap-3 mb-3">
                      {conversion.catalogItem.imageUrl ? (
                        <Image
                          src={conversion.catalogItem.imageUrl}
                          alt={conversion.catalogItem.name}
                          width={40}
                          height={40}
                          className="rounded-md object-cover shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded-md shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">
                          {conversion.catalogItem.name}
                        </p>
                        {conversion.catalogItem.brand && (
                          <p className="text-xs text-muted-foreground truncate">
                            {conversion.catalogItem.brand}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(conversion.status)}
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('salePrice')}</span>
                        <span className="font-medium">{formatCurrency(conversion.salePrice)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('commission')}</span>
                        <span className="text-muted-foreground">{formatCurrency(conversion.commissionAmount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('date')}</span>
                        <span className="text-muted-foreground">{formatDate(conversion.conversionDate)}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {t('showing', {
                  from: (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(pagination.page * pagination.limit, pagination.total),
                  total: pagination.total,
                })}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                  onClick={() => setFilters({ page: pagination.page - 1 })}
                >
                  {t('previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!pagination.hasMore}
                  onClick={() => setFilters({ page: pagination.page + 1 })}
                >
                  {t('next')}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
