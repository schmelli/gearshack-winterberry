/**
 * ItemFeedbackList Component
 *
 * Extracted from ItemFeedbackModal.tsx
 * Renders the list of feedback items with reply capability.
 * Includes the inline ReplyComposer for threaded replies.
 */

'use client';

import { useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { Package, Send, Loader2, X } from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { FeedbackItem } from '@/components/shakedowns/FeedbackItem';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

// =============================================================================
// Types
// =============================================================================

interface ItemFeedbackListProps {
  /** Tree of feedback nodes to display */
  feedbackTree: FeedbackNode[];
  /** ID of the shakedown this feedback belongs to */
  shakedownId: string;
  /** Owner ID of the shakedown (for marking helpful) */
  shakedownOwnerId: string;
  /** Whether the shakedown is still accepting feedback */
  isShakedownOpen: boolean;
  /** Callback when feedback changes (to refresh parent) */
  onFeedbackChange?: () => void;
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
// Component
// =============================================================================

export function ItemFeedbackList({
  feedbackTree,
  shakedownId,
  shakedownOwnerId,
  isShakedownOpen,
  onFeedbackChange,
}: ItemFeedbackListProps) {
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
