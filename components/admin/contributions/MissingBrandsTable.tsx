/**
 * MissingBrandsTable Component
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * Displays missing brands with search, filter, pagination, and actions.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import type { MissingBrand } from '@/types/contributions';
import {
  Search,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Merge,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

// =============================================================================
// Types
// =============================================================================

interface MissingBrandsTableProps {
  brands: MissingBrand[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  error: string | null;
  statusFilter: string;
  searchQuery: string;
  onStatusFilterChange: (status: string) => void;
  onSearchChange: (query: string) => void;
  onPageChange: (page: number) => void;
  onUpdateStatus: (id: string, status: string) => Promise<boolean>;
  isUpdatingStatus: boolean;
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('de-DE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// =============================================================================
// Component
// =============================================================================

export function MissingBrandsTable({
  brands,
  total,
  page,
  totalPages,
  isLoading,
  error,
  statusFilter,
  searchQuery,
  onStatusFilterChange,
  onSearchChange,
  onPageChange,
  onUpdateStatus,
  isUpdatingStatus,
}: MissingBrandsTableProps) {
  const t = useTranslations('MissingBrands');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{t('status.pending')}</Badge>;
      case 'added_to_catalog':
        return <Badge variant="outline" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">{t('status.added')}</Badge>;
      case 'rejected':
        return <Badge variant="outline" className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{t('status.rejected')}</Badge>;
      case 'merged':
        return <Badge variant="outline" className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{t('status.merged')}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const STATUS_LABELS: Record<string, string> = {
    added_to_catalog: t('status.added'),
    rejected: t('status.rejected'),
    merged: t('status.merged'),
    pending: t('status.pending'),
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    const success = await onUpdateStatus(id, status);
    if (success) {
      toast.success(t('statusUpdated', { status: STATUS_LABELS[status] ?? status }));
    } else {
      toast.error(t('statusUpdateFailed'));
    }
    setUpdatingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-64 pl-8"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">{t('status.pending')}</SelectItem>
              <SelectItem value="added_to_catalog">{t('status.added')}</SelectItem>
              <SelectItem value="rejected">{t('status.rejected')}</SelectItem>
              <SelectItem value="merged">{t('status.merged')}</SelectItem>
              <SelectItem value="all">{t('status.all')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {t('brandsFound', { count: total })}
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">{t('loadFailed')}</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('columns.brandName')}</TableHead>
              <TableHead className="text-center">{t('columns.occurrences')}</TableHead>
              <TableHead>{t('columns.countries')}</TableHead>
              <TableHead>{t('columns.firstSeen')}</TableHead>
              <TableHead>{t('columns.status')}</TableHead>
              <TableHead className="text-right">{t('columns.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : brands.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                  {t('noBrandsFound')}
                </TableCell>
              </TableRow>
            ) : (
              brands.map((brand) => (
                <TableRow key={brand.id}>
                  <TableCell>
                    <div className="font-medium">{brand.brandName}</div>
                    {brand.sourceUrls.length > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <ExternalLink className="h-3 w-3" />
                        {brand.sourceUrls.length} source URL{brand.sourceUrls.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="font-medium">{brand.occurrenceCount}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {brand.countriesSeen.slice(0, 3).map((country) => (
                        <Badge key={country} variant="secondary" className="text-xs">
                          {country}
                        </Badge>
                      ))}
                      {brand.countriesSeen.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{brand.countriesSeen.length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(brand.firstSeenAt)}
                  </TableCell>
                  <TableCell>{getStatusBadge(brand.status)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={isUpdatingStatus && updatingId === brand.id}
                        >
                          {isUpdatingStatus && updatingId === brand.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MoreHorizontal className="h-4 w-4" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(brand.id, 'added_to_catalog')}
                          disabled={brand.status === 'added_to_catalog'}
                        >
                          <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                          {t('markAsAdded')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(brand.id, 'merged')}
                          disabled={brand.status === 'merged'}
                        >
                          <Merge className="mr-2 h-4 w-4 text-blue-500" />
                          {t('markAsMerged')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleUpdateStatus(brand.id, 'rejected')}
                          disabled={brand.status === 'rejected'}
                        >
                          <XCircle className="mr-2 h-4 w-4 text-red-500" />
                          {t('reject')}
                        </DropdownMenuItem>
                        {brand.status !== 'pending' && (
                          <DropdownMenuItem
                            onClick={() => handleUpdateStatus(brand.id, 'pending')}
                          >
                            {t('resetToPending')}
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t('pageOf', { page, total: totalPages })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('previous')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages || isLoading}
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
