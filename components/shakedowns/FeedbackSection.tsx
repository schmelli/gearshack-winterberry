/**
 * FeedbackSection Component
 *
 * Feature: 001-community-shakedowns
 * Task: T032
 *
 * Displays all feedback for a shakedown with a tree structure.
 * Includes a composer for new feedback and inline reply composers.
 * Handles edit/delete actions and helpful voting (shakedown owner only).
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MessageSquare, Send, X, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

import type { FeedbackNode } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

import { FeedbackItem } from '@/components/shakedowns/FeedbackItem';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
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

interface FeedbackSectionProps {
  /** The shakedown this feedback belongs to */
  shakedownId: string;
  /** Owner ID of the shakedown (for marking helpful) */
  shakedownOwnerId: string;
  /** Pre-built feedback tree from parent component */
  feedbackTree: FeedbackNode[];
  /** Whether the shakedown is still accepting feedback */
  isShakedownOpen: boolean;
  /** Callback when feedback changes (create/update/delete) */
  onFeedbackChange?: () => void;
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
// Helper: Find feedback node by ID in tree
// =============================================================================

function findFeedbackById(tree: FeedbackNode[], id: string): FeedbackNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findFeedbackById(node.children, id);
    if (found) return found;
  }
  return null;
}

// =============================================================================
// Composer Sub-component
// =============================================================================

interface FeedbackComposerProps {
  parentId?: string;
  placeholder: string;
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  isSubmitting: boolean;
  autoFocus?: boolean;
}

function FeedbackComposer({
  parentId,
  placeholder,
  onSubmit,
  onCancel,
  isSubmitting,
  autoFocus = false,
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
                  className="min-h-[100px] resize-y"
                  autoFocus={autoFocus}
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

          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                <X className="size-4 mr-1" />
                {t('feedback.cancel') || 'Cancel'}
              </Button>
            )}
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
                  {parentId ? t('feedback.reply') : t('feedback.add')}
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// =============================================================================
// Edit Composer Sub-component
// =============================================================================

interface EditComposerProps {
  initialContent: string;
  onSave: (content: string) => Promise<void>;
  onCancel: () => void;
  isSubmitting: boolean;
}

