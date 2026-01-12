/**
 * FriendsList - Friends Management Component
 *
 * Feature: 046-user-messaging-system
 * Task: T024
 *
 * Displays user's friends with quick message action and remove option.
 */

'use client';

import { useState } from 'react';
import { MessageCircle, UserMinus, Users, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
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
import { useFriends, type MessagingFriend } from '@/hooks/messaging/useFriends';
import { usePresenceStatus } from '@/hooks/messaging/usePresenceStatus';
import { formatDistanceToNow } from 'date-fns';

interface FriendsListProps {
  /** Callback when user wants to message a friend */
  onMessageFriend?: (friendId: string, displayName: string) => void;
}

export function FriendsList({ onMessageFriend }: FriendsListProps) {
  const { friends, isLoading, error, removeFriend } = useFriends();
  const { isUserOnline } = usePresenceStatus();
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<MessagingFriend | null>(null);

  const handleRemoveFriend = async () => {
    if (!confirmRemove) return;

    setRemovingId(confirmRemove.id);
    await removeFriend(confirmRemove.id);
    setRemovingId(null);
    setConfirmRemove(null);
  };

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  if (friends.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Users className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No friends yet</p>
        <p className="text-xs text-muted-foreground/70">
          Find GearShack members and add them as friends
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="h-[400px]">
        <div className="space-y-2 pr-4">
          {friends.map((friend) => {
            const isOnline = isUserOnline(friend.id);
            const initials =
              friend.display_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?';

            return (
              <Card
                key={friend.id}
                className="transition-colors hover:bg-muted/50"
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage
                        src={friend.avatar_url ?? undefined}
                        alt={friend.display_name}
                      />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    {isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-background bg-green-500" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{friend.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {isOnline
                        ? 'Online'
                        : `Added ${formatDistanceToNow(new Date(friend.added_at), { addSuffix: true })}`}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onMessageFriend?.(friend.id, friend.display_name)
                      }
                      title="Send message"
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setConfirmRemove(friend)}
                      disabled={removingId === friend.id}
                      title="Remove friend"
                    >
                      {removingId === friend.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <UserMinus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog
        open={!!confirmRemove}
        onOpenChange={(open) => !open && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{' '}
              <strong>{confirmRemove?.display_name}</strong> from your friends?
              You can add them back later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveFriend}>
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
