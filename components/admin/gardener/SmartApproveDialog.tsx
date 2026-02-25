/**
 * SmartApproveDialog Component
 *
 * Extracted from ReviewQueueBatchActions.tsx
 * AI-assisted smart approve dialog with confidence threshold,
 * preview count, and automatic preview fetching.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
import { Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type {
  GardenerReviewItemType,
  GardenerBatchReviewResponse,
  GardenerSmartApprovePreview,
} from '@/types/gardener';

// =============================================================================
// Types
// =============================================================================

interface SmartApproveDialogProps {
  /** Total number of items (used to disable when empty) */
  total: number;
  /** Whether a batch operation is currently processing */
  isProcessing: boolean;
  /** Current node type filter */
  filterNodeType?: GardenerReviewItemType;
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
// Component
// =============================================================================

export function SmartApproveDialog({
  total,
  isProcessing,
  filterNodeType,
  onSmartApprove,
  onSmartApprovePreview,
}: SmartApproveDialogProps) {
  const t = useTranslations('Admin.gardener.review');
  const [smartConfidence, setSmartConfidence] = useState('90');
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [smartDialogOpen, setSmartDialogOpen] = useState(false);

  const handleSmartApprove = async () => {
    const confidenceValue = parseInt(smartConfidence, 10);
    if (!Number.isFinite(confidenceValue) || confidenceValue < 0 || confidenceValue > 100) return;
    try {
      const minConfidence = confidenceValue / 100;
      const result = await onSmartApprove(minConfidence, filterNodeType, 500);
      setSmartDialogOpen(false);
      setPreviewCount(null);
      toast.success(
        t('smartApproveSuccess', { count: result.processedCount })
      );
    } catch {
      toast.error(t('batchApproveFailed'));
    }
  };

  // Fetch preview when dialog opens or confidence changes
  const fetchPreview = useCallback(async () => {
    const confidenceValue = parseInt(smartConfidence, 10);
    if (!Number.isFinite(confidenceValue) || confidenceValue < 0 || confidenceValue > 100) return;
    setIsLoadingPreview(true);
    try {
      const minConfidence = confidenceValue / 100;
      const result = await onSmartApprovePreview(minConfidence, filterNodeType, 500);
      setPreviewCount(result.count);
    } catch {
      setPreviewCount(null);
    } finally {
      setIsLoadingPreview(false);
    }
  }, [smartConfidence, filterNodeType, onSmartApprovePreview]);

  // Fetch preview when dialog opens
  useEffect(() => {
    if (smartDialogOpen) {
      fetchPreview();
    }
  }, [smartDialogOpen, fetchPreview]);

  return (
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
                  type: filterNodeType || t('all'),
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
              onValueChange={setSmartConfidence}
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
  );
}
