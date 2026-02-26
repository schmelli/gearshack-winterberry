/**
 * AdminMerchantList Component
 *
 * Feature: 053-merchant-integration
 * Task: T082
 *
 * Filterable table of merchant applications and accounts for admin review.
 */

'use client';

import { memo } from 'react';
import { useTranslations } from 'next-intl';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Building2,
  Globe,
  Store,
  Eye,
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import type {
  MerchantWithUser,
  AdminMerchantFilters,
  AdminMerchantPagination,
} from '@/hooks/admin/useAdminMerchants';
import type { MerchantStatus } from '@/types/merchant';

// =============================================================================
// Types
// =============================================================================

export interface AdminMerchantListProps {
  merchants: MerchantWithUser[];
  filters: AdminMerchantFilters;
  pagination: AdminMerchantPagination;
  isLoading: boolean;
  onFilterChange: (filters: Partial<AdminMerchantFilters>) => void;
  onPageChange: (page: number) => void;
  onSelectMerchant: (id: string) => void;
  className?: string;
}

// =============================================================================
// Helpers
// =============================================================================

function getStatusBadgeVariant(
  status: MerchantStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'approved':
      return 'default';
    case 'pending':
      return 'secondary';
    case 'rejected':
      return 'destructive';
    case 'suspended':
      return 'outline';
    default:
      return 'secondary';
  }
}

function getBusinessTypeIcon(type: string) {
  switch (type) {
    case 'local':
      return <Store className="h-4 w-4" />;
    case 'chain':
      return <Building2 className="h-4 w-4" />;
    case 'online':
      return <Globe className="h-4 w-4" />;
    default:
      return <Store className="h-4 w-4" />;
  }
}

function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateString));
}

// =============================================================================
// Component
// =============================================================================

export const AdminMerchantList = memo(function AdminMerchantList({
  merchants,
  filters,
  pagination,
  isLoading,
  onFilterChange,
  onPageChange,
  onSelectMerchant,
  className,
}: AdminMerchantListProps) {
  const t = useTranslations('AdminMerchants');

  return (
    <div className={cn('space-y-4', className)}>
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('searchPlaceholder')}
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value })}
            className="pl-9"
          />
        </div>

        {/* Status Filter */}
        <Select
          value={filters.status || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              status: value === 'all' ? undefined : (value as MerchantStatus),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterStatus')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('statusAll')}</SelectItem>
            <SelectItem value="pending">{t('statusPending')}</SelectItem>
            <SelectItem value="approved">{t('statusApproved')}</SelectItem>
            <SelectItem value="rejected">{t('statusRejected')}</SelectItem>
            <SelectItem value="suspended">{t('statusSuspended')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Business Type Filter */}
        <Select
          value={filters.businessType || 'all'}
          onValueChange={(value) =>
            onFilterChange({
              businessType:
                value === 'all'
                  ? undefined
                  : (value as 'local' | 'chain' | 'online'),
            })
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t('filterType')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('typeAll')}</SelectItem>
            <SelectItem value="local">{t('typeLocal')}</SelectItem>
            <SelectItem value="chain">{t('typeChain')}</SelectItem>
            <SelectItem value="online">{t('typeOnline')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columnBusiness')}</TableHead>
              <TableHead>{t('columnType')}</TableHead>
              <TableHead>{t('columnContact')}</TableHead>
              <TableHead>{t('columnStatus')}</TableHead>
              <TableHead>{t('columnDate')}</TableHead>
              <TableHead className="w-[80px]">{t('columnActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Loading skeletons
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell>
                    <Skeleton className="h-5 w-32" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-40" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-20" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-5 w-24" />
                  </TableCell>
                  <TableCell>
                    <Skeleton className="h-8 w-8" />
                  </TableCell>
                </TableRow>
              ))
            ) : merchants.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  {t('noMerchants')}
                </TableCell>
              </TableRow>
            ) : (
              merchants.map((merchant) => (
                <TableRow key={merchant.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {merchant.logoUrl ? (
                        <Image
                          src={merchant.logoUrl}
                          alt={merchant.businessName}
                          width={32}
                          height={32}
                          className="h-8 w-8 rounded object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                          {getBusinessTypeIcon(merchant.businessType)}
                        </div>
                      )}
                      <span className="font-medium">{merchant.businessName}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      {getBusinessTypeIcon(merchant.businessType)}
                      <span className="capitalize">{merchant.businessType}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <p>{merchant.contactEmail}</p>
                      {merchant.user?.displayName && (
                        <p className="text-muted-foreground">
                          {merchant.user.displayName}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(merchant.status)}>
                      {t(`status${merchant.status.charAt(0).toUpperCase()}${merchant.status.slice(1)}`)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(merchant.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onSelectMerchant(merchant.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination.total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('showing', {
              from: (pagination.page - 1) * pagination.limit + 1,
              to: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">
              {t('page', {
                current: pagination.page,
                total: pagination.limit > 0 ? Math.ceil(pagination.total / pagination.limit) : 1,
              })}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasMore}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
});

export default AdminMerchantList;
