/**
 * FollowingList Component
 *
 * Feature: 001-social-graph
 * Task: T023
 *
 * Displays a paginated list of users the current user is following.
 * Each item shows user avatar, name, and an unfollow button.
 * Includes search filtering and empty state handling.
 *
 * Accessibility Features:
 * - Semantic list structure with proper headings
 * - Keyboard navigation for actions
 * - ARIA labels for screen readers
 * - Focus management on list updates
 */

'use client';

import { useState, useMemo } from 'react';
import { Link } from '@/i18n/navigation';
import { Search, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useFollowing } from '@/hooks/social/useFollowing';
import { FollowButton } from '@/components/social/FollowButton';
import { EmptyStateCard } from '@/components/social/EmptyStateCard';
import { useTranslations } from 'next-intl';
import type { FollowInfo } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface FollowingListProps {
  /** Optional title override */
  title?: string;
  /** Show search input */
  showSearch?: boolean;
  /** Maximum items to display (for pagination) */
  limit?: number;
  /** Show "View All" link when list is truncated */
  showViewAll?: boolean;
  /** Custom link for "View All" */
  viewAllHref?: string;
  /** Additional class names */
  className?: string;
  /** Callback when navigating to discover users */
  onDiscoverClick?: () => void;
}

// =============================================================================
// Subcomponents
// =============================================================================

interface FollowingListItemProps {
  user: FollowInfo;
  onUnfollow?: () => void;
}

function FollowingListItem({ user, onUnfollow }: FollowingListItemProps) {
  const t = useTranslations('Social');

  // Get initials for avatar fallback
  const initials = user.display_name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Format following since date
  const followingSince = new Date(user.following_since).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <Link
        href={`/profile/${user.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <Avatar className="h-10 w-10 flex-shrink-0">
          {user.avatar_url ? (
            <AvatarImage src={user.avatar_url} alt={user.display_name} />
          ) : null}
          <AvatarFallback className="bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {user.display_name}
            </span>
            {user.is_vip && (
              <Badge variant="secondary" className="text-xs">
                VIP
              </Badge>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {t('following.since', { date: followingSince })}
          </span>
        </div>
      </Link>

      <FollowButton
        userId={user.id}
        userName={user.display_name}
        size="sm"
        onUnfollow={onUnfollow}
      />
    </li>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function FollowingListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <ul className="divide-y divide-border" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <li key={i} className="flex items-center justify-between gap-4 py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
            <div className="flex-1 space-y-1">
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="h-8 w-20 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FollowingList({
  title,
  showSearch = true,
  limit,
  showViewAll = false,
  viewAllHref = '/following',
  className,
  onDiscoverClick,
}: FollowingListProps) {
  const t = useTranslations('Social');
  const { following, isLoading, error, refresh } = useFollowing();
  const [searchQuery, setSearchQuery] = useState('');

  // Filter following list by search query
  const filteredFollowing = useMemo(() => {
    if (!searchQuery.trim()) return following;

    const query = searchQuery.toLowerCase();
    return following.filter((user) =>
      user.display_name.toLowerCase().includes(query)
    );
  }, [following, searchQuery]);

  // Apply limit if specified
  const displayedFollowing = limit
    ? filteredFollowing.slice(0, limit)
    : filteredFollowing;

  const hasMore = limit && filteredFollowing.length > limit;

  // Error state
  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="py-6 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={refresh}
            className="mt-2 text-sm text-primary underline hover:no-underline"
          >
            {t('common.retry')}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {title ?? t('following.title')}
            {!isLoading && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({following.length})
              </span>
            )}
          </CardTitle>
          {isLoading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {/* Search input */}
        {showSearch && following.length > 0 && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('following.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              aria-label={t('following.searchAriaLabel')}
            />
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <FollowingListSkeleton count={limit ?? 5} />
        ) : displayedFollowing.length === 0 ? (
          searchQuery ? (
            <EmptyStateCard
              type="search"
              description={t('following.noSearchResults', { query: searchQuery })}
            />
          ) : (
            <EmptyStateCard
              type="following"
              onCtaClick={onDiscoverClick}
            />
          )
        ) : (
          <>
            <ul
              className="divide-y divide-border"
              role="list"
              aria-label={t('following.listAriaLabel')}
            >
              {displayedFollowing.map((user) => (
                <FollowingListItem
                  key={user.id}
                  user={user}
                  onUnfollow={() => refresh()}
                />
              ))}
            </ul>

            {/* View all link */}
            {showViewAll && hasMore && (
              <div className="mt-4 text-center">
                <Link
                  href={viewAllHref}
                  className="text-sm text-primary hover:underline"
                >
                  {t('following.viewAll', { count: filteredFollowing.length })}
                </Link>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FollowingList;
