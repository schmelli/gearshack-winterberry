/**
 * NotificationMenu Component
 *
 * Feature: 048-shared-loadout-enhancement, Gear enrichment system
 * Extracted from SiteHeader.tsx for better separation of concerns
 *
 * Handles notification display, marking as read, and navigation logic.
 * Supports gear enrichment notifications with Accept/Dismiss actions.
 */

'use client';

import { useCallback } from 'react';
import { Bell, Check, X, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotificationMenuProps {
  userId: string | null;
  className?: string;
}

export function NotificationMenu({ userId, className }: NotificationMenuProps) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    processingEnrichmentId,
    processEnrichmentAction,
  } = useNotifications(userId);
  const router = useRouter();

  /**
   * Handles click/keyboard navigation for non-enrichment notifications
   */
  const handleNotificationActivate = useCallback(
    async (
      notificationId: string,
      type: string,
      referenceId: string | null,
      referenceType: string | null
    ) => {
      // Don't handle for gear enrichment (uses buttons instead)
      if (type === 'gear_enrichment') {
        return;
      }

      // Mark notification as read
      await markAsRead(notificationId);

      // Handle navigation based on notification type
      if (type === 'loadout_comment' && referenceId) {
        const shareToken = referenceType;
        // Validate share token format (UUID or alphanumeric, no underscores)
        const isValidToken =
          shareToken &&
          typeof shareToken === 'string' &&
          shareToken.length > 0 &&
          /^[a-zA-Z0-9-]+$/.test(shareToken);

        if (isValidToken) {
          router.push(`/shakedown/${shareToken}`);
        }
      } else if (type === 'offer_received' && referenceId) {
        // Navigate to offers page with offer ID to auto-open detail sheet
        router.push(`/offers?offerId=${referenceId}`);
      }
    },
    [markAsRead, router]
  );

  /**
   * Keyboard handler for accessible notification activation
   */
  const handleNotificationKeyDown = useCallback(
    (
      event: React.KeyboardEvent,
      notificationId: string,
      type: string,
      referenceId: string | null,
      referenceType: string | null
    ) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        handleNotificationActivate(notificationId, type, referenceId, referenceType);
      }
    },
    [handleNotificationActivate]
  );

  /**
   * Handles enrichment actions (accept/dismiss) using the hook
   */
  const handleEnrichmentAction = useCallback(
    async (
      notificationId: string,
      suggestionId: string,
      action: 'accept' | 'dismiss'
    ) => {
      const result = await processEnrichmentAction(notificationId, suggestionId, action);

      if (result.success) {
        if (action === 'accept' && result.updatedFields?.length) {
          toast.success(`Updated: ${result.updatedFields.join(', ')}`);
        } else {
          toast.success(
            action === 'accept'
              ? 'Gear item updated with GearGraph data'
              : 'Suggestion dismissed'
          );
        }
      } else {
        toast.error(result.error || 'Failed to process suggestion');
      }
    },
    [processEnrichmentAction]
  );

  // Don't render if no user
  if (!userId) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'relative text-white hover:bg-white/10 hover:text-white',
            className
          )}
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span
              className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white"
              aria-hidden="true"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold" id="notifications-heading">
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>
        <div
          className="max-h-[400px] overflow-y-auto"
          role="list"
          aria-labelledby="notifications-heading"
        >
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => {
              const isEnrichment = notification.type === 'gear_enrichment';
              const isProcessing = processingEnrichmentId === notification.referenceId;
              const isClickable = !isEnrichment;

              return (
                <div
                  key={notification.id}
                  role="listitem"
                  tabIndex={isClickable ? 0 : undefined}
                  className={cn(
                    'w-full border-b px-4 py-3 transition-colors outline-none',
                    !notification.isRead && 'bg-accent/50',
                    isClickable && 'cursor-pointer hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset'
                  )}
                  onClick={
                    isClickable
                      ? () =>
                          handleNotificationActivate(
                            notification.id,
                            notification.type,
                            notification.referenceId,
                            notification.referenceType
                          )
                      : undefined
                  }
                  onKeyDown={
                    isClickable
                      ? (e) =>
                          handleNotificationKeyDown(
                            e,
                            notification.id,
                            notification.type,
                            notification.referenceId,
                            notification.referenceType
                          )
                      : undefined
                  }
                  aria-label={`${notification.message}, ${formatDistanceToNow(notification.createdAt, { addSuffix: true })}${!notification.isRead ? ', unread' : ''}`}
                >
                  <div className="flex gap-3">
                    <div className="flex-1 space-y-2">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </p>

                      {/* Enrichment action buttons with improved touch targets */}
                      {isEnrichment && notification.referenceId && (
                        <div className="flex gap-2 pt-1">
                          <Button
                            size="sm"
                            onClick={() =>
                              handleEnrichmentAction(
                                notification.id,
                                notification.referenceId!,
                                'accept'
                              )
                            }
                            disabled={isProcessing}
                            className="h-9 min-w-[72px] text-xs"
                            aria-label="Accept suggested data"
                          >
                            {isProcessing ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="mr-1 h-3 w-3" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleEnrichmentAction(
                                notification.id,
                                notification.referenceId!,
                                'dismiss'
                              )
                            }
                            disabled={isProcessing}
                            className="h-9 min-w-[72px] text-xs"
                            aria-label="Dismiss suggestion"
                          >
                            {isProcessing ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <X className="mr-1 h-3 w-3" />
                            )}
                            Dismiss
                          </Button>
                        </div>
                      )}
                    </div>
                    {!notification.isRead && !isEnrichment && (
                      <div
                        className="mt-1 h-2 w-2 rounded-full bg-blue-500"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
