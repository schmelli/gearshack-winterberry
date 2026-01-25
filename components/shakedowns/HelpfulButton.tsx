/**
 * HelpfulButton Component
 *
 * Feature: 001-community-shakedowns
 * Task: T046
 *
 * Allows shakedown owners to mark feedback as helpful with optimistic updates.
 * Handles badge award notifications when users earn recognition for helpful feedback.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { ThumbsUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

interface HelpfulButtonProps {
  /** ID of the feedback being voted on */
  feedbackId: string;
  /** ID of the shakedown containing the feedback */
  shakedownId: string;
  /** ID of the feedback author (to prevent self-voting) */
  authorId: string;
  /** Whether current user is the shakedown owner */
  isOwner: boolean;
  /** Current helpful vote count */
  helpfulCount: number;
  /** Whether user has already marked as helpful */
  isHelpful: boolean;
  /** Callback when vote status changes */
  onVoteChange?: (feedbackId: string, isHelpful: boolean) => Promise<{
    success: boolean;
    badgeAwarded?: string;
    error?: string;
  }>;
  /** Button size variant */
  size?: 'sm' | 'default';
}

// =============================================================================
// Component
// =============================================================================

export function HelpfulButton({
  feedbackId,
  shakedownId: _shakedownId, // Reserved for API context
  authorId: _authorId, // Reserved for API context (self-vote prevention in parent)
  isOwner,
  helpfulCount,
  isHelpful,
  onVoteChange,
  size = 'default',
}: HelpfulButtonProps) {
  // Note: _shakedownId and _authorId are passed for API context
  // but actual authorization logic is handled by the parent component
  void _shakedownId;
  void _authorId;
  const t = useTranslations('Shakedowns');

  // Local state for optimistic updates
  const [optimisticIsHelpful, setOptimisticIsHelpful] = useState(isHelpful);
  const [optimisticCount, setOptimisticCount] = useState(helpfulCount);
  const [isLoading, setIsLoading] = useState(false);

  // Timer ref for badge notification cleanup
  const badgeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (badgeTimeoutRef.current) {
        clearTimeout(badgeTimeoutRef.current);
      }
    };
  }, []);

  // Sync with props when they change (e.g., from server refresh)
  if (isHelpful !== optimisticIsHelpful && !isLoading) {
    setOptimisticIsHelpful(isHelpful);
  }
  if (helpfulCount !== optimisticCount && !isLoading) {
    setOptimisticCount(helpfulCount);
  }

  // Determine if button should be disabled
  // Disabled when: not owner, user is author, or currently loading
  const isDisabled = !isOwner || !onVoteChange || isLoading;

  // Get tooltip text based on state
  const getTooltipText = (): string => {
    if (!isOwner) {
      return t('feedback.markHelpful'); // Neutral text for non-owners
    }
    if (optimisticIsHelpful) {
      return t('feedback.removeHelpful');
    }
    return t('feedback.markHelpful');
  };

  // Handle vote toggle with optimistic update
  const handleClick = useCallback(async () => {
    if (isDisabled || !onVoteChange) return;

    const previousIsHelpful = optimisticIsHelpful;
    const previousCount = optimisticCount;
    const newIsHelpful = !optimisticIsHelpful;

    // Optimistic update
    setIsLoading(true);
    setOptimisticIsHelpful(newIsHelpful);
    setOptimisticCount(newIsHelpful ? previousCount + 1 : previousCount - 1);

    try {
      const result = await onVoteChange(feedbackId, newIsHelpful);

      if (!result.success) {
        // Rollback on error
        setOptimisticIsHelpful(previousIsHelpful);
        setOptimisticCount(previousCount);
        toast.error(result.error || t('errors.helpfulFailed'));
        return;
      }

      // Show success toast
      if (newIsHelpful) {
        toast.success(t('success.helpfulAdded'));
      } else {
        toast.success(t('success.helpfulRemoved'));
      }

      // Check for badge award and show celebratory notification
      if (result.badgeAwarded) {
        // Delay badge notification slightly for better UX
        badgeTimeoutRef.current = setTimeout(() => {
          toast.success(t('badges.newBadge'), {
            description: getBadgeName(result.badgeAwarded!, t),
            duration: 5000,
          });
        }, 500);
      }
    } catch {
      // Rollback on network error
      setOptimisticIsHelpful(previousIsHelpful);
      setOptimisticCount(previousCount);
      toast.error(t('errors.helpfulFailed'));
    } finally {
      setIsLoading(false);
    }
  }, [
    feedbackId,
    isDisabled,
    onVoteChange,
    optimisticIsHelpful,
    optimisticCount,
    t,
  ]);

  // Size-specific styling
  const buttonSizeClasses = size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm';
  const iconSize = size === 'sm' ? 'size-3' : 'size-4';

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={optimisticIsHelpful ? 'secondary' : 'ghost'}
          size={size}
          onClick={handleClick}
          disabled={isDisabled}
          aria-pressed={optimisticIsHelpful}
          aria-label={
            optimisticIsHelpful
              ? t('feedback.removeHelpful')
              : t('feedback.markHelpful')
          }
          className={cn(
            buttonSizeClasses,
            'gap-1.5 transition-colors',
            // Active/voted state styling
            optimisticIsHelpful && [
              'bg-amber-100 text-amber-800',
              'dark:bg-amber-900/30 dark:text-amber-300',
              'hover:bg-amber-200 dark:hover:bg-amber-900/50',
            ],
            // Default/unvoted state
            !optimisticIsHelpful && [
              'text-muted-foreground',
              'hover:text-amber-600 dark:hover:text-amber-400',
            ],
            // Disabled state (non-owner or self-author)
            isDisabled && !isLoading && 'opacity-60 cursor-default'
          )}
        >
          {isLoading ? (
            <Loader2 className={cn(iconSize, 'animate-spin')} />
          ) : (
            <ThumbsUp
              className={cn(
                iconSize,
                optimisticIsHelpful && 'fill-current'
              )}
            />
          )}
          {optimisticCount > 0 && (
            <span className="font-medium">{optimisticCount}</span>
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {getTooltipText()}
      </TooltipContent>
    </Tooltip>
  );
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get localized badge name from badge type
 */
function getBadgeName(
  badgeType: string,
  t: ReturnType<typeof useTranslations<'Shakedowns'>>
): string {
  switch (badgeType) {
    case 'shakedown_helper':
      return t('badges.shakedownHelper');
    case 'trail_expert':
      return t('badges.trailExpert');
    case 'community_legend':
      return t('badges.communityLegend');
    default:
      return badgeType;
  }
}

// =============================================================================
// Exports
// =============================================================================

export default HelpfulButton;
