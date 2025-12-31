/**
 * AnnouncementsBanner Component
 *
 * Feature: Community Hub Enhancement
 *
 * Displays community announcements as dismissible banners.
 * Supports multiple announcement types with different styling:
 * - info (blue)
 * - warning (amber)
 * - success (green)
 * - promo (purple)
 */

'use client';

import { useTranslations } from 'next-intl';
import { Info, AlertTriangle, CheckCircle, Tag, X, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAnnouncements } from '@/hooks/community/useAnnouncements';
import type { AnnouncementsBannerProps, AnnouncementType, CommunityAnnouncement } from '@/types/community';

const ANNOUNCEMENT_STYLES: Record<AnnouncementType, {
  bg: string;
  border: string;
  icon: typeof Info;
  iconColor: string;
}> = {
  info: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-800',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-800',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-800',
    icon: CheckCircle,
    iconColor: 'text-green-600 dark:text-green-400',
  },
  promo: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-800',
    icon: Tag,
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
};

interface SingleAnnouncementProps {
  announcement: CommunityAnnouncement;
  onDismiss: (id: string) => void;
}

function SingleAnnouncement({ announcement, onDismiss }: SingleAnnouncementProps) {
  const t = useTranslations('Community');
  const style = ANNOUNCEMENT_STYLES[announcement.type as AnnouncementType] ?? ANNOUNCEMENT_STYLES.info;
  const Icon = style.icon;

  return (
    <div
      className={cn(
        'relative flex items-start gap-3 rounded-lg border p-4',
        style.bg,
        style.border
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', style.iconColor)} aria-hidden="true" />

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-foreground">{announcement.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{announcement.message}</p>

        {announcement.link_url && (
          <a
            href={announcement.link_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            {announcement.link_text ?? t('announcements.learnMore')}
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-foreground"
        onClick={() => onDismiss(announcement.id)}
        aria-label={t('announcements.dismiss')}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function AnnouncementsBanner({ announcements: initialAnnouncements, className }: AnnouncementsBannerProps) {
  const { announcements, dismissAnnouncement, isLoading } = useAnnouncements(initialAnnouncements);

  // Don't render anything while loading or if no announcements
  if (isLoading || announcements.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-3', className)} role="region" aria-label="Announcements" aria-live="polite">
      {announcements.map((announcement) => (
        <SingleAnnouncement
          key={announcement.id}
          announcement={announcement}
          onDismiss={dismissAnnouncement}
        />
      ))}
    </div>
  );
}

export default AnnouncementsBanner;
