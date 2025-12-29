/**
 * CompletionModal Component
 *
 * Feature: 001-community-shakedowns
 * Task: T053
 *
 * Modal for completing a shakedown and thanking helpful reviewers.
 * Allows the owner to select which feedback was most helpful before
 * closing the shakedown to new feedback.
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2, Loader2, ThumbsUp, Package } from 'lucide-react';

import type { FeedbackWithAuthor } from '@/types/shakedown';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface CompletionModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** ID of the shakedown being completed */
  shakedownId: string;
  /** All feedback to choose from */
  feedbackList: FeedbackWithAuthor[];
  /** Callback when completing with selected helpful feedback IDs */
  onComplete: (helpfulFeedbackIds: string[]) => Promise<void>;
  /** Whether the completion is in progress */
  isCompleting: boolean;
  /** Optional: Feedback IDs already marked as helpful by the current user */
  userHelpfulVotes?: Set<string>;
}

interface GroupedFeedback {
  general: FeedbackWithAuthor[];
  itemSpecific: Map<string, FeedbackWithAuthor[]>;
}

// =============================================================================
// Helper Functions
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/**
 * Truncates content to specified number of lines worth of characters
 * Approximates ~80 chars per line for 2-3 line preview
 */
function truncateContent(content: string, maxChars: number = 180): string {
  if (content.length <= maxChars) {
    return content;
  }

  // Find the last space before maxChars to avoid cutting words
  const truncated = content.slice(0, maxChars);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxChars * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Groups feedback into general and item-specific categories
 */
function groupFeedback(feedbackList: FeedbackWithAuthor[]): GroupedFeedback {
  const general: FeedbackWithAuthor[] = [];
  const itemSpecific = new Map<string, FeedbackWithAuthor[]>();

  for (const feedback of feedbackList) {
    if (feedback.gearItemId && feedback.gearItemName) {
      const existing = itemSpecific.get(feedback.gearItemName) || [];
      existing.push(feedback);
      itemSpecific.set(feedback.gearItemName, existing);
    } else {
      general.push(feedback);
    }
  }

  return { general, itemSpecific };
}

// =============================================================================
// FeedbackCheckboxItem Sub-component
// =============================================================================

interface FeedbackCheckboxItemProps {
  feedback: FeedbackWithAuthor;
  isSelected: boolean;
  onToggle: () => void;
  disabled: boolean;
}

function FeedbackCheckboxItem({
  feedback,
  isSelected,
  onToggle,
  disabled,
}: FeedbackCheckboxItemProps) {
  return (
    <div
      className={cn(
        'flex items-start gap-3 p-3 rounded-lg border transition-colors',
        isSelected
          ? 'border-forest-500/50 bg-forest-50/50 dark:border-forest-400/50 dark:bg-forest-900/20'
          : 'border-border bg-background hover:border-muted-foreground/30'
      )}
    >
      <Checkbox
        id={`feedback-${feedback.id}`}
        checked={isSelected}
        onCheckedChange={onToggle}
        disabled={disabled}
        className="mt-0.5"
      />

      <label
        htmlFor={`feedback-${feedback.id}`}
        className="flex-1 min-w-0 cursor-pointer"
      >
        {/* Author info */}
        <div className="flex items-center gap-2 mb-1">
          <Avatar className="size-5">
            {feedback.authorAvatar ? (
              <AvatarImage src={feedback.authorAvatar} alt={feedback.authorName} />
            ) : null}
            <AvatarFallback className="text-[10px]">
              {getInitials(feedback.authorName)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground truncate">
            {feedback.authorName}
          </span>

          {/* Helpful count if any */}
          {feedback.helpfulCount > 0 && (
            <Badge
              variant="secondary"
              className="gap-1 text-[10px] px-1.5 py-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
            >
              <ThumbsUp className="size-2.5" />
              {feedback.helpfulCount}
            </Badge>
          )}
        </div>

        {/* Content preview (2-3 lines max) */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {truncateContent(feedback.content)}
        </p>
      </label>
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function CompletionModal({
  open,
  onOpenChange,
  // shakedownId is available in props for future thank you note feature
  feedbackList,
  onComplete,
  isCompleting,
  userHelpfulVotes,
}: CompletionModalProps) {
  const t = useTranslations('Shakedowns');

  // Selected feedback IDs (pre-populated with existing helpful votes)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    return new Set(userHelpfulVotes || []);
  });

  // Thank you note (optional, for future use)
  const [thankYouNote, setThankYouNote] = useState('');

  // Group feedback by general vs item-specific
  const groupedFeedback = useMemo(
    () => groupFeedback(feedbackList),
    [feedbackList]
  );

  // Total feedback count
  const totalFeedbackCount = feedbackList.length;

  // Toggle selection of a feedback item
  const handleToggle = (feedbackId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(feedbackId)) {
        next.delete(feedbackId);
      } else {
        next.add(feedbackId);
      }
      return next;
    });
  };

  // Handle form submission
  const handleSubmit = async () => {
    await onComplete(Array.from(selectedIds));
    // Modal will be closed by parent on success
  };

  // Handle dialog close - reset state
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset state when closing
      setSelectedIds(new Set(userHelpfulVotes || []));
      setThankYouNote('');
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="size-5 text-forest-600 dark:text-forest-400" />
            {t('completion.title')}
          </DialogTitle>
          <DialogDescription>
            {t('completion.description')}
          </DialogDescription>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 min-h-0 space-y-4">
          {/* Feedback selection section */}
          {totalFeedbackCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                {t('completion.selectHelpful')}
              </p>

              <ScrollArea className="h-[280px] pr-4 -mr-4">
                <div className="space-y-4">
                  {/* General feedback */}
                  {groupedFeedback.general.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        General Feedback
                      </h4>
                      <div className="space-y-2">
                        {groupedFeedback.general.map((feedback) => (
                          <FeedbackCheckboxItem
                            key={feedback.id}
                            feedback={feedback}
                            isSelected={selectedIds.has(feedback.id)}
                            onToggle={() => handleToggle(feedback.id)}
                            disabled={isCompleting}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Item-specific feedback grouped by gear item */}
                  {groupedFeedback.itemSpecific.size > 0 && (
                    <div className="space-y-3">
                      {Array.from(groupedFeedback.itemSpecific.entries()).map(
                        ([itemName, itemFeedback]) => (
                          <div key={itemName} className="space-y-2">
                            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Package className="size-3" />
                              {itemName}
                            </h4>
                            <div className="space-y-2">
                              {itemFeedback.map((feedback) => (
                                <FeedbackCheckboxItem
                                  key={feedback.id}
                                  feedback={feedback}
                                  isSelected={selectedIds.has(feedback.id)}
                                  onToggle={() => handleToggle(feedback.id)}
                                  disabled={isCompleting}
                                />
                              ))}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* No feedback state */}
          {totalFeedbackCount === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="size-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground">
                No feedback to review yet.
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                You can still complete the shakedown to close it.
              </p>
            </div>
          )}

          {/* Thank you note (optional) */}
          <div className="space-y-2">
            <label
              htmlFor="thankYouNote"
              className="text-sm font-medium text-foreground"
            >
              {t('completion.thankYouNote')}
            </label>
            <Textarea
              id="thankYouNote"
              value={thankYouNote}
              onChange={(e) => setThankYouNote(e.target.value)}
              placeholder={t('completion.thankYouPlaceholder')}
              className="min-h-[60px] resize-y"
              disabled={isCompleting}
            />
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="shrink-0 gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isCompleting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCompleting}
            className="gap-2 bg-forest-600 hover:bg-forest-700 text-white"
          >
            {isCompleting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Completing...
              </>
            ) : (
              <>
                <CheckCircle2 className="size-4" />
                {t('completion.confirm')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default CompletionModal;
