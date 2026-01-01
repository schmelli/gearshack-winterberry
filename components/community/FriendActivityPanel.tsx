/**
 * FriendActivityPanel Component
 *
 * Feature: Community Hub Enhancement
 *
 * Compact panel showing recent friend activity:
 * - New loadouts, shared loadouts, marketplace listings
 * - Avatar, activity description, timestamp
 * - Link to full activity feed
 */

'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Activity,
  Backpack,
  Share2,
  Tag,
  Package,
  Users,
  User,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/formatting';
import { DEFAULT_FRIEND_ACTIVITY_PANEL_LIMIT } from '@/lib/constants/community';
import { useFriendActivity, formatActivityTime } from '@/hooks/social/useFriendActivity';
import type { FriendActivityPanelProps } from '@/types/community';
import type { FriendActivityWithProfile, ActivityType } from '@/types/social';

const ACTIVITY_ICONS: Record<ActivityType, typeof Activity> = {
  new_loadout: Backpack,
  loadout_shared: Share2,
  marketplace_listing: Tag,
  gear_added: Package,
  friend_added: Users,
  profile_updated: User,
};

const ACTIVITY_COLORS: Record<ActivityType, string> = {
  new_loadout: 'text-blue-500',
  loadout_shared: 'text-green-500',
  marketplace_listing: 'text-amber-500',
  gear_added: 'text-purple-500',
  friend_added: 'text-pink-500',
  profile_updated: 'text-gray-500',
};

// ============================================================================
// Activity Item
// ============================================================================

interface ActivityItemProps {
  activity: FriendActivityWithProfile;
}

function ActivityItem({ activity }: ActivityItemProps) {
  const t = useTranslations('Community');
  const Icon = ACTIVITY_ICONS[activity.activity_type] ?? Activity;
  const iconColor = ACTIVITY_COLORS[activity.activity_type] ?? 'text-muted-foreground';

  // Build the activity description
  const getActivityDescription = () => {
    const name = activity.display_name;
    switch (activity.activity_type) {
      case 'new_loadout':
        return t('activity.newLoadout', { name });
      case 'loadout_shared':
        return t('activity.sharedLoadout', { name });
      case 'marketplace_listing':
        return t('activity.listedItem', { name });
      case 'gear_added':
        return t('activity.addedGear', { name });
      case 'friend_added':
        return t('activity.newFriend', { name });
      case 'profile_updated':
        return t('activity.updatedProfile', { name });
      default:
        return t('activity.generic', { name });
    }
  };

  // Get the link for this activity
  const getActivityLink = () => {
    switch (activity.reference_type) {
      case 'loadout':
        return `/loadouts/${activity.reference_id}`;
      case 'gear_item':
        return `/inventory/${activity.reference_id}`;
      case 'profile':
        return `/profile/${activity.reference_id}`;
      default:
        return `/profile/${activity.user_id}`;
    }
  };

  return (
    <Link
      href={getActivityLink()}
      className="flex items-start gap-3 py-2 rounded-md hover:bg-muted/50 transition-colors -mx-2 px-2"
    >
      {/* Avatar with activity icon */}
      <div className="relative">
        <Avatar className="h-8 w-8">
          {activity.avatar_url ? (
            <AvatarImage src={activity.avatar_url} alt={activity.display_name} />
          ) : null}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(activity.display_name)}
          </AvatarFallback>
        </Avatar>
        <div
          className={cn(
            'absolute -bottom-1 -right-1 p-0.5 rounded-full bg-background',
            iconColor
          )}
        >
          <Icon className="h-3 w-3" />
        </div>
      </div>

      {/* Activity Details */}
      <div className="flex-1 min-w-0">
        <p className="text-sm leading-tight line-clamp-2">{getActivityDescription()}</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {formatActivityTime(activity.created_at, t)}
        </p>
      </div>
    </Link>
  );
}

// ============================================================================
// Empty State
// ============================================================================

function EmptyState() {
  const t = useTranslations('Community');

  return (
    <div className="py-4 text-center">
      <Activity className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
      <p className="text-sm text-muted-foreground">
        {t('activity.noActivity')}
      </p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        {t('activity.addFriends')}
      </p>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const FriendActivityPanel = React.memo(function FriendActivityPanel({ className, limit = DEFAULT_FRIEND_ACTIVITY_PANEL_LIMIT }: FriendActivityPanelProps) {
  const t = useTranslations('Community');
  const { activities, isLoading, hasMore } = useFriendActivity();

  const displayedActivities = activities.slice(0, limit);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4" />
            {t('panels.activity.title')}
          </CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {!isLoading && activities.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {displayedActivities.map((activity) => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}

            {/* View All Link */}
            {(hasMore || activities.length > limit) && (
              <Link
                href="/activity"
                className={cn(
                  'flex items-center justify-between py-2 px-3 -mx-3 rounded-md mt-2',
                  'text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
                )}
              >
                <span>{t('panels.activity.viewAll')}</span>
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default FriendActivityPanel;
