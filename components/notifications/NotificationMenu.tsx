/**
 * NotificationMenu Component
 *
 * Feature: 048-shared-loadout-enhancement
 * Extracted from SiteHeader.tsx for better separation of concerns
 *
 * Handles notification display, marking as read, and navigation logic.
 */

'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';

interface NotificationMenuProps {
  userId: string | null;
  className?: string;
}

export function NotificationMenu({ userId, className }: NotificationMenuProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { notifications, unreadCount, markAsRead } = useNotifications(userId);
  const router = useRouter();

  const handleNotificationClick = async (notificationId: string, type: string, referenceId: string | null, referenceType: string | null) => {
    // Mark notification as read
    await markAsRead(notificationId);

    // Handle navigation based on notification type
    if (type === 'loadout_comment' && referenceId) {
      // For loadout comments, referenceType should contain the share_token
      // Check that we have a valid share token (not just the type itself)
      const shareToken = referenceType;
      // More explicit check: ensure shareToken is a non-empty string
      // and looks like a valid token (not a type name)
      if (
        shareToken &&
        typeof shareToken === 'string' &&
        shareToken.length > 0 &&
        !shareToken.includes('_') // Type names typically have underscores
      ) {
        setNotificationsOpen(false);
        router.push(`/shakedown/${shareToken}`);
      }
    }
  };

  // Don't render if no user
  if (!userId) {
    return null;
  }

  return (
    <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative text-white hover:bg-white/10 hover:text-white',
            className
          )}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <button
                key={notification.id}
                onClick={() => handleNotificationClick(
                  notification.id,
                  notification.type,
                  notification.referenceId,
                  notification.referenceType
                )}
                className={cn(
                  'w-full border-b px-4 py-3 text-left transition-colors hover:bg-accent',
                  !notification.isRead && 'bg-accent/50'
                )}
              >
                <div className="flex gap-3">
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                    </p>
                  </div>
                  {!notification.isRead && (
                    <div className="mt-1 h-2 w-2 rounded-full bg-blue-500" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
