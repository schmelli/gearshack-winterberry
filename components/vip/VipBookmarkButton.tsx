'use client';

/**
 * VIP Bookmark Button Component
 *
 * Feature: 052-vip-loadouts
 * Task: T071
 *
 * Button to bookmark/unbookmark a VIP loadout with optimistic updates.
 */

import { useTranslations } from 'next-intl';
import { Bookmark, BookmarkCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useVipBookmark } from '@/hooks/vip/useVipBookmark';
import { useEffect, useCallback } from 'react';

// =============================================================================
// Types
// =============================================================================

interface VipBookmarkButtonProps {
  loadoutId: string;
  initialIsBookmarked?: boolean;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

export function VipBookmarkButton({
  loadoutId,
  initialIsBookmarked = false,
  variant = 'ghost',
  size = 'icon',
  showLabel = false,
  className,
}: VipBookmarkButtonProps) {
  const t = useTranslations('vip.bookmark');
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const {
    isBookmarked,
    isLoading,
    error,
    toggleBookmark,
  } = useVipBookmark(loadoutId, initialIsBookmarked);

  // Show error toast
  useEffect(() => {
    if (error) {
      toast.error(error);
    }
  }, [error]);

  // Show success toast
  const handleToggle = useCallback(async () => {
    if (!isAuthenticated) {
      toast.error(t('signInToBookmark'));
      return;
    }

    const wasBookmarked = isBookmarked;
    await toggleBookmark();

    // Only show toast if toggle was successful (error state handles failures)
    if (!error) {
      toast.success(wasBookmarked ? t('unbookmarkedNotification') : t('bookmarkedNotification'));
    }
  }, [isAuthenticated, isBookmarked, toggleBookmark, error, t]);

  // Disabled if not authenticated or loading auth
  const isDisabled = authLoading || isLoading;

  if (showLabel) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleToggle}
        disabled={isDisabled}
        className={cn(className)}
        aria-label={isBookmarked ? t('removeBookmark') : t('bookmark')}
      >
        {isLoading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : isBookmarked ? (
          <BookmarkCheck className="mr-2 h-4 w-4 text-primary" />
        ) : (
          <Bookmark className="mr-2 h-4 w-4" />
        )}
        {isBookmarked ? t('bookmarked') : t('bookmark')}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isDisabled}
      className={cn('h-8 w-8 shrink-0', className)}
      aria-label={isBookmarked ? t('removeBookmark') : t('bookmark')}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : isBookmarked ? (
        <BookmarkCheck className="h-4 w-4 text-primary" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
    </Button>
  );
}

export default VipBookmarkButton;
