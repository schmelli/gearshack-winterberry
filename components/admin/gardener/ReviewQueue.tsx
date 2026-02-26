'use client';

import { useTranslations } from 'next-intl';
import { useGardenerReview } from '@/hooks/admin';
import { ReviewItemCard } from './ReviewItemCard';
import { ReviewQueueHeader } from './ReviewQueueHeader';
import { ReviewQueueFilters } from './ReviewQueueFilters';
import { ReviewQueueBatchActions } from './ReviewQueueBatchActions';
import { ReviewQueueNavigation } from './ReviewQueueNavigation';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Inbox, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

/**
 * ReviewQueue component
 * Provides the full review interface with navigation, filters, and batch operations.
 * Orchestrates sub-components extracted for maintainability.
 */
export function ReviewQueue() {
  const t = useTranslations('Admin.gardener.review');

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

  return (
    <div className="space-y-4">
      {/* Header with Stats and Actions */}
      <ReviewQueueHeader
        total={total}
        isLoading={isLoading}
        onRefresh={refresh}
      />

      {/* Filters Row */}
      <Card>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            <ReviewQueueFilters
              filters={filters}
              onSetFilter={setFilter}
            />
            <div className="ml-auto flex items-center gap-2">
              <ReviewQueueBatchActions
                total={total}
                isProcessing={isProcessing}
                filterNodeType={filters.nodeType}
                onBatchApprove={batchApprove}
                onBatchReject={batchReject}
                onBatchDelete={batchDelete}
                onSmartApprove={smartApprove}
                onSmartApprovePreview={smartApprovePreview}
              />
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
          <ReviewQueueNavigation
            position={position}
            total={total}
            isProcessing={isProcessing}
            onGoToFirst={() => goToPosition(0)}
            onGoToPrevious={goToPrevious}
            onGoToNext={goToNext}
            onGoToLast={() => goToPosition(total - 1)}
            onGoToPosition={goToPosition}
          />

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
