'use client';

import { useTranslations } from 'next-intl';
import { useState, useEffect, useCallback } from 'react';
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
  Sparkles,
  XCircle,
  Trash2,
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
  const [smartConfidence, setSmartConfidence] = useState('90');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);

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
    skip,
    deleteItem,
    batchApprove,
    batchReject,
    batchDelete,
    smartApprove,
    smartApprovePreview,
    setFilter,
    refresh,
  } = useGardenerReview();

  const handleJumpTo = () => {
    const pos = parseInt(jumpToPosition, 10);
    if (Number.isFinite(pos) && pos >= 1 && pos <= total) {
      goToPosition(pos - 1); // Convert to 0-indexed
      setJumpToPosition('');
    }
  };

  const handleBatchApprove = async () => {
    const limit = parseInt(batchLimit, 10);
    if (!Number.isFinite(limit) || limit < 1) return;
    try {
      const result = await batchApprove(filters.nodeType, limit);
      toast.success(
        t('batchApproveSuccess', { count: result.processedCount })
      );
    } catch {
      toast.error(t('batchApproveFailed'));
    }
  };

  const handleSmartApprove = async () => {
    const confidenceValue = parseInt(smartConfidence, 10);
    if (!Number.isFinite(confidenceValue) || confidenceValue < 0 || confidenceValue > 100) return;
    try {
      const minConfidence = confidenceValue / 100;
      const result = await smartApprove(minConfidence, filters.nodeType, 500);
      setSmartDialogOpen(false);
      setPreviewCount(null);
      toast.success(
        t('smartApproveSuccess', { count: result.processedCount })
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

  const handleSkip = async () => {
    try {
      await skip();
      toast.success(t('itemSkipped'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  const handleDelete = async (notes?: string) => {
    try {
      await deleteItem(notes);
      toast.success(t('itemDeleted'));
    } catch {
      toast.error(t('actionFailed'));
    }
  };

  const handleBatchReject = async () => {
    const limit = parseInt(batchLimit, 10);
    if (!Number.isFinite(limit) || limit < 1) return;
    try {
      const result = await batchReject(filters.nodeType, limit);
      toast.success(
        t('batchRejectSuccess', { count: result.processedCount })
      );
    } catch {
      toast.error(t('batchRejectFailed'));
    }
  };

  const handleBatchDelete = async () => {
    const limit = parseInt(batchLimit, 10);
    if (!Number.isFinite(limit) || limit < 1) return;
    try {
      const result = await batchDelete(filters.nodeType, limit);
      toast.success(
        t('batchDeleteSuccess', { count: result.processedCount })
      );
    } catch {
      toast.error(t('batchDeleteFailed'));
    }
  };

  // Fetch preview when dialog opens or confidence changes
  const fetchPreview = useCallback(async () => {
    const confidenceValue = parseInt(smartConfidence, 10);
    if (!Number.isFinite(confidenceValue) || confidenceValue < 0 || confidenceValue > 100) return;
    setIsLoadingPreview(true);
    try {
      const minConfidence = confidenceValue / 100;
      const result = await smartApprovePreview(minConfidence, filters.nodeType, 500);
      setPreviewCount(result.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [smartConfidence, filters.nodeType, smartApprovePreview]);

  // Fetch preview when dialog opens
  useEffect(() => {
    if (smartDialogOpen) {
      fetchPreview();
    }
  }, [smartDialogOpen, fetchPreview]);

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
              {/* Smart Approve - AI-assisted */}
              <AlertDialog open={smartDialogOpen} onOpenChange={setSmartDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="default"
                    disabled={total === 0 || isProcessing}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t('smartApprove')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-purple-500" />
                      {t('smartApproveTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription asChild>
                      <div className="space-y-2">
                        <p>
                          {t('smartApproveDescription', {
                            minConfidence: smartConfidence,
                            type: filters.nodeType || t('all'),
                          })}
                        </p>
                        <div className="flex items-center gap-2 rounded-md bg-muted p-3">
                          {isLoadingPreview ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              <span className="text-sm">{t('loadingPreview')}</span>
                            </>
                          ) : previewCount !== null ? (
                            <span className="text-sm font-medium">
                              {t('previewCount', { count: previewCount.toLocaleString() })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              {t('previewUnavailable')}
                            </span>
                          )}
                        </div>
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <div className="py-4 space-y-4">
                    <div>
                      <label className="text-sm font-medium">
                        {t('minConfidence')}
                      </label>
                      <Select
                        value={smartConfidence}
                        onValueChange={(value) => {
                          setSmartConfidence(value);
                          // Preview will be fetched via useEffect
                        }}
                      >
                        <SelectTrigger className="mt-2">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="95">95%</SelectItem>
                          <SelectItem value="90">90%</SelectItem>
                          <SelectItem value="85">85%</SelectItem>
                          <SelectItem value="80">80%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleSmartApprove}
                      disabled={isLoadingPreview || previewCount === 0}
                      className="bg-gradient-to-r from-purple-600 to-blue-600"
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      {t('confirmSmartApprove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Regular Batch Approve */}
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

              {/* Batch Reject */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" disabled={total === 0 || isProcessing}>
                    <XCircle className="mr-2 h-4 w-4" />
                    {t('batchReject')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('batchRejectTitle')}</AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('batchRejectDescription', {
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
                    <AlertDialogAction
                      onClick={handleBatchReject}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {t('confirmBatchReject')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              {/* Batch Delete */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    disabled={total === 0 || isProcessing}
                    className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t('batchDelete')}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-destructive">
                      {t('batchDeleteTitle')}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {t('batchDeleteDescription', {
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
                    <AlertDialogAction
                      onClick={handleBatchDelete}
                      className="bg-destructive hover:bg-destructive/90"
                    >
                      {t('confirmBatchDelete')}
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
            onSkip={handleSkip}
            onDelete={handleDelete}
            isProcessing={isProcessing}
          />
        </>
      )}
    </div>
  );
}
