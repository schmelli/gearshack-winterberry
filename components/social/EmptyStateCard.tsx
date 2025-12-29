/**
 * EmptyStateCard Component
 *
 * Feature: 001-social-graph
 * Task: T024
 *
 * Reusable empty state component for social feature lists.
 * Provides visual feedback when lists are empty with optional CTA.
 */

'use client';

import { ReactNode } from 'react';
import { Users, UserPlus, Heart, Bell, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// =============================================================================
// Types
// =============================================================================

type EmptyStateType =
  | 'following'
  | 'followers'
  | 'friends'
  | 'friend-requests'
  | 'activity'
  | 'search'
  | 'custom';

interface EmptyStateCardProps {
  /** Type of empty state to display */
  type: EmptyStateType;
  /** Custom title (overrides default for type) */
  title?: string;
  /** Custom description (overrides default for type) */
  description?: string;
  /** Custom icon component (overrides default for type) */
  icon?: ReactNode;
  /** Call-to-action button text */
  ctaText?: string;
  /** Call-to-action click handler */
  onCtaClick?: () => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Configuration
// =============================================================================

interface EmptyStateConfig {
  icon: ReactNode;
  title: string;
  description: string;
  ctaText?: string;
}

const emptyStateConfigs: Record<Exclude<EmptyStateType, 'custom'>, EmptyStateConfig> = {
  following: {
    icon: <UserPlus className="h-12 w-12 text-muted-foreground/50" />,
    title: 'Not following anyone yet',
    description:
      'Start following community members to see their updates and activities in your feed.',
    ctaText: 'Discover People',
  },
  followers: {
    icon: <Users className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No followers yet',
    description:
      'Share your loadouts and engage with the community to attract followers.',
  },
  friends: {
    icon: <Heart className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No friends yet',
    description:
      'Send friend requests to users you\'ve exchanged messages with to build your network.',
    ctaText: 'Start Messaging',
  },
  'friend-requests': {
    icon: <UserPlus className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No pending requests',
    description:
      'Friend requests you send or receive will appear here.',
  },
  activity: {
    icon: <Bell className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No activity yet',
    description:
      'Activity from your friends will appear here. Add friends to see their updates!',
    ctaText: 'Find Friends',
  },
  search: {
    icon: <Search className="h-12 w-12 text-muted-foreground/50" />,
    title: 'No results found',
    description:
      'Try adjusting your search or filters to find what you\'re looking for.',
  },
};

// =============================================================================
// Component
// =============================================================================

export function EmptyStateCard({
  type,
  title,
  description,
  icon,
  ctaText,
  onCtaClick,
  className,
}: EmptyStateCardProps) {
  // Get config based on type
  const config = type === 'custom' ? null : emptyStateConfigs[type];

  // Use custom values or fall back to config
  const displayIcon = icon ?? config?.icon;
  const displayTitle = title ?? config?.title ?? 'Nothing to show';
  const displayDescription = description ?? config?.description ?? 'No items available.';
  const displayCtaText = ctaText ?? config?.ctaText;

  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        {/* Icon */}
        {displayIcon && (
          <div className="mb-4" aria-hidden="true">
            {displayIcon}
          </div>
        )}

        {/* Title */}
        <h3 className="mb-2 text-lg font-medium text-foreground">
          {displayTitle}
        </h3>

        {/* Description */}
        <p className="mb-6 max-w-sm text-sm text-muted-foreground">
          {displayDescription}
        </p>

        {/* CTA Button */}
        {displayCtaText && onCtaClick && (
          <Button variant="outline" onClick={onCtaClick}>
            {displayCtaText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================================================
// SKELETON VARIANT
// =============================================================================

/**
 * Loading skeleton for empty state areas.
 */
export function EmptyStateCardSkeleton({
  className,
}: {
  className?: string;
}) {
  return (
    <Card className={cn('border-dashed', className)}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        {/* Icon skeleton */}
        <div className="mb-4 h-12 w-12 animate-pulse rounded-full bg-muted" />

        {/* Title skeleton */}
        <div className="mb-2 h-6 w-48 animate-pulse rounded bg-muted" />

        {/* Description skeleton */}
        <div className="mb-6 h-4 w-64 animate-pulse rounded bg-muted" />

        {/* Button skeleton */}
        <div className="h-9 w-32 animate-pulse rounded bg-muted" />
      </CardContent>
    </Card>
  );
}

export default EmptyStateCard;
