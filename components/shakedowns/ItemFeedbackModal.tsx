/**
 * ItemFeedbackModal Component
 *
 * Feature: 001-community-shakedowns
 * Task: T039
 *
 * Modal for viewing and adding feedback specific to a gear item.
 * Uses Dialog on desktop and Sheet on mobile for optimal UX.
 * Displays item details and existing feedback, with composer for new feedback.
 *
 * Orchestrates extracted sub-components:
 * - ItemFeedbackHeader (gear item info display)
 * - ItemFeedbackComposer (feedback form with validation)
 * - ItemFeedbackList (threaded feedback display with replies)
 */

'use client';

import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

import type { FeedbackNode } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { useMediaQuery } from '@/hooks/useGearDetailModal';

import { ItemFeedbackHeader } from '@/components/shakedowns/ItemFeedbackHeader';
import type { GearItemInfo } from '@/components/shakedowns/ItemFeedbackHeader';
import { ItemFeedbackComposer } from '@/components/shakedowns/ItemFeedbackComposer';
import { ItemFeedbackList } from '@/components/shakedowns/ItemFeedbackList';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

// =============================================================================
// Types
// =============================================================================

interface ItemFeedbackModalProps {
  /** Whether the modal is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** ID of the shakedown this feedback belongs to */
  shakedownId: string;
  /** Owner ID of the shakedown (for marking helpful) */
  shakedownOwnerId: string;
  /** The gear item being reviewed */
  gearItem: GearItemInfo;
  /** Existing feedback for this item */
  existingFeedback: FeedbackNode[];
  /** Whether the shakedown is still accepting feedback */
  isShakedownOpen: boolean;
  /** Callback when feedback is added (to refresh parent) */
  onFeedbackAdded?: () => void;
}

// =============================================================================
// Modal Content (shared between Dialog and Sheet)
// =============================================================================

interface ModalContentProps {
  gearItem: GearItemInfo;
  existingFeedback: FeedbackNode[];
  shakedownId: string;
  shakedownOwnerId: string;
  isShakedownOpen: boolean;
  onFeedbackAdded?: () => void;
}

function ModalContent({
  gearItem,
  existingFeedback,
  shakedownId,
  shakedownOwnerId,
  isShakedownOpen,
  onFeedbackAdded,
}: ModalContentProps) {
  const t = useTranslations('Shakedowns');
  const { createFeedback, isSubmitting } = useFeedback();

  // Handle new top-level feedback submission
  const handleSubmitFeedback = useCallback(
    async (content: string) => {
      try {
        await createFeedback({
          shakedownId,
          content,
          gearItemId: gearItem.id,
        });
        onFeedbackAdded?.();
      } catch {
        // Error handled by useFeedback hook
      }
    },
    [createFeedback, shakedownId, gearItem.id, onFeedbackAdded]
  );

  return (
    <div className="flex flex-col h-full">
      {/* Item Header */}
      <ItemFeedbackHeader gearItem={gearItem} />

      {/* Feedback List (scrollable) */}
      <ScrollArea className="flex-1 py-4 -mx-1 px-1">
        <ItemFeedbackList
          feedbackTree={existingFeedback}
          shakedownId={shakedownId}
          shakedownOwnerId={shakedownOwnerId}
          isShakedownOpen={isShakedownOpen}
          onFeedbackChange={onFeedbackAdded}
        />
      </ScrollArea>

      {/* Composer (if open) */}
      {isShakedownOpen && (
        <ItemFeedbackComposer
          placeholder={t('feedback.addItemFeedback')}
          onSubmit={handleSubmitFeedback}
          isSubmitting={isSubmitting}
        />
      )}

      {/* Closed notice */}
      {!isShakedownOpen && existingFeedback.length > 0 && (
        <div className="border-t border-border pt-4 mt-4 text-center text-sm text-muted-foreground">
          This shakedown is no longer accepting new feedback.
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function ItemFeedbackModal({
  open,
  onOpenChange,
  shakedownId,
  shakedownOwnerId,
  gearItem,
  existingFeedback,
  isShakedownOpen,
  onFeedbackAdded,
}: ItemFeedbackModalProps) {
  const t = useTranslations('Shakedowns');

  // Responsive detection: mobile < 768px
  const isMobile = useMediaQuery('(max-width: 767px)');

  // Dialog title with item name
  const dialogTitle = t('feedback.itemSpecific', { itemName: gearItem.name });

  // Mobile: Sheet sliding from bottom
  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="h-[85vh] rounded-t-2xl flex flex-col"
        >
          <SheetHeader className="shrink-0 pb-4">
            <SheetTitle className="text-left">{dialogTitle}</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-hidden">
            <ModalContent
              gearItem={gearItem}
              existingFeedback={existingFeedback}
              shakedownId={shakedownId}
              shakedownOwnerId={shakedownOwnerId}
              isShakedownOpen={isShakedownOpen}
              onFeedbackAdded={onFeedbackAdded}
            />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: Centered Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden min-h-0">
          <ModalContent
            gearItem={gearItem}
            existingFeedback={existingFeedback}
            shakedownId={shakedownId}
            shakedownOwnerId={shakedownOwnerId}
            isShakedownOpen={isShakedownOpen}
            onFeedbackAdded={onFeedbackAdded}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default ItemFeedbackModal;
