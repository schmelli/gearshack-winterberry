/**
 * ReviewQueueBatchActions Component
 *
 * Extracted from ReviewQueue.tsx
 * Contains batch operation dialogs: Smart Approve, Batch Approve,
 * Batch Reject, and Batch Delete.
 *
 * Smart Approve is delegated to SmartApproveDialog sub-component.
 * Simple batch operations (approve/reject/delete) share a BatchOperationDialog pattern.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
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
import { CheckCheck, XCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { SmartApproveDialog } from './SmartApproveDialog';
import type {
  GardenerReviewItemType,
  GardenerBatchReviewResponse,
  GardenerSmartApprovePreview,
} from '@/types/gardener';

// =============================================================================
// Types
// =============================================================================

interface ReviewQueueBatchActionsProps {
  /** Total number of items in the review queue */
  total: number;
  /** Whether a batch operation is currently processing */
  isProcessing: boolean;
  /** Current node type filter (passed to batch operations) */
  filterNodeType?: GardenerReviewItemType;
  /** Batch approve operation */
  onBatchApprove: (
    nodeType?: GardenerReviewItemType,
    limit?: number
  ) => Promise<GardenerBatchReviewResponse>;
  /** Batch reject operation */
  onBatchReject: (
    nodeType?: GardenerReviewItemType,
    limit?: number
  ) => Promise<GardenerBatchReviewResponse>;
  /** Batch delete operation */
  onBatchDelete: (
    nodeType?: GardenerReviewItemType,
    limit?: number
  ) => Promise<GardenerBatchReviewResponse>;
  /** AI-assisted smart approve operation */
  onSmartApprove: (
    minConfidence?: number,
    nodeType?: GardenerReviewItemType,
    limit?: number
  ) => Promise<GardenerBatchReviewResponse>;
  /** Smart approve preview (dry run) */
  onSmartApprovePreview: (
    minConfidence?: number,
    nodeType?: GardenerReviewItemType,
    limit?: number
  ) => Promise<GardenerSmartApprovePreview>;
}

// =============================================================================
// Batch Limit Selector (shared by approve/reject/delete dialogs)
// =============================================================================

function BatchLimitSelector({
  label,
  value,
  onValueChange,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
}) {
  return (
    <div className="py-4">
      <label className="text-sm font-medium">{label}</label>
      <Select value={value} onValueChange={onValueChange}>
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
  );
}

// =============================================================================
// Component
// =============================================================================

export function ReviewQueueBatchActions({
  total,
  isProcessing,
  filterNodeType,
  onBatchApprove,
  onBatchReject,
  onBatchDelete,
  onSmartApprove,
  onSmartApprovePreview,
}: ReviewQueueBatchActionsProps) {
  const t = useTranslations('Admin.gardener.review');
  const [batchLimit, setBatchLimit] = useState('100');

  const executeBatch = async (
    operation: (nodeType?: GardenerReviewItemType, limit?: number) => Promise<GardenerBatchReviewResponse>,
    successKey: string,
    errorKey: string
  ) => {
    const limit = parseInt(batchLimit, 10);
    if (!Number.isFinite(limit) || limit < 1) return;
    try {
      const result = await operation(filterNodeType, limit);
      toast.success(t(successKey, { count: result.processedCount }));
    } catch {
      toast.error(t(errorKey));
    }
  };

  return (
    <>
      {/* Smart Approve - AI-assisted */}
      <SmartApproveDialog
        total={total}
        isProcessing={isProcessing}
        filterNodeType={filterNodeType}
        onSmartApprove={onSmartApprove}
        onSmartApprovePreview={onSmartApprovePreview}
      />

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
                type: filterNodeType || t('all'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <BatchLimitSelector
            label={t('batchLimit')}
            value={batchLimit}
            onValueChange={setBatchLimit}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => executeBatch(onBatchApprove, 'batchApproveSuccess', 'batchApproveFailed')}>
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
                type: filterNodeType || t('all'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <BatchLimitSelector
            label={t('batchLimit')}
            value={batchLimit}
            onValueChange={setBatchLimit}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeBatch(onBatchReject, 'batchRejectSuccess', 'batchRejectFailed')}
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
                type: filterNodeType || t('all'),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <BatchLimitSelector
            label={t('batchLimit')}
            value={batchLimit}
            onValueChange={setBatchLimit}
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => executeBatch(onBatchDelete, 'batchDeleteSuccess', 'batchDeleteFailed')}
              className="bg-destructive hover:bg-destructive/90"
            >
              {t('confirmBatchDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
