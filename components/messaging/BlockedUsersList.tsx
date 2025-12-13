/**
 * BlockedUsersList - Blocked Users Management Component
 *
 * Feature: 046-user-messaging-system
 * Task: T049
 *
 * Displays and manages the user's blocked users list.
 */

'use client';

import { useState } from 'react';
import { ShieldOff, Loader2, Users } from 'lucide-react';
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
import { useBlockedUsers, type BlockedUserInfo } from '@/hooks/messaging/useBlockedUsers';
import { formatDistanceToNow } from 'date-fns';

/**
 * Component for viewing and managing blocked users.
 */
export function BlockedUsersList() {
  const { blockedUsers, isLoading, error, unblockUser } = useBlockedUsers();
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [confirmUnblock, setConfirmUnblock] = useState<BlockedUserInfo | null>(null);

  const handleUnblockUser = async () => {
    if (!confirmUnblock) return;

    setUnblockingId(confirmUnblock.id);
    await unblockUser(confirmUnblock.id);
    setUnblockingId(null);
    setConfirmUnblock(null);
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

  if (blockedUsers.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Users className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No blocked users</p>
        <p className="text-xs text-muted-foreground/70">
          When you block someone, they will appear here
        </p>
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2 pr-4">
          {blockedUsers.map((blockedUser) => {
            const initials =
              blockedUser.display_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .toUpperCase()
                .slice(0, 2) || '?';

            return (
              <Card
                key={blockedUser.id}
                className="transition-colors"
              >
                <CardContent className="flex items-center gap-3 p-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage
                      src={blockedUser.avatar_url ?? undefined}
                      alt={blockedUser.display_name}
                    />
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{blockedUser.display_name}</p>
                    <p className="text-xs text-muted-foreground">
                      Blocked {formatDistanceToNow(new Date(blockedUser.blocked_at), { addSuffix: true })}
                    </p>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmUnblock(blockedUser)}
                    disabled={unblockingId === blockedUser.id}
                  >
                    {unblockingId === blockedUser.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <ShieldOff className="mr-1 h-4 w-4" />
                        Unblock
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      <AlertDialog
        open={!!confirmUnblock}
        onOpenChange={(open) => !open && setConfirmUnblock(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unblock User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unblock{' '}
              <strong>{confirmUnblock?.display_name}</strong>? They will be able
              to message you and find you in search again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnblockUser}>
              Unblock
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
