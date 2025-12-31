/**
 * FriendsPanel Component
 *
 * Feature: Community Hub Enhancement
 *
 * Compact panel showing:
 * - Pending friend requests with accept/decline
 * - Online friends list (top 5)
 * - Quick access to full friends page
 */

'use client';

import React from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import { Users, UserPlus, Check, X, ChevronRight, Loader2 } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { getInitials } from '@/lib/utils/formatting';
import { useFriendRequests } from '@/hooks/social/useFriendRequests';
import { useFilteredFriends } from '@/hooks/social/useFriendships';
import { AvatarStatusOverlay } from '@/components/social/OnlineStatusIndicator';
import { toast } from 'sonner';
import type { FriendsPanelProps } from '@/types/community';
import type { FriendRequestWithProfile, FriendInfo } from '@/types/social';

// ============================================================================
// Friend Request Item
// ============================================================================

interface FriendRequestItemProps {
  request: FriendRequestWithProfile;
  onAccept: () => Promise<void>;
  onDecline: () => Promise<void>;
  isProcessing: boolean;
}

function FriendRequestItem({ request, onAccept, onDecline, isProcessing }: FriendRequestItemProps) {
  const t = useTranslations('Community');

  return (
    <div className="flex items-center gap-3 py-2">
      <Avatar className="h-8 w-8">
        {request.sender.avatar_url ? (
          <AvatarImage src={request.sender.avatar_url} alt={request.sender.display_name} />
        ) : null}
        <AvatarFallback className="text-xs bg-primary/10 text-primary">
          {getInitials(request.sender.display_name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{request.sender.display_name}</p>
      </div>

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100 dark:hover:bg-green-900/30"
          onClick={onAccept}
          disabled={isProcessing}
          aria-label={t('friends.accept')}
        >
          {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={onDecline}
          disabled={isProcessing}
          aria-label={t('friends.decline')}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================================================
// Online Friend Item
// ============================================================================

interface OnlineFriendItemProps {
  friend: FriendInfo;
}

function OnlineFriendItem({ friend }: OnlineFriendItemProps) {
  return (
    <Link
      href={`/profile/${friend.id}`}
      className="flex items-center gap-3 py-2 rounded-md hover:bg-muted/50 transition-colors -mx-2 px-2"
    >
      <div className="relative">
        <Avatar className="h-8 w-8">
          {friend.avatar_url ? (
            <AvatarImage src={friend.avatar_url} alt={friend.display_name} />
          ) : null}
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {getInitials(friend.display_name)}
          </AvatarFallback>
        </Avatar>
        <AvatarStatusOverlay userId={friend.id} status="online" size="sm" />
      </div>

      <p className="text-sm font-medium truncate flex-1">{friend.display_name}</p>
    </Link>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export const FriendsPanel = React.memo(function FriendsPanel({ className, compact = false, limit = 5 }: FriendsPanelProps) {
  const t = useTranslations('Community');

  // Friend requests
  const {
    pendingIncoming,
    acceptRequest,
    declineRequest,
    isLoading: isLoadingRequests,
  } = useFriendRequests();

  // Online friends
  const {
    friends,
    totalCount,
    isLoading: isLoadingFriends,
  } = useFilteredFriends({
    onlineOnly: true,
    sortBy: 'online',
  });

  const [processingId, setProcessingId] = React.useState<string | null>(null);

  const handleAccept = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await acceptRequest(requestId);
      toast.success(t('friends.requestAccepted'));
    } catch {
      toast.error(t('friends.acceptFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (requestId: string) => {
    setProcessingId(requestId);
    try {
      await declineRequest(requestId);
      toast.success(t('friends.requestDeclined'));
    } catch {
      toast.error(t('friends.declineFailed'));
    } finally {
      setProcessingId(null);
    }
  };

  const isLoading = isLoadingRequests || isLoadingFriends;
  const displayedFriends = friends.slice(0, limit);
  const displayedRequests = pendingIncoming.slice(0, compact ? 2 : 3);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />
            {t('panels.friends.title')}
          </CardTitle>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Pending Friend Requests */}
        {pendingIncoming.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UserPlus className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-medium">
                {t('panels.friends.requests', { count: pendingIncoming.length })}
              </h4>
            </div>
            <div className="space-y-1">
              {displayedRequests.map((request) => (
                <FriendRequestItem
                  key={request.id}
                  request={request}
                  onAccept={() => handleAccept(request.id)}
                  onDecline={() => handleDecline(request.id)}
                  isProcessing={processingId === request.id}
                />
              ))}
            </div>
            {pendingIncoming.length > displayedRequests.length && (
              <Link
                href="/friends/requests"
                className="text-xs text-primary hover:underline mt-2 inline-block"
              >
                {t('panels.friends.viewAllRequests', {
                  count: pendingIncoming.length - displayedRequests.length,
                })}
              </Link>
            )}
            <Separator className="my-3" />
          </div>
        )}

        {/* Online Friends */}
        <div>
          <h4 className="text-sm font-medium text-muted-foreground mb-2">
            {t('panels.friends.online', { count: friends.length })}
          </h4>

          {displayedFriends.length > 0 ? (
            <div className="space-y-1">
              {displayedFriends.map((friend) => (
                <OnlineFriendItem key={friend.id} friend={friend} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              {t('panels.friends.noOnline')}
            </p>
          )}
        </div>

        {/* View All Link */}
        <Link
          href="/friends"
          className={cn(
            'flex items-center justify-between py-2 px-3 -mx-3 rounded-md',
            'text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors'
          )}
        >
          <span>{t('panels.friends.viewAll', { count: totalCount })}</span>
          <ChevronRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
});

export default FriendsPanel;
