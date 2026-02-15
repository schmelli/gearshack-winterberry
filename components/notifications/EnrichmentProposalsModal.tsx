/**
 * EnrichmentProposalsModal Component
 *
 * Feature: Aggregated Enrichment Notifications
 * Modal for reviewing and accepting/dismissing GearGraph data enrichment proposals.
 *
 * Shows all pending enrichment suggestions with per-item actions and bulk operations.
 * Sequential processing with visual feedback for bulk actions.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import {
  Check,
  X,
  Loader2,
  Scale,
  DollarSign,
  FileText,
  Sparkles,
  CheckCircle2,
  XCircle,
  Package,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  useEnrichmentSuggestions,
  type EnrichmentSuggestion,
} from '@/hooks/useEnrichmentSuggestions';

// =============================================================================
// Types
// =============================================================================

interface EnrichmentProposalsModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when all proposals are resolved (to clean up notification) */
  onAllResolved?: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Formats confidence as percentage
 */
function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`;
}

/**
 * Truncates description for preview
 */
function truncateDescription(text: string, maxLength: number = 80): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  return lastSpace > maxLength * 0.7
    ? truncated.slice(0, lastSpace) + '...'
    : truncated + '...';
}

// =============================================================================
// ProposalCard Sub-component
// =============================================================================

interface ProposalCardProps {
  suggestion: EnrichmentSuggestion;
  isProcessing: boolean;
  onAccept: () => Promise<void>;
  onDismiss: () => Promise<void>;
  disabled: boolean;
}

function ProposalCard({
  suggestion,
  isProcessing,
  onAccept,
  onDismiss,
  disabled,
}: ProposalCardProps) {
  const t = useTranslations('Notifications.enrichmentModal');

  const hasWeight = suggestion.suggestedWeight !== null;
  const hasPrice = suggestion.suggestedPrice !== null;
  const hasDescription = suggestion.suggestedDescription !== null;

  return (
    <div
      className={cn(
        'flex gap-4 p-4 rounded-lg border transition-colors',
        isProcessing
          ? 'border-forest-500/50 bg-forest-50/30 dark:bg-forest-900/20'
          : 'border-border bg-card hover:border-muted-foreground/30'
      )}
    >
      {/* Gear Item Image */}
      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted">
        {suggestion.gearItemImage ? (
          <Image
            src={suggestion.gearItemImage}
            alt={suggestion.gearItemName}
            fill
            className="object-cover"
            sizes="64px"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-6 w-6 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-2">
        {/* Header: Item name + confidence */}
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm leading-tight truncate">
            {suggestion.gearItemName}
          </h4>
          <Badge variant="secondary" className="flex-shrink-0 text-xs">
            <Sparkles className="h-3 w-3 mr-1" />
            {formatConfidence(suggestion.matchConfidence)}
          </Badge>
        </div>

        {/* Proposed Changes */}
        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {hasWeight && (
            <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
              <Scale className="h-3 w-3" />
              {suggestion.suggestedWeight}g
            </span>
          )}
          {hasPrice && (
            <span className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded">
              <DollarSign className="h-3 w-3" />
              ${suggestion.suggestedPrice?.toFixed(2)}
            </span>
          )}
          {hasDescription && (
            <span
              className="inline-flex items-center gap-1 bg-muted/50 px-2 py-0.5 rounded max-w-full"
              title={suggestion.suggestedDescription ?? undefined}
            >
              <FileText className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">
                {truncateDescription(suggestion.suggestedDescription ?? '')}
              </span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            onClick={onAccept}
            disabled={disabled || isProcessing}
            className="h-8 text-xs"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Check className="h-3 w-3 mr-1" />
            )}
            {t('accept')}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onDismiss}
            disabled={disabled || isProcessing}
            className="h-8 text-xs"
          >
            {isProcessing ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <X className="h-3 w-3 mr-1" />
            )}
            {t('dismiss')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function EnrichmentProposalsModal({
  open,
  onOpenChange,
  onAllResolved,
}: EnrichmentProposalsModalProps) {
  const t = useTranslations('Notifications.enrichmentModal');
  const {
    suggestions,
    isLoading,
    pendingCount,
    processingId,
    isBulkProcessing,
    bulkProgress,
    acceptSuggestion,
    dismissSuggestion,
    acceptAll,
    dismissAll,
  } = useEnrichmentSuggestions();

  const [bulkAction, setBulkAction] = useState<'accept' | 'dismiss' | null>(null);
  const [currentItemName, setCurrentItemName] = useState<string>('');

  /**
   * Auto-cleanup stale notifications when modal is opened with no pending suggestions.
   * This handles the case where suggestions were dismissed previously but the
   * notification wasn't cleaned up (e.g., due to timing issues or a bug).
   */
  useEffect(() => {
    // Only run when modal is open, loading is complete, and there are no suggestions
    if (open && !isLoading && suggestions.length === 0 && pendingCount === 0) {
      // Trigger cleanup of any stale enrichment notifications
      onAllResolved?.();
    }
  }, [open, isLoading, suggestions.length, pendingCount, onAllResolved]);

  /**
   * Handle individual accept
   */
  const handleAccept = useCallback(
    async (id: string, itemName: string) => {
      const result = await acceptSuggestion(id);
      if (result.success) {
        toast.success(t('acceptSuccess', { item: itemName }));
      } else {
        toast.error(result.error ?? t('processFailed'));
      }

      // Check if all resolved
      if (pendingCount === 1 && result.success) {
        onAllResolved?.();
        onOpenChange(false);
      }
    },
    [acceptSuggestion, t, pendingCount, onAllResolved, onOpenChange]
  );

  /**
   * Handle individual dismiss
   */
  const handleDismiss = useCallback(
    async (id: string, itemName: string) => {
      const result = await dismissSuggestion(id);
      if (result.success) {
        toast.success(t('dismissSuccess', { item: itemName }));
      } else {
        toast.error(result.error ?? t('processFailed'));
      }

      // Check if all resolved
      if (pendingCount === 1 && result.success) {
        onAllResolved?.();
        onOpenChange(false);
      }
    },
    [dismissSuggestion, t, pendingCount, onAllResolved, onOpenChange]
  );

  /**
   * Handle bulk accept all
   */
  const handleAcceptAll = useCallback(async () => {
    setBulkAction('accept');
    const result = await acceptAll((current, total, itemName) => {
      setCurrentItemName(itemName);
    });

    if (result.failed === 0) {
      toast.success(t('allAccepted', { count: result.processed }));
    } else {
      toast.warning(
        `${result.processed} accepted, ${result.failed} failed`
      );
    }

    setBulkAction(null);
    setCurrentItemName('');

    // All resolved
    if (result.processed + result.failed === pendingCount) {
      onAllResolved?.();
      onOpenChange(false);
    }
  }, [acceptAll, t, pendingCount, onAllResolved, onOpenChange]);

  /**
   * Handle bulk dismiss all
   */
  const handleDismissAll = useCallback(async () => {
    setBulkAction('dismiss');
    const result = await dismissAll((current, total, itemName) => {
      setCurrentItemName(itemName);
    });

    if (result.failed === 0) {
      toast.success(t('allDismissed', { count: result.processed }));
    } else {
      toast.warning(
        `${result.processed} dismissed, ${result.failed} failed`
      );
    }

    setBulkAction(null);
    setCurrentItemName('');

    // All resolved
    if (result.processed + result.failed === pendingCount) {
      onAllResolved?.();
      onOpenChange(false);
    }
  }, [dismissAll, t, pendingCount, onAllResolved, onOpenChange]);

  /**
   * Handle close - prevent closing during bulk processing
   */
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (isBulkProcessing) return; // Prevent closing during bulk processing
      onOpenChange(newOpen);
    },
    [isBulkProcessing, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-forest-600" />
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {pendingCount > 0
              ? t('proposalCount', { count: pendingCount })
              : t('noProposals')}
          </DialogDescription>
        </DialogHeader>

        {/* Bulk Progress Indicator */}
        {isBulkProcessing && bulkProgress && (
          <div className="space-y-2 px-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {bulkAction === 'accept' ? (
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-forest-600" />
                    Accepting...
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                    Dismissing...
                  </span>
                )}
              </span>
              <span className="text-xs text-muted-foreground">
                {bulkProgress.current} / {bulkProgress.total}
              </span>
            </div>
            <Progress
              value={(bulkProgress.current / bulkProgress.total) * 100}
              className="h-2"
            />
            {currentItemName && (
              <p className="text-xs text-muted-foreground truncate">
                {currentItemName}
              </p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-h-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : suggestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-forest-500 mb-3" />
              <p className="text-muted-foreground">{t('noProposals')}</p>
            </div>
          ) : (
            <ScrollArea className="h-[350px] pr-4 -mr-4">
              <div className="space-y-3">
                {suggestions.map((suggestion) => (
                  <ProposalCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    isProcessing={processingId === suggestion.id}
                    onAccept={() =>
                      handleAccept(suggestion.id, suggestion.gearItemName)
                    }
                    onDismiss={() =>
                      handleDismiss(suggestion.id, suggestion.gearItemName)
                    }
                    disabled={isBulkProcessing || processingId !== null}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleAcceptAll}
              disabled={
                suggestions.length === 0 ||
                isBulkProcessing ||
                processingId !== null
              }
              className="flex-1 sm:flex-none"
            >
              {isBulkProcessing && bulkAction === 'accept' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {t('acceptAll')}
            </Button>
            <Button
              variant="outline"
              onClick={handleDismissAll}
              disabled={
                suggestions.length === 0 ||
                isBulkProcessing ||
                processingId !== null
              }
              className="flex-1 sm:flex-none"
            >
              {isBulkProcessing && bulkAction === 'dismiss' ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              {t('dismissAll')}
            </Button>
          </div>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isBulkProcessing}
          >
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
