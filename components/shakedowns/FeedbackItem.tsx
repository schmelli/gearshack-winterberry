/**
 * FeedbackItem Component
 *
 * Feature: 001-community-shakedowns
 * Task: T031
 *
 * Displays a single feedback entry with author info.
 * Supports nested replies rendered recursively with visual depth indication.
 */

'use client';

import { useState, useMemo } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Reply,
  Edit,
  Trash2,
  Flag,
  ThumbsUp,
  MoreHorizontal,
  Package,
} from 'lucide-react';

import type { FeedbackNode } from '@/types/shakedown';
import { SHAKEDOWN_CONSTANTS } from '@/types/shakedown';
import { canEditFeedback, getRemainingEditMinutes } from '@/lib/shakedown-utils';
import { useAuthContext } from '@/components/auth/SupabaseAuthProvider';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface FeedbackItemProps {
  /** Feedback node with nested children */
  feedback: FeedbackNode;
  /** Current nesting depth (default 0) */
  depth?: number;
  /** Maximum nesting level (default 3) */
  maxDepth?: number;
  /** Owner ID of the shakedown (for marking helpful) */
  shakedownOwnerId: string;
  /** Called when user clicks reply */
  onReply?: (parentId: string) => void;
  /** Called when user clicks edit */
  onEdit?: (feedbackId: string) => void;
  /** Called when user confirms delete */
  onDelete?: (feedbackId: string) => void;
  /** Called when user clicks report */
  onReport?: (feedbackId: string) => void;
  /** Called when owner marks feedback as helpful */
  onMarkHelpful?: (feedbackId: string) => void;
}

// =============================================================================
// Depth Styling Configuration
// =============================================================================

/**
 * Border colors for visual depth indication:
 * - Depth 0: No border (top-level feedback)
 * - Depth 1: Forest green (greenish)
 * - Depth 2: Terracotta (orangish)
 * - Depth 3: Stone (grayish)
 */
const DEPTH_BORDER_COLORS: Record<number, string> = {
  1: 'border-l-forest-500/50 dark:border-l-forest-400/50',
  2: 'border-l-terracotta-500/50 dark:border-l-terracotta-400/50',
  3: 'border-l-stone-400/50 dark:border-l-stone-500/50',
};

const getDepthBorderColor = (depth: number): string => {
  if (depth === 0) return '';
  return DEPTH_BORDER_COLORS[depth] ?? DEPTH_BORDER_COLORS[3];
};

// =============================================================================
// Relative Time Formatting
// =============================================================================

function formatRelativeTime(dateString: string, locale: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  // Use Intl.RelativeTimeFormat when available
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffSeconds < 60) {
    return rtf.format(-diffSeconds, 'second');
  } else if (diffMinutes < 60) {
    return rtf.format(-diffMinutes, 'minute');
  } else if (diffHours < 24) {
    return rtf.format(-diffHours, 'hour');
  } else if (diffDays < 7) {
    return rtf.format(-diffDays, 'day');
  } else if (diffDays < 30) {
    return rtf.format(-Math.floor(diffDays / 7), 'week');
  } else if (diffDays < 365) {
    return rtf.format(-Math.floor(diffDays / 30), 'month');
  } else {
    return rtf.format(-Math.floor(diffDays / 365), 'year');
  }
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

// =============================================================================
// Component
// =============================================================================