function EditComposer({
  initialContent,
  onSave,
  onCancel,
  isSubmitting,
}: EditComposerProps) {
  const t = useTranslations('Shakedowns');

  const form = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      content: initialContent,
    },
  });

  const content = form.watch('content');
  const charCount = content.length;

  const handleSubmit = async (data: FeedbackFormData) => {
    await onSave(data.content);
  };

  return (
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
                  className="min-h-[100px] resize-y"
                  autoFocus
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

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              <X className="size-4 mr-1" />
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || charCount === 0}
              className="gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FeedbackSection({
  shakedownId,
  shakedownOwnerId,
  feedbackTree,
  isShakedownOpen,
  onFeedbackChange,
}: FeedbackSectionProps) {
  const t = useTranslations('Shakedowns');
  const { user } = useAuthContext();

  // Feedback CRUD operations
  const { createFeedback, updateFeedback, deleteFeedback, isSubmitting } = useFeedback();

  // UI State
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [helpfulVotingId, setHelpfulVotingId] = useState<string | null>(null);

  // Memoized computed values
  const totalFeedbackCount = useMemo(() => {
    function countNodes(nodes: FeedbackNode[]): number {
      return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
    }
    return countNodes(feedbackTree);
  }, [feedbackTree]);

  const isShakedownOwner = useMemo(
    () => user?.uid === shakedownOwnerId,
    [user?.uid, shakedownOwnerId]
  );

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  /**
   * Submit new top-level feedback
   */
  const handleNewFeedback = useCallback(
    async (content: string) => {
      try {
        await createFeedback({
          shakedownId,
          content,
        });
        onFeedbackChange?.();
      } catch {
        // Error is handled by useFeedback hook (toast)
      }
    },
    [createFeedback, shakedownId, onFeedbackChange]
  );

  /**
   * Submit reply to existing feedback
   */
  const handleReply = useCallback(
    async (content: string) => {
      if (!replyingTo) return;

      try {
        await createFeedback({
          shakedownId,
          content,
          parentId: replyingTo,
        });
        setReplyingTo(null);
        onFeedbackChange?.();
      } catch {
        // Error is handled by useFeedback hook (toast)
      }
    },
    [createFeedback, shakedownId, replyingTo, onFeedbackChange]
  );

  /**
   * Save edited feedback
   */
  const handleSaveEdit = useCallback(
    async (content: string) => {
      if (!editingId) return;

      try {
        await updateFeedback(editingId, content);
        setEditingId(null);
        onFeedbackChange?.();
      } catch {
        // Error is handled by useFeedback hook (toast)
      }
    },
    [updateFeedback, editingId, onFeedbackChange]
  );

  /**
   * Delete feedback
   */
  const handleDelete = useCallback(
    async (feedbackId: string) => {
      try {
        await deleteFeedback(feedbackId);
        onFeedbackChange?.();
      } catch {
        // Error is handled by useFeedback hook (toast)
      }
    },
    [deleteFeedback, onFeedbackChange]
  );

  /**
   * Mark feedback as helpful (shakedown owner only)
   * Inline implementation since useHelpfulVotes hook is not yet implemented
   */
  const handleMarkHelpful = useCallback(
    async (feedbackId: string) => {
      // Guard against double-clicking or if already voting
      if (!user?.uid || !isShakedownOwner || helpfulVotingId) return;

      setHelpfulVotingId(feedbackId);

      try {
        const response = await fetch('/api/shakedowns/helpful', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ feedbackId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 400 && errorData.code === 'already_voted') {
            // Toggle: remove the vote
            const deleteResponse = await fetch('/api/shakedowns/helpful', {
              method: 'DELETE',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ feedbackId }),
            });

            if (deleteResponse.ok) {
              toast.success(t('success.helpfulRemoved'));
              onFeedbackChange?.();
            } else {
              throw new Error('Failed to remove helpful vote');
            }
          } else {
            throw new Error(errorData.error ?? 'Failed to mark as helpful');
          }
        } else {
          const data = await response.json();
          toast.success(t('success.helpfulAdded'));

          // Check if a badge was awarded
          if (data.badgeAwarded) {
            toast.success(t('badges.newBadge'));
          }

          onFeedbackChange?.();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to mark as helpful';
        toast.error(message);
      } finally {
        setHelpfulVotingId(null);
      }
    },
    [user?.uid, isShakedownOwner, helpfulVotingId, onFeedbackChange, t]
  );

  /**
   * Report feedback (placeholder - would open a modal in full implementation)
   */
  const handleReport = useCallback((feedbackId: string) => {
    // TODO: Implement report modal in separate task
    console.log('Report feedback:', feedbackId);
    toast.info('Report functionality coming soon');
  }, []);

  // ==========================================================================
  // Recursive Render Function
  // ==========================================================================

  /**
   * Renders a feedback node with potential inline reply/edit composers
   */
  const renderFeedbackNode = useCallback(
    (node: FeedbackNode, depth: number = 0) => {
      const isEditing = editingId === node.id;
      const isReplying = replyingTo === node.id;
      const parentNode = replyingTo ? findFeedbackById(feedbackTree, replyingTo) : null;

      if (isEditing) {
        return (
          <div key={node.id} className="space-y-3">
            <div
              className={cn(
                'rounded-lg bg-muted/50 p-4',
                depth > 0 && 'ml-4 border-l-2 border-l-forest-500 pl-4'
              )}
            >
              <EditComposer
                initialContent={node.content}
                onSave={handleSaveEdit}
                onCancel={() => setEditingId(null)}
                isSubmitting={isSubmitting}
              />
            </div>

            {/* Render children even when editing */}
            {node.children.length > 0 && (
              <div className="space-y-3">
                {node.children.map((child) => renderFeedbackNode(child, depth + 1))}
              </div>
            )}
          </div>
        );
      }

      return (
        <div key={node.id} className="space-y-3">
          <FeedbackItem
            feedback={node}
            depth={depth}
            shakedownOwnerId={shakedownOwnerId}
            onReply={isShakedownOpen ? (id) => setReplyingTo(id) : undefined}
            onEdit={(id) => setEditingId(id)}
            onDelete={handleDelete}
            onReport={handleReport}
            onMarkHelpful={isShakedownOwner ? handleMarkHelpful : undefined}
          />

          {/* Inline reply composer */}
          {isReplying && parentNode && (
            <div className="ml-8 rounded-lg bg-muted/50 p-4">
              <p className="text-sm text-muted-foreground mb-3">
                {t('feedback.replyTo', { author: parentNode.authorName })}
              </p>
              <FeedbackComposer
                parentId={replyingTo}
                placeholder={t('feedback.addPlaceholder')}
                onSubmit={handleReply}
                onCancel={() => setReplyingTo(null)}
                isSubmitting={isSubmitting}
                autoFocus
              />
            </div>
          )}
        </div>
      );
    },
    [
      editingId,
      replyingTo,
      feedbackTree,
      shakedownOwnerId,
      isShakedownOpen,
      isShakedownOwner,
      isSubmitting,
      handleSaveEdit,
      handleDelete,
      handleReport,
      handleMarkHelpful,
      handleReply,
      t,
    ]
  );

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <section className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-forest-600 dark:text-forest-400" />
        <h2 className="text-lg font-semibold">
          {t('feedback.title')}
        </h2>
        <span className="text-sm text-muted-foreground">
          {totalFeedbackCount === 0
            ? t('feedback.noFeedback')
            : `(${totalFeedbackCount})`}
        </span>
      </div>

      {/* New Feedback Composer (only if open and user is logged in) */}
      {isShakedownOpen && user && (
        <div className="rounded-lg border border-border bg-card p-4">
          <FeedbackComposer
            placeholder={t('feedback.addPlaceholder')}
            onSubmit={handleNewFeedback}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {/* Feedback Tree */}
      {totalFeedbackCount > 0 ? (
        <div className="space-y-4">
          {feedbackTree.map((node) => renderFeedbackNode(node))}
        </div>
      ) : (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">
            {t('feedback.noFeedback')}
          </h3>
          <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
            {t('feedback.noFeedbackDescription')}
          </p>
        </div>
      )}

      {/* Shakedown Closed Notice */}
      {!isShakedownOpen && (
        <div className="rounded-lg bg-muted p-4 text-center text-sm text-muted-foreground">
          <Lock className="mx-auto mb-2 size-5" />
          <p>{t('feedback.closed')}</p>
        </div>
      )}
    </section>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default FeedbackSection;
