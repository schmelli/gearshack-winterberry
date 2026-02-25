'use client';

/**
 * Saved VIP Loadouts Section Component
 *
 * Feature: 052-vip-loadouts
 * Task: T074
 *
 * Displays user's bookmarked VIP loadouts in a grid.
 * Used in user profile page.
 */

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Bookmark, Loader2, AlertCircle, Backpack } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useUserBookmarks, type BookmarkedLoadout } from '@/hooks/vip/useUserBookmarks';
import { formatDistanceToNow } from 'date-fns';

// =============================================================================
// Types
// =============================================================================

interface SavedVipLoadoutsSectionProps {
  className?: string;
}

// =============================================================================
// Helper Components
// =============================================================================

interface BookmarkedLoadoutCardProps {
  bookmark: BookmarkedLoadout;
  savedTimeLabel: string;
}

function BookmarkedLoadoutCard({ bookmark, savedTimeLabel }: BookmarkedLoadoutCardProps) {
  const locale = useLocale();

  const loadoutUrl = `/${locale}/vip/${bookmark.loadout.vip.slug}/${bookmark.loadout.slug}`;

  return (
    <Card className="group h-full transition-all hover:shadow-md hover:border-primary/50">
      <Link href={loadoutUrl}>
        <CardContent className="p-4 space-y-3">
          {/* VIP Info */}
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage
                src={bookmark.loadout.vip.avatar_url}
                alt={bookmark.loadout.vip.name}
              />
              <AvatarFallback>
                {bookmark.loadout.vip.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted-foreground truncate">
                {bookmark.loadout.vip.name}
              </p>
            </div>
          </div>

          {/* Loadout Name */}
          <h4 className="font-semibold text-foreground group-hover:text-primary line-clamp-2">
            {bookmark.loadout.name}
          </h4>

          {/* Saved timestamp */}
          <p className="text-xs text-muted-foreground">
            {savedTimeLabel}
          </p>
        </CardContent>
      </Link>
    </Card>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function SavedVipLoadoutsSection({ className }: SavedVipLoadoutsSectionProps) {
  const t = useTranslations('vip.bookmark');
  const locale = useLocale();

  const { bookmarks, isLoading, error, refetch } = useUserBookmarks();

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {t('savedLoadouts')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {t('savedLoadouts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
            <Button variant="outline" size="sm" onClick={refetch} className="ml-auto">
              {t('retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (bookmarks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bookmark className="h-5 w-5" />
            {t('savedLoadouts')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Backpack className="h-12 w-12 text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">{t('emptyTitle')}</p>
            <p className="text-sm text-muted-foreground/80 mt-1">
              {t('emptyHint')}
            </p>
            <Button asChild variant="outline" className="mt-4">
              <Link href={`/${locale}/vip`}>{t('browseVipLoadouts')}</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Bookmark className="h-5 w-5" />
          {t('savedLoadouts')}
        </CardTitle>
        <Button asChild variant="ghost" size="sm">
          <Link href={`/${locale}/vip`}>{t('viewAllVips')}</Link>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {bookmarks.map((bookmark) => (
            <BookmarkedLoadoutCard
              key={bookmark.loadout.id}
              bookmark={bookmark}
              savedTimeLabel={t('savedTime', { time: formatDistanceToNow(new Date(bookmark.bookmarkedAt), { addSuffix: true }) })}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default SavedVipLoadoutsSection;