export function FeedbackItem({
  feedback,
  depth = 0,
  maxDepth = SHAKEDOWN_CONSTANTS.MAX_REPLY_DEPTH,
  shakedownOwnerId,
  onReply,
  onEdit,
  onDelete,
  onReport,
  onMarkHelpful,
}: FeedbackItemProps) {
  const t = useTranslations('Shakedowns');
  const locale = useLocale();
  const { user } = useAuthContext();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Memoized computed values
  const isAuthor = useMemo(
    () => user?.uid === feedback.authorId,
    [user?.uid, feedback.authorId]
  );

  const isShakedownOwner = useMemo(
    () => user?.uid === shakedownOwnerId,
    [user?.uid, shakedownOwnerId]
  );

  const canEdit = useMemo(
    () => isAuthor && canEditFeedback(feedback.createdAt),
    [isAuthor, feedback.createdAt]
  );

  const remainingEditMinutes = useMemo(
    () => (canEdit ? getRemainingEditMinutes(feedback.createdAt) : 0),
    [canEdit, feedback.createdAt]
  );

  const canReply = useMemo(
    () => depth < maxDepth - 1, // depth is 0-indexed, maxDepth is 3
    [depth, maxDepth]
  );

  const relativeTime = useMemo(
    () => formatRelativeTime(feedback.createdAt, locale),
    [feedback.createdAt, locale]
  );

  // Event handlers
  const handleReply = () => {
    if (onReply) {
      onReply(feedback.id);
    }
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(feedback.id);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (onDelete) {
      setIsDeleting(true);
      try {
        await onDelete(feedback.id);
      } finally {
        setIsDeleting(false);
        setDeleteDialogOpen(false);
      }
    }
  };

  const handleReport = () => {
    if (onReport) {
      onReport(feedback.id);
    }
  };

  const handleMarkHelpful = () => {
    if (onMarkHelpful) {
      onMarkHelpful(feedback.id);
    }
  };

  return (
    <div className="space-y-3">
      {/* Main feedback container */}
      <div
        className={cn(
          'relative rounded-lg bg-background',
          depth > 0 && 'ml-4 border-l-2 pl-4',
          depth > 0 && getDepthBorderColor(depth)
        )}
      >
        {/* Header: Author info + timestamp */}
        <div className="flex items-start gap-3">
          <Avatar className="size-8 shrink-0">
            {feedback.authorAvatar ? (
              <AvatarImage src={feedback.authorAvatar} alt={feedback.authorName} />
            ) : null}
            <AvatarFallback className="text-xs">
              {getInitials(feedback.authorName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            {/* Author name, badges, and timestamp */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-medium text-sm text-foreground">
                {feedback.authorName}
              </span>
              {feedback.authorReputation >= 100 && (
                <Badge
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0"
                >
                  Expert
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {relativeTime}
              </span>
              {feedback.isEdited && (
                <span className="text-xs text-muted-foreground italic">
                  ({t('feedback.edit')}ed)
                </span>
              )}
            </div>

            {/* Gear item reference badge */}
            {feedback.gearItemName && (
              <div className="mt-1">
                <Badge
                  variant="outline"
                  className="text-xs gap-1 text-forest-700 dark:text-forest-300 border-forest-300 dark:border-forest-700"
                >
                  <Package className="size-3" />
                  {feedback.gearItemName}
                </Badge>
              </div>
            )}

            {/* Content */}
            <div className="mt-2 text-sm text-foreground leading-relaxed whitespace-pre-wrap break-words">
              {feedback.content}
            </div>

            {/* Helpful indicator and actions */}
            <div className="mt-3 flex items-center gap-2 flex-wrap">
              {/* Helpful count badge */}
              {feedback.helpfulCount > 0 && (
                <Badge
                  variant="secondary"
                  className="gap-1 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  <ThumbsUp className="size-3" />
                  {feedback.helpfulCount}
                </Badge>
              )}

              {/* Shakedown owner can mark as helpful */}
              {isShakedownOwner && !isAuthor && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground hover:text-amber-600"
                  onClick={handleMarkHelpful}
                >
                  <ThumbsUp className="size-3" />
                  {t('feedback.markHelpful')}
                </Button>
              )}

              {/* Reply button - hidden when shakedown closed or at max depth */}
              {user && onReply && canReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={handleReply}
                >
                  <Reply className="size-3" />
                  {t('feedback.reply')}
                </Button>
              )}
              {user && onReply && !canReply && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-muted-foreground/50 cursor-not-allowed"
                      disabled
                    >
                      <Reply className="size-3" />
                      {t('feedback.reply')}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t('feedback.maxDepthReached')}
                  </TooltipContent>
                </Tooltip>
              )}

              {/* Author actions: Edit with remaining time */}
              {canEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs text-muted-foreground"
                  onClick={handleEdit}
                >
                  <Edit className="size-3" />
                  {t('feedback.edit')}
                  {remainingEditMinutes > 0 && (
                    <span className="text-muted-foreground/70">
                      ({remainingEditMinutes}m)
                    </span>
                  )}
                </Button>
              )}

              {/* Overflow menu for additional actions */}
              {user && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      aria-label="More actions"
                    >
                      <MoreHorizontal className="size-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {/* Author-only: Delete */}
                    {isAuthor && (
                      <>
                        <DropdownMenuItem
                          onClick={handleDeleteClick}
                          variant="destructive"
                        >
                          <Trash2 className="size-4" />
                          {t('feedback.delete')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    {/* Non-author: Report */}
                    {!isAuthor && (
                      <DropdownMenuItem onClick={handleReport}>
                        <Flag className="size-4" />
                        {t('feedback.report')}
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nested replies - recursively rendered */}
      {feedback.children.length > 0 && (
        <div className="space-y-3">
          {feedback.children.map((child) => (
            <FeedbackItem
              key={child.id}
              feedback={child}
              depth={depth + 1}
              maxDepth={maxDepth}
              shakedownOwnerId={shakedownOwnerId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onReport={onReport}
              onMarkHelpful={onMarkHelpful}
            />
          ))}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('feedback.delete')} Feedback
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. Your feedback will be permanently
              removed from this shakedown.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Deleting...
                </span>
              ) : (
                <>
                  <Trash2 className="size-4" />
                  {t('feedback.delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// =============================================================================
// Exports
// =============================================================================

export default FeedbackItem;
