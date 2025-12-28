/**
 * FollowButton Component
 *
 * Feature: 001-social-graph
 * Task: T022
 *
 * Toggle button for following/unfollowing users.
 * One-click action - no approval needed.
 *
 * States:
 * - Follow (default): Primary outline style, shows "Follow"
 * - Following: Secondary style, shows "Following", hover shows "Unfollow"
 * - Loading: Shows spinner during operation
 *
 * Accessibility Features:
 * - aria-label describes the action that will be taken
 * - aria-busy indicates loading state
 * - Hover state change announced via aria-live region
 */

'use client';

import { useState, useCallback } from 'react';
import { UserPlus, UserMinus, Loader2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsFollowing } from '@/hooks/social/useFollowing';
import { useAuth } from '@/hooks/useAuth';
import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

interface FollowButtonProps {
  /** ID of the user to follow/unfollow */
  userId: string;
  /** Display name for accessibility labels */
  userName?: string;
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Show only icon (for compact views) */
  iconOnly?: boolean;
  /** Additional class names */
  className?: string;
  /** Callback after follow action */
  onFollow?: () => void;
  /** Callback after unfollow action */
  onUnfollow?: () => void;
  /** Show follower count badge (for VIP accounts) */
  showFollowerCount?: boolean;
  /** Follower count to display */
  followerCount?: number | null;
}

// =============================================================================
// Component
// =============================================================================

export function FollowButton({
  userId,
  userName = 'this user',
  size = 'sm',
  iconOnly = false,
  className,
  onFollow,
  onUnfollow,
  showFollowerCount = false,
  followerCount,
}: FollowButtonProps) {
  const t = useTranslations('Social');
  const { user: currentUser } = useAuth();
  const { isFollowing, isLoading: isCheckingFollow, toggle } = useIsFollowing(userId);
  const [isOperating, setIsOperating] = useState(false);
  const [isHovering, setIsHovering] = useState(false);

  // Can't follow yourself
  const isSelf = currentUser?.id === userId;
  const isLoading = isCheckingFollow || isOperating;

  const handleClick = useCallback(async () => {
    if (isLoading || isSelf) return;

    setIsOperating(true);
    try {
      const wasFollowing = isFollowing;
      await toggle();

      if (wasFollowing) {
        onUnfollow?.();
      } else {
        onFollow?.();
      }
    } catch (error) {
      console.error('Follow toggle error:', error);
    } finally {
      setIsOperating(false);
    }
  }, [isLoading, isSelf, isFollowing, toggle, onFollow, onUnfollow]);

  // Don't render for self
  if (isSelf) {
    return null;
  }

  // Determine button state and appearance
  const showUnfollowState = isFollowing && isHovering;

  const getButtonVariant = (): 'default' | 'secondary' | 'outline' | 'destructive' => {
    if (showUnfollowState) return 'destructive';
    if (isFollowing) return 'secondary';
    return 'outline';
  };

  const getIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />;
    }
    if (showUnfollowState) {
      return <UserMinus className="h-4 w-4" aria-hidden="true" />;
    }
    if (isFollowing) {
      return <Check className="h-4 w-4" aria-hidden="true" />;
    }
    return <UserPlus className="h-4 w-4" aria-hidden="true" />;
  };

  const getLabel = (): string => {
    if (isLoading) return t('following.loading');
    if (showUnfollowState) return t('following.unfollow');
    if (isFollowing) return t('following.following');
    return t('following.follow');
  };

  const getAriaLabel = (): string => {
    if (isLoading) return t('following.loading');
    if (isFollowing) {
      return t('following.unfollowAriaLabel', { name: userName });
    }
    return t('following.followAriaLabel', { name: userName });
  };

  return (
    <div className="inline-flex items-center gap-2">
      <Button
        variant={getButtonVariant()}
        size={iconOnly ? 'icon' : size}
        className={cn(
          'transition-all duration-200',
          iconOnly && 'h-8 w-8',
          isFollowing && !showUnfollowState && 'border-primary/50',
          className
        )}
        disabled={isLoading}
        onClick={handleClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        onFocus={() => setIsHovering(true)}
        onBlur={() => setIsHovering(false)}
        aria-label={getAriaLabel()}
        aria-busy={isLoading}
        aria-pressed={isFollowing}
      >
        {getIcon()}
        {!iconOnly && <span className="ml-2">{getLabel()}</span>}
        {iconOnly && <span className="sr-only">{getAriaLabel()}</span>}
      </Button>

      {/* Follower count badge for VIP accounts */}
      {showFollowerCount && followerCount !== null && followerCount !== undefined && (
        <span
          className="text-sm text-muted-foreground"
          aria-label={t('followers.countLabel', { count: followerCount })}
        >
          {followerCount.toLocaleString()} {t('followers.label')}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// COMPACT VARIANT
// =============================================================================

/**
 * Minimal follow button for use in lists and compact spaces.
 */
export function FollowButtonCompact({
  userId,
  userName,
  className,
  onFollow,
  onUnfollow,
}: Pick<FollowButtonProps, 'userId' | 'userName' | 'className' | 'onFollow' | 'onUnfollow'>) {
  return (
    <FollowButton
      userId={userId}
      userName={userName}
      size="sm"
      iconOnly
      className={className}
      onFollow={onFollow}
      onUnfollow={onUnfollow}
    />
  );
}

export default FollowButton;
