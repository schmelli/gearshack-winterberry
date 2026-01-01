/**
 * FriendActivityFeed Component
 *
 * Feature: 001-social-graph
 * Tasks: T037, T038
 *
 * Displays a real-time activity feed from friends.
 * Shows different card variants for each activity type.
 *
 * Features:
 * - Activity type filter
 * - Load more pagination
 * - Real-time updates
 * - Activity-specific cards with icons
 */

'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import {
  Backpack,
  Share2,
  Tag,
  Package,
  Users,
  User,
  Activity,
  Filter,
  RefreshCw,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFriendActivity, formatActivityTime, getActivityTypeInfo } from '@/hooks/social/useFriendActivity';
import { EmptyStateCard } from '@/components/social/EmptyStateCard';
import { useTranslations } from 'next-intl';
import type { FriendActivityWithProfile, ActivityType, ActivityTypeFilter } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface FriendActivityFeedProps {
  /** Optional title override */
  title?: string;
  /** Show filter controls */
  showFilter?: boolean;
  /** Maximum items to display initially */
  limit?: number;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Activity Card Component
// =============================================================================

interface ActivityCardProps {
  activity: FriendActivityWithProfile;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case 'new_loadout':
      return Backpack;
    case 'loadout_shared':
      return Share2;
    case 'marketplace_listing':
      return Tag;
    case 'gear_added':
      return Package;
    case 'friend_added':
      return Users;
    case 'profile_updated':
      return User;
    default:
      return Activity;
  }
}

function getActivityColor(type: ActivityType): string {
  switch (type) {
    case 'new_loadout':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400';
    case 'loadout_shared':
      return 'bg-green-100 text-green-600 dark:bg-green-950 dark:text-green-400';
    case 'marketplace_listing':
      return 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400';
    case 'gear_added':
      return 'bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400';
    case 'friend_added':
      return 'bg-pink-100 text-pink-600 dark:bg-pink-950 dark:text-pink-400';
    case 'profile_updated':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

function ActivityCard({ activity }: ActivityCardProps) {
  const t = useTranslations('Social');
  const tCommunity = useTranslations('Community');
  const Icon = getActivityIcon(activity.activity_type);
  const iconColor = getActivityColor(activity.activity_type);
  const activityInfo = getActivityTypeInfo(activity.activity_type);

  // Get activity-specific link
  const getActivityLink = (): string => {
    switch (activity.reference_type) {
      case 'loadout':
        return `/loadouts/${activity.reference_id}`;
      case 'gear_item':
        return `/inventory?item=${activity.reference_id}`;
      case 'profile':
        return `/profile/${activity.reference_id}`;
      default:
        return `/profile/${activity.user_id}`;
    }
  };

  // Get activity description
  const getActivityDescription = (): string => {
    const name = activity.display_name;
    switch (activity.activity_type) {
      case 'new_loadout':
        return t('activity.createdLoadout', { name });
      case 'loadout_shared':
        return t('activity.sharedLoadout', { name });
      case 'marketplace_listing':
        return t('activity.listedGear', { name });
      case 'gear_added':
        return t('activity.addedGear', { name });
      case 'friend_added':
        return t('activity.becameFriends', { name });
      case 'profile_updated':
        return t('activity.updatedProfile', { name });
      default:
        return t('activity.didSomething', { name });
    }
  };

  // Get additional metadata display
  const getMetadataDisplay = (): string | null => {
    const metadata = activity.metadata;
    if (!metadata) return null;

    if (metadata.loadout_name) return metadata.loadout_name as string;
    if (metadata.gear_name) return metadata.gear_name as string;
    if (metadata.price) return `$${metadata.price}`;
    return null;
  };

  const metadataText = getMetadataDisplay();

  return (
    <div className="flex gap-3 py-3">
      {/* Activity icon */}
      <div className={cn('flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full', iconColor)}>
        <Icon className="h-5 w-5" />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm">
              <Link
                href={`/profile/${activity.user_id}`}
                className="font-medium hover:underline"
              >
                {activity.display_name}
              </Link>
              <span className="text-muted-foreground">
                {' '}
                {activityInfo.label.toLowerCase()}
              </span>
            </p>

            {metadataText && (
              <Link
                href={getActivityLink()}
                className="mt-0.5 block text-sm font-medium text-primary hover:underline truncate"
              >
                {metadataText}
              </Link>
            )}
          </div>

          {/* User avatar */}
          <Link href={`/profile/${activity.user_id}`} className="flex-shrink-0">
            <Avatar className="h-8 w-8">
              {activity.avatar_url ? (
                <AvatarImage src={activity.avatar_url} alt={activity.display_name} />
              ) : null}
              <AvatarFallback className="text-xs">
                {getInitials(activity.display_name)}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>

        {/* Time */}
        <p className="mt-1 text-xs text-muted-foreground">
          {formatActivityTime(activity.created_at, tCommunity)}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function ActivityFeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy="true">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3">
          <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// Filter Options
// =============================================================================

const FILTER_OPTIONS: { value: ActivityTypeFilter; label: string }[] = [
  { value: 'all', label: 'All Activity' },
  { value: 'new_loadout', label: 'New Loadouts' },
  { value: 'loadout_shared', label: 'Shared Loadouts' },
  { value: 'marketplace_listing', label: 'Marketplace' },
  { value: 'gear_added', label: 'New Gear' },
  { value: 'friend_added', label: 'New Friends' },
];

// =============================================================================
// Main Component
// =============================================================================

export function FriendActivityFeed({
  title,
  showFilter = true,
  limit,
  className,
}: FriendActivityFeedProps) {
  const t = useTranslations('Social');
  const [filter, setFilter] = useState<ActivityTypeFilter>('all');

  const {
    activities,
    isLoading,
    error,
    hasMore,
    loadMore,
    refresh,
  } = useFriendActivity(filter);

  // Apply limit if specified
  const displayedActivities = limit ? activities.slice(0, limit) : activities;
  const canLoadMore = hasMore && (!limit || activities.length < limit);

  // Get current filter label
  const currentFilterLabel = FILTER_OPTIONS.find((o) => o.value === filter)?.label ?? 'All Activity';

  // Handle refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Handle load more
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const handleLoadMore = async () => {
    setIsLoadingMore(true);
    try {
      await loadMore();
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Error state
  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="py-6 text-center">
          <p className="text-destructive">{error}</p>
          <button
            onClick={handleRefresh}
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
            {title ?? t('activity.title')}
          </CardTitle>

          <div className="flex items-center gap-2">
            {/* Refresh button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleRefresh}
              disabled={isRefreshing || isLoading}
              aria-label={t('common.refresh')}
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
            </Button>

            {/* Filter dropdown */}
            {showFilter && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    {currentFilterLabel}
                    <ChevronDown className="h-4 w-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t('activity.filterBy')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {FILTER_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setFilter(option.value)}
                      className={cn(filter === option.value && 'bg-muted')}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <ActivityFeedSkeleton count={limit ?? 5} />
        ) : displayedActivities.length === 0 ? (
          <EmptyStateCard
            type="activity"
            title={filter !== 'all' ? t('activity.noFilteredActivity') : undefined}
            description={
              filter !== 'all'
                ? t('activity.noFilteredActivityDesc', { filter: currentFilterLabel })
                : undefined
            }
          />
        ) : (
          <>
            <div className="divide-y divide-border">
              {displayedActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>

            {/* Load more button */}
            {canLoadMore && (
              <div className="mt-4 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('activity.loadMore')
                  )}
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default FriendActivityFeed;
