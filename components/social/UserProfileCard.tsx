/**
 * UserProfileCard Component
 *
 * Feature: 001-social-graph
 * Task: T026
 *
 * A compact card displaying another user's profile with follow/friend actions.
 * Used in:
 * - Shared loadout pages (viewing the owner)
 * - Following/followers lists
 * - Search results
 * - Activity feed author profiles
 *
 * Variants:
 * - 'compact': Small avatar + name + follow button (for lists)
 * - 'full': Includes bio, stats, and action buttons (for profile preview)
 */

'use client';

import { Link } from '@/i18n/navigation';
import { MapPin, Crown, MessageCircle } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { FollowButton } from '@/components/social/FollowButton';
import { MutualFriendsDisplay } from '@/components/social/MutualFriendsDisplay';
import { useUserFollowerCount } from '@/hooks/social/useFollowers';
import { useTranslations } from 'next-intl';

// =============================================================================
// Types
// =============================================================================

interface UserProfileData {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  location?: string | null;
  is_vip?: boolean;
  account_type?: 'standard' | 'vip' | 'merchant';
}

interface UserProfileCardProps {
  /** User data to display */
  user: UserProfileData;
  /** Display variant */
  variant?: 'compact' | 'full';
  /** Show follow button */
  showFollowButton?: boolean;
  /** Show message button */
  showMessageButton?: boolean;
  /** Show follower count (for VIP users) */
  showFollowerCount?: boolean;
  /** Show mutual friends */
  showMutualFriends?: boolean;
  /** Callback when message button is clicked */
  onMessageClick?: () => void;
  /** Callback when card is clicked (for navigation) */
  onClick?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// =============================================================================
// Compact Variant
// =============================================================================

function CompactUserProfile({
  user,
  showFollowButton,
  showMessageButton,
  onMessageClick,
  className,
}: UserProfileCardProps) {
  const t = useTranslations('Social');
  const isVip = user.is_vip || user.account_type === 'vip';

  return (
    <div className={cn('flex items-center justify-between gap-4', className)}>
      <Link
        href={`/profile/${user.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 p-1 -m-1"
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.display_name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(user.display_name)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {user.display_name}
            </span>
            {isVip && (
              <Crown className="h-3.5 w-3.5 text-amber-500" aria-label="VIP" />
            )}
          </div>
          {user.location && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{user.location}</span>
            </div>
          )}
        </div>
      </Link>

      <div className="flex items-center gap-2">
        {showMessageButton && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onMessageClick}
            aria-label={t('common.message')}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}
        {showFollowButton && (
          <FollowButton
            userId={user.id}
            userName={user.display_name}
            size="sm"
          />
        )}
      </div>
    </div>
  );
}

// =============================================================================
// Full Variant
// =============================================================================

function FullUserProfile({
  user,
  showFollowButton,
  showMessageButton,
  showFollowerCount,
  showMutualFriends,
  onMessageClick,
  onClick,
  className,
}: UserProfileCardProps) {
  const t = useTranslations('Social');
  const { count: followerCount } = useUserFollowerCount(user.id);
  const isVip = user.is_vip || user.account_type === 'vip';

  const handleCardClick = () => {
    onClick?.();
  };

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick ? handleCardClick : undefined}
    >
      <CardContent className="p-4">
        {/* Header with avatar and name */}
        <div className="flex items-start gap-4">
          <Link href={`/profile/${user.id}`} onClick={(e) => e.stopPropagation()}>
            <Avatar className="h-16 w-16 ring-2 ring-background shadow-sm">
              {user.avatar_url ? (
                <AvatarImage src={user.avatar_url} alt={user.display_name} />
              ) : null}
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(user.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={`/profile/${user.id}`}
                className="font-semibold text-lg hover:underline"
                onClick={(e) => e.stopPropagation()}
              >
                {user.display_name}
              </Link>
              {isVip && (
                <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                  <Crown className="h-3 w-3 mr-1" />
                  VIP
                </Badge>
              )}
            </div>

            {user.location && (
              <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                <span>{user.location}</span>
              </div>
            )}

            {showFollowerCount && isVip && followerCount !== null && (
              <div className="mt-1 text-sm text-muted-foreground">
                {followerCount.toLocaleString()} {t('followers.label')}
              </div>
            )}
          </div>
        </div>

        {/* Bio */}
        {user.bio && (
          <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
            {user.bio}
          </p>
        )}

        {/* Mutual Friends - T056 integration */}
        {showMutualFriends && (
          <div className="mt-3">
            <MutualFriendsDisplay
              targetUserId={user.id}
              variant="compact"
              maxAvatars={3}
            />
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
          {showFollowButton && (
            <FollowButton
              userId={user.id}
              userName={user.display_name}
              size="sm"
              className="flex-1"
            />
          )}
          {showMessageButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={onMessageClick}
              className={cn(!showFollowButton && 'flex-1')}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t('common.message')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function UserProfileCard(props: UserProfileCardProps) {
  const { variant = 'compact' } = props;

  if (variant === 'compact') {
    return <CompactUserProfile {...props} />;
  }

  return <FullUserProfile {...props} />;
}

// =============================================================================
// Loading Skeletons
// =============================================================================

export function UserProfileCardSkeleton({
  variant = 'compact',
  className,
}: {
  variant?: 'compact' | 'full';
  className?: string;
}) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex items-center justify-between gap-4', className)}>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
        <Skeleton className="h-8 w-20" />
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="mt-3 h-10 w-full" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-9 flex-1" />
          <Skeleton className="h-9 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}

export default UserProfileCard;
