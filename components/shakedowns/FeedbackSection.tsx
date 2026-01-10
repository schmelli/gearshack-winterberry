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
import { MessageSquare, Lock } from 'lucide-react';
import { toast } from 'sonner';

import type { FeedbackNode } from '@/types/shakedown';
import { useFeedback } from '@/hooks/shakedowns/useFeedback';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';
import { cn } from '@/lib/utils';

import { FeedbackItem } from './FeedbackItem';
import { FeedbackComposer } from './FeedbackComposer';
import { EditComposer } from './EditComposer';

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
// Helper Functions
// =============================================================================

function findFeedbackById(tree: FeedbackNode[], id: string): FeedbackNode | null {
  for (const node of tree) {
    if (node.id === id) return node;
    const found = findFeedbackById(node.children, id);
    if (found) return found;
  }
  return null;
}

function countNodes(nodes: FeedbackNode[]): number {
  return nodes.reduce((acc, node) => acc + 1 + countNodes(node.children), 0);
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
}: FeedbackSectionProps): React.ReactElement {
  const t = useTranslations('Shakedowns');
  const tActions = useTranslations('Shakedowns.actions');
  const { user } = useAuthContext();

  const { createFeedback, updateFeedback, deleteFeedback, isSubmitting } = useFeedback();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [helpfulVotingId, setHelpfulVotingId] = useState<string | null>(null);

  const totalFeedbackCount = useMemo(() => countNodes(feedbackTree), [feedbackTree]);
  const isShakedownOwner = useMemo(() => user?.uid === shakedownOwnerId, [user?.uid, shakedownOwnerId]);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleNewFeedback = useCallback(
    async (content: string) => {
      try {
        await createFeedback({ shakedownId, content });
        onFeedbackChange?.();
      } catch {
        // Error handled by hook
      }
    },
    [createFeedback, shakedownId, onFeedbackChange]
  );

  const handleReply = useCallback(
    async (content: string) => {
      if (!replyingTo) return;
      try {
        await createFeedback({ shakedownId, content, parentId: replyingTo });
        setReplyingTo(null);
        onFeedbackChange?.();
      } catch {
        // Error handled by hook
      }
    },
    [createFeedback, shakedownId, replyingTo, onFeedbackChange]
  );

  const handleSaveEdit = useCallback(
    async (content: string) => {
      if (!editingId) return;
      try {
        await updateFeedback(editingId, content);
        setEditingId(null);
        onFeedbackChange?.();
      } catch {
        // Error handled by hook
      }
    },
    [updateFeedback, editingId, onFeedbackChange]
  );

  const handleDelete = useCallback(
    async (feedbackId: string) => {
      try {
        await deleteFeedback(feedbackId);
        onFeedbackChange?.();
      } catch {
        // Error handled by hook
      }
    },
    [deleteFeedback, onFeedbackChange]
  );

  const handleMarkHelpful = useCallback(
    async (feedbackId: string) => {
      if (!user?.uid || !isShakedownOwner || helpfulVotingId) return;

      setHelpfulVotingId(feedbackId);
      try {
        const response = await fetch('/api/shakedowns/helpful', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ feedbackId }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));

          if (response.status === 400 && errorData.code === 'already_voted') {
            const deleteResponse = await fetch('/api/shakedowns/helpful', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
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

  const handleReport = useCallback(
    (feedbackId: string) => {
      console.log('Report feedback:', feedbackId);
      toast.info(tActions('reportComingSoon'));
    },
    [tActions]
  );

  // ==========================================================================
  // Recursive Render Function
  // ==========================================================================

  const renderFeedbackNode = useCallback(
    (node: FeedbackNode, depth: number = 0): React.ReactElement => {
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
        <h2 className="text-lg font-semibold">{t('feedback.title')}</h2>
        <span className="text-sm text-muted-foreground">
          {totalFeedbackCount === 0 ? t('feedback.noFeedback') : `(${totalFeedbackCount})`}
        </span>
      </div>

      {/* New Feedback Composer */}
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
        <div className="space-y-4">{feedbackTree.map((node) => renderFeedbackNode(node))}</div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <MessageSquare className="size-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">{t('feedback.noFeedback')}</h3>
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

export default FeedbackSection;
