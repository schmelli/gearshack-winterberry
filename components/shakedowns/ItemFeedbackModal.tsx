/**
 * ItemFeedbackModal Component
 *
 * Feature: 001-community-shakedowns
 * Task: T039
 *
 * Modal for viewing and adding feedback specific to a gear item.
 * Uses Dialog on desktop and Sheet on mobile for optimal UX.
 * Displays item details and existing feedback, with composer for new feedback.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Package, Send, Loader2, X, Scale } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { useMediaQuery } from '@/hooks/useGearDetailModal';

import { FeedbackItem } from '@/components/shakedowns/FeedbackItem';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface GearItemInfo {
  id: string;
  name: string;
  brand?: string | null;
  category?: string | null;
  weight?: number | null;
  imageUrl?: string | null;
}

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
// Validation Schema
// =============================================================================

const feedbackSchema = z.object({
  content: z
    .string()
    .min(1, 'Feedback cannot be empty')
    .max(SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH, 'Feedback is too long'),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

// =============================================================================
// Helper Functions
// =============================================================================

function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined) {
    return '--';
  }

  if (grams >= 1000) {
    return `${(grams / 1000).toFixed(2)} kg`;
  }
  return `${grams} g`;
}

// =============================================================================
// Item Header Sub-component
// =============================================================================

interface ItemHeaderProps {
  gearItem: GearItemInfo;
}

function ItemHeader({ gearItem }: ItemHeaderProps) {
  return (
    <div className="flex items-start gap-4 pb-4 border-b border-border">
      {/* Item Image */}
      <Avatar className="size-16 rounded-lg shrink-0">
        {gearItem.imageUrl ? (
          <AvatarImage
            src={gearItem.imageUrl}
            alt={gearItem.name}
            className="object-cover"
          />
        ) : null}
        <AvatarFallback className="rounded-lg bg-muted text-muted-foreground">
          <Package className="size-6" />
        </AvatarFallback>
      </Avatar>

      {/* Item Details */}
      <div className="flex-1 min-w-0 space-y-1">
        <h3 className="font-semibold text-foreground truncate">
          {gearItem.name}
        </h3>
        {gearItem.brand && (
          <p className="text-sm text-muted-foreground truncate">
            {gearItem.brand}
          </p>
        )}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {gearItem.category && (
            <span className="truncate">
              {gearItem.category}
            </span>
          )}
          {gearItem.weight !== null && gearItem.weight !== undefined && (
            <span className="flex items-center gap-1 shrink-0">
              <Scale className="size-3" />
              {formatWeight(gearItem.weight)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Feedback Composer Sub-component
// =============================================================================

interface FeedbackComposerProps {
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
}

function FeedbackComposer({
  placeholder,
  onSubmit,
  isSubmitting,
}: FeedbackComposerProps) {
  const t = useTranslations('Shakedowns');

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      content: '',
    },
  });

  const content = form.watch('content');
  const charCount = content.length;

  const handleSubmit = async (data: FeedbackFormData) => {
    await onSubmit(data.content);
    form.reset();
  };

  return (
    <div className="border-t border-border pt-4 mt-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
          <FormField
            control={form.control}
            name="content"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={placeholder}
                    className="min-h-[80px] resize-y"
                    disabled={isSubmitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex items-center justify-between gap-2">
            <span
              className={cn(
                'text-xs text-muted-foreground',
                charCount > SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH && 'text-destructive'
              )}
            >
              {t('feedback.characterCount', {
                count: charCount,
                max: SHAKEDOWN_CONSTANTS.MAX_CONTENT_LENGTH,
              })}
            </span>

            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || charCount === 0}
              className="gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  {t('feedback.submitting')}
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  {t('feedback.add')}
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

// =============================================================================
// Feedback List Sub-component
// =============================================================================

interface FeedbackListProps {
  feedbackTree: FeedbackNode[];
  shakedownId: string;
  shakedownOwnerId: string;
  isShakedownOpen: boolean;
  onFeedbackChange?: () => void;
}

function FeedbackList({
  feedbackTree,
  shakedownId,
  shakedownOwnerId,
  isShakedownOpen,
  onFeedbackChange,
}: FeedbackListProps) {
  const t = useTranslations('Shakedowns');
  const { createFeedback, deleteFeedback, isSubmitting } = useFeedback();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);

  // Handle reply submission
  const handleReply = useCallback(
    async (content: string, parentId: string) => {
      try {
        await createFeedback({
          shakedownId,
          content,
          parentId,
        });
        setReplyingTo(null);
        onFeedbackChange?.();
      } catch {
        // Error handled by useFeedback hook
      }
    },
    [createFeedback, shakedownId, onFeedbackChange]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (feedbackId: string) => {
      try {
        await deleteFeedback(feedbackId);
        onFeedbackChange?.();
      } catch {
        // Error handled by useFeedback hook
      }
    },
    [deleteFeedback, onFeedbackChange]
  );

  // Empty state
  if (feedbackTree.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Package className="size-10 text-muted-foreground/30 mb-3" />
        <p className="text-sm text-muted-foreground">
          {t('feedback.noFeedback')}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Be the first to provide feedback on this item!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {feedbackTree.map((node) => (
        <div key={node.id} className="space-y-3">
          <FeedbackItem
            feedback={node}
            depth={0}
            shakedownOwnerId={shakedownOwnerId}
            onReply={isShakedownOpen ? (id) => setReplyingTo(id) : undefined}
            onDelete={handleDelete}
          />

          {/* Inline reply composer */}
          {replyingTo === node.id && (
            <div className="ml-8 rounded-lg bg-muted/50 p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">
                  {t('feedback.replyTo', { author: node.authorName })}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setReplyingTo(null)}
                >
                  <X className="size-4" />
                </Button>
              </div>
              <ReplyComposer
                onSubmit={(content) => handleReply(content, node.id)}
                isSubmitting={isSubmitting}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Reply Composer (simplified inline version)
// =============================================================================

interface ReplyComposerProps {
  onSubmit: (content: string) => Promise<void>;
  isSubmitting: boolean;
}

function ReplyComposer({ onSubmit, isSubmitting }: ReplyComposerProps) {
  const t = useTranslations('Shakedowns');
  const [content, setContent] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (content.trim()) {
      await onSubmit(content);
      setContent('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={t('feedback.addPlaceholder')}
        className="min-h-[60px] resize-y"
        disabled={isSubmitting}
        autoFocus
      />
      <div className="flex justify-end">
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting || !content.trim()}
          className="gap-1"
        >
          {isSubmitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          {t('feedback.reply')}
        </Button>
      </div>
    </form>
  );
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
      <ItemHeader gearItem={gearItem} />

      {/* Feedback List (scrollable) */}
      <ScrollArea className="flex-1 py-4 -mx-1 px-1">
        <FeedbackList
          feedbackTree={existingFeedback}
          shakedownId={shakedownId}
          shakedownOwnerId={shakedownOwnerId}
          isShakedownOpen={isShakedownOpen}
          onFeedbackChange={onFeedbackAdded}
        />
      </ScrollArea>

      {/* Composer (if open) */}
      {isShakedownOpen && (
        <FeedbackComposer
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
