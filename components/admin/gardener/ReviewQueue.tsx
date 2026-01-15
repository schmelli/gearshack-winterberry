'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useGardenerReview } from '@/hooks/admin';
import { ReviewItemCard } from './ReviewItemCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  Loader2,
  CheckCheck,
  Inbox,
  AlertCircle,
  Filter,
} from 'lucide-react';
import type { GardenerReviewItemType } from '@/types/gardener';
import { toast } from 'sonner';

const NODE_TYPES: GardenerReviewItemType[] = [
  'GearItem',
  'Brand',
  'Category',
  'ProductFamily',
  'Technology',
  'UsageScenario',
  'Insight',
];

const ACTION_TYPES = [
  'enrich',
  'delete',
  'merge',
] as const;

/**
 * ReviewQueue component
 * Provides the full review interface with navigation, filters, and batch operations
 */
export function ReviewQueue() {
  const t = useTranslations('Admin.gardener.review');
  const [jumpToPosition, setJumpToPosition] = useState('');
  const [batchLimit, setBatchLimit] = useState('100');

  const {
    currentItem,
    position,
    total,
    isLoading,
    isProcessing,
    error,
    filters,
    goToNext,
    goToPrevious,
    goToPosition,
    approve,
    reject,
    batchApprove,
    setFilter,
    refresh,
  } = useGardenerReview();

  const handleJumpTo = () => {
    const pos = parseInt(jumpToPosition, 10);
    if (!isNaN(pos) && pos >= 1 && pos <= total) {
      goToPosition(pos - 1); // Convert to 0-indexed
      setJumpToPosition('');
    }
  };

  const handleBatchApprove = async () => {
    try {
      const result = await batchApprove(filters.nodeType, parseInt(batchLimit, 10));
      toast.success(
        t('batchApproveSuccess', { count: result.processedCount })
      );
    } catch {
      toast.error(t('batchApproveFailed'));
    }
  };

  const handleApprove = async (notes?: string) => {
    try {
      await approve(notes);
      toast.success(t('itemApproved'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  const handleReject = async (notes?: string) => {
    try {
      await reject(notes);
      toast.success(t('itemRejected'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with Stats and Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">{t('title')}</h2>
          <Badge variant="secondary" className="text-sm">
            {total.toLocaleString()} {t('itemsRemaining')}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={refresh}
            disabled={isLoading}
            title={t('refresh')}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Filters Row */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('filters')}</span>
            </div>
            <Select
              value={filters.nodeType || 'all'}
              onValueChange={(value) =>
                setFilter('nodeType', value === 'all' ? undefined : value as GardenerReviewItemType)
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterByType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allTypes')}</SelectItem>
                {NODE_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filters.action || 'all'}
              onValueChange={(value) =>
                setFilter('action', value === 'all' ? undefined : value)
              }
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={t('filterByAction')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allActions')}</SelectItem>
                {ACTION_TYPES.map((action) => (
                  <SelectItem key={action} value={action}>
                    {action.charAt(0).toUpperCase() + action.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="ml-auto flex items-center gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={total === 0 || isProcessing}>
                    <CheckCheck className="mr-2 h-4 w-4" />
                    {t('batchApprove')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('batchApproveTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('batchApproveDescription', {
                        type: filters.nodeType || t('all'),
                      })}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4">
                    <label className="text-sm font-medium">
                      {t('batchLimit')}
                    </label>
                    <Select value={batchLimit} onValueChange={setBatchLimit}>
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="500">500</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={handleBatchApprove}>
                      {t('confirmBatchApprove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content */}
      {isLoading && !currentItem ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">{t('loading')}</p>
          </CardContent>
        </Card>
      ) : !currentItem ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center justify-center text-center">
            <Inbox className="h-12 w-12 text-muted-foreground opacity-50" />
            <h3 className="mt-4 text-lg font-medium">{t('emptyQueue')}</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('emptyQueueDescription')}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Navigation Bar */}
          <Card>
            <CardContent className="py-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPosition(0)}
                    disabled={position === 0 || isProcessing}
                    title={t('goToFirst')}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToPrevious}
                    disabled={position === 0 || isProcessing}
                    title={t('previous')}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">
                    {t('position', { current: position + 1, total })}
                  </span>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={total}
                      value={jumpToPosition}
                      onChange={(e) => setJumpToPosition(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleJumpTo()}
                      placeholder={t('jumpTo')}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleJumpTo}
                      disabled={!jumpToPosition}
                    >
                      {t('go')}
                    </Button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={goToNext}
                    disabled={position >= total - 1 || isProcessing}
                    title={t('next')}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => goToPosition(total - 1)}
                    disabled={position >= total - 1 || isProcessing}
                    title={t('goToLast')}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Review Item Card */}
          <ReviewItemCard
            item={currentItem}
            onApprove={handleApprove}
            onReject={handleReject}
            isProcessing={isProcessing}
          />
        </>
      )}
    </div>
  );
}
