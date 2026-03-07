/**
 * MerchantOffersListClient Component
 *
 * Feature: 053-merchant-integration
 * Task: T052
 *
 * Client component for listing and managing merchant offers.
 */

'use client';

import { useCallback, memo } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useMerchantOffers } from '@/hooks/merchant';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
  Send,
  Package,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { MerchantOfferView, OfferStatus } from '@/types/merchant-offer';

// =============================================================================
// Helpers
// =============================================================================

function formatPrice(price: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(price);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getStatusBadge(status: OfferStatus): { variant: 'default' | 'secondary' | 'outline' | 'destructive'; icon: typeof Clock } {
  switch (status) {
    case 'pending':
      return { variant: 'secondary', icon: Clock };
    case 'viewed':
      return { variant: 'default', icon: Eye };
    case 'accepted':
      return { variant: 'default', icon: CheckCircle };
    case 'declined':
      return { variant: 'destructive', icon: XCircle };
    case 'expired':
      return { variant: 'outline', icon: AlertCircle };
    case 'converted':
      return { variant: 'default', icon: CheckCircle };
    default:
      return { variant: 'outline', icon: Clock };
  }
}

// =============================================================================
// Subcomponents
// =============================================================================

const OfferRow = memo(function OfferRow({
  offer,
  onClick,
}: {
  offer: MerchantOfferView;
  onClick: () => void;
}) {
  const t = useTranslations('MerchantOffers');
  const { variant, icon: StatusIcon } = getStatusBadge(offer.status);

  return (
    <TableRow
      className="cursor-pointer hover:bg-muted/50"
      onClick={onClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onClick();
      }}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
            {offer.catalogItem.imageUrl ? (
              <Image
                src={offer.catalogItem.imageUrl}
                alt={offer.catalogItem.name}
                fill
                sizes="40px"
                className="object-cover rounded"
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{offer.catalogItem.name}</p>
            {offer.catalogItem.brand && (
              <p className="text-xs text-muted-foreground truncate">
                {offer.catalogItem.brand}
              </p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm">
          <span className="text-muted-foreground line-through mr-2">
            {formatPrice(offer.regularPrice)}
          </span>
          <span className="font-medium">{formatPrice(offer.offerPrice)}</span>
        </div>
        <Badge variant="secondary" className="text-xs mt-1">
          -{offer.discountPercent}%
        </Badge>
      </TableCell>
      <TableCell>
        <Badge variant={variant} className="flex items-center gap-1 w-fit">
          <StatusIcon className="h-3 w-3" />
          {t(`status.${offer.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(offer.createdAt)}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {formatDate(offer.expiresAt)}
      </TableCell>
    </TableRow>
  );
});

const OfferRowSkeleton = memo(function OfferRowSkeleton() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-24" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-6 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-20" />
      </TableCell>
    </TableRow>
  );
});

// =============================================================================
// Component
// =============================================================================

export function MerchantOffersListClient() {
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('MerchantOffers');

  const {
    offers,
    isLoading,
    filters,
    pagination,
    setFilters,
    loadOfferDetail,
  } = useMerchantOffers();

  const handleStatusFilter = useCallback(
    (value: string) => {
      setFilters({
        status: value === 'all' ? undefined : (value as OfferStatus),
        page: 1,
      });
    },
    [setFilters]
  );

  const handleOfferClick = useCallback(
    async (offerId: string) => {
      await loadOfferDetail(offerId);
      // TODO: Show offer detail sheet/modal
    },
    [loadOfferDetail]
  );

  const handlePrevPage = useCallback(() => {
    if (pagination.page > 1) {
      setFilters({ page: pagination.page - 1 });
    }
  }, [pagination.page, setFilters]);

  const handleNextPage = useCallback(() => {
    if (pagination.hasMore) {
      setFilters({ page: pagination.page + 1 });
    }
  }, [pagination.hasMore, pagination.page, setFilters]);

  const handleNewOffer = useCallback(() => {
    router.push(`/${locale}/merchant/insights`);
  }, [router, locale]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>
        <Button onClick={handleNewOffer}>
          <Send className="h-4 w-4 mr-2" />
          {t('newOffer')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Select
              value={filters.status ?? 'all'}
              onValueChange={handleStatusFilter}
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder={t('filterByStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="pending">{t('status.pending')}</SelectItem>
                <SelectItem value="viewed">{t('status.viewed')}</SelectItem>
                <SelectItem value="accepted">{t('status.accepted')}</SelectItem>
                <SelectItem value="declined">{t('status.declined')}</SelectItem>
                <SelectItem value="expired">{t('status.expired')}</SelectItem>
                <SelectItem value="converted">{t('status.converted')}</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex-1" />

            <p className="text-sm text-muted-foreground">
              {t('totalOffers', { count: pagination.total })}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Offers Table */}
      <Card>
        <CardContent className="p-0">
          {/* Desktop: Table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('product')}</TableHead>
                  <TableHead>{t('price')}</TableHead>
                  <TableHead>{t('status')}</TableHead>
                  <TableHead>{t('created')}</TableHead>
                  <TableHead>{t('expires')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => <OfferRowSkeleton key={i} />)
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-medium mb-2">{t('noOffers')}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {t('noOffersDescription')}
                      </p>
                      <Button onClick={handleNewOffer}>
                        <Send className="h-4 w-4 mr-2" />
                        {t('createFirstOffer')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <OfferRow
                      key={offer.id}
                      offer={offer}
                      onClick={() => handleOfferClick(offer.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile: Offer Cards */}
          <div className="space-y-3 p-4 md:hidden">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="w-10 h-10 rounded shrink-0" />
                    <div className="space-y-1 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                </Card>
              ))
            ) : offers.length === 0 ? (
              <div className="text-center py-12">
                <Send className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium mb-2">{t('noOffers')}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {t('noOffersDescription')}
                </p>
                <Button onClick={handleNewOffer}>
                  <Send className="h-4 w-4 mr-2" />
                  {t('createFirstOffer')}
                </Button>
              </div>
            ) : (
              offers.map((offer) => {
                const { variant, icon: StatusIcon } = getStatusBadge(offer.status);
                return (
                  <Card
                    key={offer.id}
                    className="p-4 cursor-pointer hover:bg-muted/50"
                    tabIndex={0}
                    role="button"
                    onClick={() => handleOfferClick(offer.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleOfferClick(offer.id);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="relative w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {offer.catalogItem.imageUrl ? (
                          <Image
                            src={offer.catalogItem.imageUrl}
                            alt={offer.catalogItem.name}
                            fill
                            sizes="40px"
                            className="object-cover rounded"
                          />
                        ) : (
                          <Package className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{offer.catalogItem.name}</p>
                        {offer.catalogItem.brand && (
                          <p className="text-xs text-muted-foreground truncate">
                            {offer.catalogItem.brand}
                          </p>
                        )}
                      </div>
                      <Badge variant={variant} className="flex items-center gap-1 shrink-0">
                        <StatusIcon className="h-3 w-3" />
                        {t(`status.${offer.status}`)}
                      </Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">{t('price')}</span>
                        <div>
                          <span className="text-muted-foreground line-through mr-2">
                            {formatPrice(offer.regularPrice)}
                          </span>
                          <span className="font-medium">{formatPrice(offer.offerPrice)}</span>
                          <Badge variant="secondary" className="text-xs ml-2">
                            -{offer.discountPercent}%
                          </Badge>
                        </div>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('created')}</span>
                        <span className="text-muted-foreground">{formatDate(offer.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('expires')}</span>
                        <span className="text-muted-foreground">{formatDate(offer.expiresAt)}</span>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('showingPage', {
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!pagination.hasMore}
            >
              {t('next')}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
