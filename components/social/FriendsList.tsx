/**
 * FriendsList Component
 *
 * Feature: 001-social-graph
 * Task: T036
 *
 * Displays a paginated list of friends with search, filter, and sort.
 * Each item shows user avatar, name, online status, and action buttons.
 *
 * Features:
 * - Search by name
 * - Filter: online only
 * - Sort: name, recently active, online first, date added
 * - Unfriend with confirmation
 */

'use client';

import { useState } from 'react';
import { Link } from '@/i18n/navigation';
import { Search, SortAsc, MessageCircle, MoreHorizontal, UserMinus, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useFilteredFriends } from '@/hooks/social/useFriendships';
import { EmptyStateCard } from '@/components/social/EmptyStateCard';
import { AvatarStatusOverlay, OnlineStatusIndicator } from '@/components/social/OnlineStatusIndicator';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import type { FriendInfo, FriendsListSortBy } from '@/types/social';

// =============================================================================
// Types
// =============================================================================

interface FriendsListProps {
  /** Optional title override */
  title?: string;
  /** Show search input */
  showSearch?: boolean;
  /** Show filter/sort controls */
  showControls?: boolean;
  /** Maximum items to display (for pagination) */
  limit?: number;
  /** Callback when navigating to messages */
  onMessageClick?: (friendId: string) => void;
  /** Additional class names */
  className?: string;
}

// =============================================================================
// Subcomponents
// =============================================================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
  });
}

interface FriendsListItemProps {
  friend: FriendInfo;
  onUnfriend: () => void;
  onMessage?: () => void;
  isUnfriending: boolean;
}

function FriendsListItem({ friend, onUnfriend, onMessage, isUnfriending }: FriendsListItemProps) {
  const t = useTranslations('Social');

  return (
    <li className="flex items-center justify-between gap-4 py-3">
      <Link
        href={`/profile/${friend.id}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-md transition-colors hover:bg-muted/50 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        <div className="relative">
          <Avatar className="h-10 w-10 flex-shrink-0">
            {friend.avatar_url ? (
              <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-primary">
              {getInitials(friend.display_name)}
            </AvatarFallback>
          </Avatar>
          {/* Online status indicator */}
          <AvatarStatusOverlay
            userId={friend.id}
            status={friend.is_online ? 'online' : 'offline'}
            size="md"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-foreground">
              {friend.display_name}
            </span>
            {friend.is_online && (
              <OnlineStatusIndicator
                userId={friend.id}
                status="online"
                variant="badge"
                size="sm"
              />
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            {t('friends.since', { date: formatDate(friend.friends_since) })}
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-1">
        {onMessage && (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={(e) => {
              e.stopPropagation();
              onMessage();
            }}
            aria-label={t('common.message')}
          >
            <MessageCircle className="h-4 w-4" />
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={isUnfriending}
              aria-label={t('common.moreOptions')}
            >
              {isUnfriending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={onUnfriend}
              className="text-destructive focus:text-destructive"
            >
              <UserMinus className="h-4 w-4 mr-2" />
              {t('friends.unfriend')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </li>
  );
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function FriendsListSkeleton({ count = 5 }: { count?: number }) {
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
          <div className="flex gap-1">
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
            <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          </div>
        </li>
      ))}
    </ul>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function FriendsList({
  title,
  showSearch = true,
  showControls = true,
  limit,
  onMessageClick,
  className,
}: FriendsListProps) {
  const t = useTranslations('Social');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<FriendsListSortBy>('name');
  const [onlineOnly, setOnlineOnly] = useState(false);

  // Get filtered friends
  const {
    friends,
    totalCount,
    filteredCount,
    isLoading,
    error,
    unfriend,
    refresh,
  } = useFilteredFriends({
    search: searchQuery,
    sortBy,
    onlineOnly,
  });

  // Unfriend state
  const [unfriendingId, setUnfriendingId] = useState<string | null>(null);
  const [confirmUnfriend, setConfirmUnfriend] = useState<FriendInfo | null>(null);

  // Apply limit if specified
  const displayedFriends = limit ? friends.slice(0, limit) : friends;

  // Handle unfriend
  const handleUnfriend = async () => {
    if (!confirmUnfriend) return;

    setUnfriendingId(confirmUnfriend.id);
    try {
      await unfriend(confirmUnfriend.id);
      toast.success(t('friends.unfriended'));
    } catch (err) {
      console.error('Error unfriending:', err);
      toast.error(t('friends.unfriendFailed'));
    } finally {
      setUnfriendingId(null);
      setConfirmUnfriend(null);
    }
  };

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
    <>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {title ?? t('friends.title')}
              {!isLoading && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({totalCount})
                </span>
              )}
            </CardTitle>
            {isLoading && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
          </div>

          {/* Search and Controls */}
          {(showSearch || showControls) && totalCount > 0 && (
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              {/* Search input */}
              {showSearch && (
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder={t('friends.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    aria-label={t('friends.searchAriaLabel')}
                  />
                </div>
              )}

              {/* Controls */}
              {showControls && (
                <div className="flex items-center gap-2">
                  {/* Online only toggle */}
                  <div className="flex items-center gap-2">
                    <Switch
                      id="online-only"
                      checked={onlineOnly}
                      onCheckedChange={setOnlineOnly}
                    />
                    <Label htmlFor="online-only" className="text-sm">
                      {t('friends.onlineOnly')}
                    </Label>
                  </div>

                  {/* Sort dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <SortAsc className="h-4 w-4 mr-2" />
                        {t('friends.sort')}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>{t('friends.sortBy')}</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuRadioGroup value={sortBy} onValueChange={(v) => setSortBy(v as FriendsListSortBy)}>
                        <DropdownMenuRadioItem value="name">
                          {t('friends.sortByName')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="recent">
                          {t('friends.sortByRecent')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="online">
                          {t('friends.sortByOnline')}
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="date_added">
                          {t('friends.sortByDateAdded')}
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          )}
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <FriendsListSkeleton count={limit ?? 5} />
          ) : displayedFriends.length === 0 ? (
            searchQuery || onlineOnly ? (
              <EmptyStateCard
                type="search"
                description={
                  onlineOnly
                    ? t('friends.noOnlineFriends')
                    : t('friends.noSearchResults', { query: searchQuery })
                }
              />
            ) : (
              <EmptyStateCard type="friends" />
            )
          ) : (
            <ul
              className="divide-y divide-border"
              role="list"
              aria-label={t('friends.listAriaLabel')}
            >
              {displayedFriends.map((friend) => (
                <FriendsListItem
                  key={friend.id}
                  friend={friend}
                  onUnfriend={() => setConfirmUnfriend(friend)}
                  onMessage={onMessageClick ? () => onMessageClick(friend.id) : undefined}
                  isUnfriending={unfriendingId === friend.id}
                />
              ))}
            </ul>
          )}

          {/* Showing X of Y */}
          {!isLoading && filteredCount !== totalCount && filteredCount > 0 && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('friends.showingFiltered', { shown: filteredCount, total: totalCount })}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Unfriend Confirmation Dialog */}
      <AlertDialog open={!!confirmUnfriend} onOpenChange={() => setConfirmUnfriend(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('friends.unfriendTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('friends.unfriendConfirm', { name: confirmUnfriend?.display_name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnfriend}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t('friends.unfriend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default FriendsList;
