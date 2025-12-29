/**
 * ShakedownCard Component
 *
 * Feature: 001-community-shakedowns
 * Task: T029
 * Displays a shakedown preview in the feed list with navigation to detail page
 */

'use client';

import { formatDistanceToNow } from 'date-fns';
import { Calendar, Globe, Lock, MessageSquare, Users } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Link } from '@/i18n/navigation';
import { formatShakedownDateRange } from '@/lib/shakedown-utils';
import { cn } from '@/lib/utils';
import type { ExperienceLevel, ShakedownPrivacy, ShakedownWithAuthor } from '@/types/shakedown';

import { StatusBadge } from './StatusBadge';

// =============================================================================
// Types
// =============================================================================

interface ShakedownCardProps {
  /** The shakedown data to display */
  shakedown: ShakedownWithAuthor;
  /** Optional click handler with shakedown ID (navigation is handled by Link) */
  onClick?: (id: string) => void;
}

// =============================================================================
// Experience Level Styles
// =============================================================================

const EXPERIENCE_STYLES: Record<ExperienceLevel, string> = {
  beginner:
    'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  intermediate:
    'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  experienced:
    'bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800',
  expert:
    'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
};

// =============================================================================
// Privacy Icon Component
// =============================================================================

interface PrivacyIconProps {
  privacy: ShakedownPrivacy;
  className?: string;
}

function PrivacyIcon({ privacy, className }: PrivacyIconProps) {
  const t = useTranslations('Shakedowns.privacy');

  const iconClass = cn('size-4 text-muted-foreground', className);

  switch (privacy) {
    case 'private':
      return (
        <span title={t('private')} aria-label={t('private')}>
          <Lock className={iconClass} />
        </span>
      );
    case 'friends_only':
      return (
        <span title={t('friendsOnly')} aria-label={t('friendsOnly')}>
          <Users className={iconClass} />
        </span>
      );
    case 'public':
    default:
      return (
        <span title={t('public')} aria-label={t('public')}>
          <Globe className={iconClass} />
        </span>
      );
  }
}

// =============================================================================
// Helper: Get Author Initials
// =============================================================================

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// =============================================================================
// Component
// =============================================================================

export function ShakedownCard({ shakedown, onClick }: ShakedownCardProps) {
  const t = useTranslations('Shakedowns');
  const locale = useLocale();

  const {
    id,
    tripName,
    tripStartDate,
    tripEndDate,
    experienceLevel,
    privacy,
    status,
    feedbackCount,
    authorName,
    authorAvatar,
    createdAt,
  } = shakedown;

  // Format date range using locale
  const dateRange = formatShakedownDateRange(tripStartDate, tripEndDate, locale);

  // Format relative time since creation
  const timeAgo = formatDistanceToNow(new Date(createdAt), { addSuffix: true });

  const handleClick = () => {
    onClick?.(id);
  };

  return (
    <Link
      href={`/community/shakedowns/${id}`}
      onClick={handleClick}
      className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-xl"
    >
      <Card className="transition-all duration-200 hover:shadow-md hover:border-primary/20 cursor-pointer">
        <CardHeader className="pb-2">
          {/* Desktop: Two-column layout */}
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            {/* Left column: Main info */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Trip name */}
              <h3 className="font-semibold text-lg leading-tight line-clamp-2">{tripName}</h3>

              {/* Author info */}
              <div className="flex items-center gap-2">
                <Avatar className="size-6">
                  {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
                  <AvatarFallback className="text-xs">
                    {getAuthorInitials(authorName)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground truncate">{authorName}</span>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Calendar className="size-4 shrink-0" />
                <span>{dateRange}</span>
              </div>
            </div>

            {/* Right column: Stats and badges */}
            <div className="flex flex-col items-start gap-2 md:items-end md:shrink-0">
              {/* Badges row */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <Badge variant="outline" className={EXPERIENCE_STYLES[experienceLevel]}>
                  {t(`experience.${experienceLevel}`)}
                </Badge>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {/* Feedback count */}
                <div
                  className="flex items-center gap-1"
                  title={t('card.feedbackCount', { count: feedbackCount })}
                >
                  <MessageSquare className="size-4" />
                  <span>{feedbackCount}</span>
                </div>

                {/* Privacy indicator */}
                <PrivacyIcon privacy={privacy} />
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          {/* Time since created */}
          <p className="text-xs text-muted-foreground">{timeAgo}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

// =============================================================================
// Exports
// =============================================================================

export { EXPERIENCE_STYLES };
