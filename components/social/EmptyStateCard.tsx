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
import { useTranslations } from 'next-intl';
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

interface EmptyStateConfigKeys {
  icon: ReactNode;
  titleKey: string;
  descriptionKey: string;
  ctaTextKey?: string;
}

const emptyStateConfigKeys: Record<Exclude<EmptyStateType, 'custom'>, EmptyStateConfigKeys> = {
  following: {
    icon: <UserPlus className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.following.title',
    descriptionKey: 'emptyState.following.description',
    ctaTextKey: 'emptyState.following.cta',
  },
  followers: {
    icon: <Users className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.followers.title',
    descriptionKey: 'emptyState.followers.description',
  },
  friends: {
    icon: <Heart className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.friends.title',
    descriptionKey: 'emptyState.friends.description',
    ctaTextKey: 'emptyState.friends.cta',
  },
  'friend-requests': {
    icon: <UserPlus className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.friendRequests.title',
    descriptionKey: 'emptyState.friendRequests.description',
  },
  activity: {
    icon: <Bell className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.activity.title',
    descriptionKey: 'emptyState.activity.description',
    ctaTextKey: 'emptyState.activity.cta',
  },
  search: {
    icon: <Search className="h-12 w-12 text-muted-foreground/50" />,
    titleKey: 'emptyState.search.title',
    descriptionKey: 'emptyState.search.description',
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
  const t = useTranslations('Social');

  // Get config based on type
  const config = type === 'custom' ? null : emptyStateConfigKeys[type];

  // Use custom values or fall back to config
  const displayIcon = icon ?? config?.icon;
  const displayTitle = title ?? (config?.titleKey ? t(config.titleKey) : t('emptyState.default.title'));
  const displayDescription = description ?? (config?.descriptionKey ? t(config.descriptionKey) : t('emptyState.default.description'));
  const displayCtaText = ctaText ?? (config?.ctaTextKey ? t(config.ctaTextKey) : undefined);

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
