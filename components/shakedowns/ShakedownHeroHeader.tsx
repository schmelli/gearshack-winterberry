/**
 * ShakedownHeroHeader Component
 *
 * Feature: 001-community-shakedowns (Enhancement)
 *
 * Displays the shakedown's loadout hero image as a full-width header
 * with trip name, date range, author info, and status/privacy badges.
 * Read-only view - no image generation controls.
 */

'use client';

import Image from 'next/image';
import { Link } from '@/i18n/navigation';
import { ArrowLeft, Calendar, ImageOff } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { cn } from '@/lib/utils';

import { StatusBadge } from './StatusBadge';
import { PrivacyIndicator } from './PrivacyIndicator';
import type { ShakedownPrivacy, ShakedownStatus } from '@/types/shakedown';

/**
 * Optimize Cloudinary URLs with automatic format and quality
 */
function optimizeCloudinaryUrl(url: string, width = 1200): string {
  if (!url.includes('res.cloudinary.com')) {
    return url;
  }
  if (url.includes('/f_auto') || url.includes('/q_auto')) {
    return url;
  }
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) {
    return url;
  }
  const before = url.slice(0, uploadIndex + 8);
  const after = url.slice(uploadIndex + 8);
  return `${before}f_auto,q_auto,w_${width}/${after}`;
}

function getAuthorInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export interface ShakedownHeroHeaderProps {
  /** Trip name to display as title */
  tripName: string;
  /** Formatted date range */
  dateRange: string;
  /** Author display name */
  authorName: string;
  /** Author avatar URL */
  authorAvatar: string | null;
  /** Shakedown status */
  status: ShakedownStatus;
  /** Shakedown privacy setting */
  privacy: ShakedownPrivacy;
  /** Loadout hero image URL (from the associated loadout) */
  heroImageUrl: string | null;
  /** Back link URL */
  backHref?: string;
  /** Activity types for badges */
  activityTypes?: string[];
  /** Seasons for badges */
  seasons?: string[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Hero header for shakedown detail page with loadout's hero image
 */
export function ShakedownHeroHeader({
  tripName,
  dateRange,
  authorName,
  authorAvatar,
  status,
  privacy,
  heroImageUrl,
  backHref = '/community/shakedowns',
  activityTypes,
  seasons,
  className,
}: ShakedownHeroHeaderProps): React.ReactElement {
  const t = useTranslations('Shakedowns');
  const hasImage = !!heroImageUrl;

  return (
    <div className={cn('relative w-full', className)}>
      <AspectRatio ratio={21 / 9} className="overflow-hidden bg-muted">
        {/* Image or Placeholder */}
        {hasImage ? (
          <>
            <Image
              src={optimizeCloudinaryUrl(heroImageUrl!)}
              alt={tripName}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Gradient Overlays */}
            <div
              className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/60 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/80 via-black/40 to-transparent"
              aria-hidden="true"
            />
          </>
        ) : (
          <>
            {/* Nature-inspired gradient placeholder */}
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-forest-100 via-moss-100 to-terracotta-100 dark:from-forest-900 dark:via-moss-900 dark:to-terracotta-900">
              <ImageOff className="h-12 w-12 text-forest-400 dark:text-forest-600 opacity-50" />
            </div>
            <div
              className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/30 to-transparent"
              aria-hidden="true"
            />
            <div
              className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent"
              aria-hidden="true"
            />
          </>
        )}

        {/* Top Navigation Bar */}
        <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 sm:p-6">
          <Link
            href={backHref}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-medium text-white/90 transition-colors hover:bg-white/10 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">{t('backToList')}</span>
          </Link>

          {/* Status & Privacy Badges - Top Right */}
          <div className="flex items-center gap-2">
            <StatusBadge status={status} className="bg-white/20 backdrop-blur-sm" />
            <PrivacyIndicator privacy={privacy} className="bg-white/20 backdrop-blur-sm" />
          </div>
        </div>

        {/* Bottom Content */}
        <div className="absolute inset-x-0 bottom-0 z-20 p-4 sm:p-6">
          {/* Trip Name */}
          <h1 className="text-2xl font-bold tracking-tight text-white drop-shadow-lg sm:text-3xl md:text-4xl">
            {tripName}
          </h1>

          {/* Date Range & Author */}
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/90 drop-shadow-md sm:text-base">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>{dateRange}</span>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="size-6 border border-white/30">
                {authorAvatar && (
                  <AvatarImage src={authorAvatar} alt={authorName} />
                )}
                <AvatarFallback className="text-xs bg-white/20">
                  {getAuthorInitials(authorName)}
                </AvatarFallback>
              </Avatar>
              <span>{authorName}</span>
            </div>
          </div>

          {/* Activity & Season Badges */}
          {((activityTypes && activityTypes.length > 0) || (seasons && seasons.length > 0)) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {activityTypes?.map((activity) => (
                <span
                  key={activity}
                  className="inline-flex items-center rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {activity}
                </span>
              ))}
              {seasons?.map((season) => (
                <span
                  key={season}
                  className="inline-flex items-center rounded-full border border-white/30 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white backdrop-blur-sm"
                >
                  {season}
                </span>
              ))}
            </div>
          )}
        </div>
      </AspectRatio>
    </div>
  );
}

export default ShakedownHeroHeader;
