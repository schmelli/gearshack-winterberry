/**
 * NotificationMenu Component
 *
 * Feature: 048-shared-loadout-enhancement, Gear enrichment system
 * Extracted from SiteHeader.tsx for better separation of concerns
 *
 * Handles notification display, marking as read, and navigation logic.
 * Enrichment notifications now open a modal for reviewing all proposals.
 */

'use client';

import { useState, useCallback } from 'react';
import { Bell, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useNotifications } from '@/hooks/useNotifications';
import { useRouter } from '@/i18n/navigation';
import { cn } from '@/lib/utils';
import { EnrichmentProposalsModal } from './EnrichmentProposalsModal';

interface NotificationMenuProps {
  userId: string | null;
  className?: string;
}

export function NotificationMenu({ userId, className }: NotificationMenuProps) {
  const t = useTranslations('Notifications');
  const {
    notifications,
    unreadCount,
    markAsRead,
    deleteAllEnrichmentNotifications,
  } = useNotifications(userId);
  const router = useRouter();

  // Modal state for enrichment proposals
  const [showEnrichmentModal, setShowEnrichmentModal] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);

  /**
   * Handles click/keyboard navigation for notifications
   */
  const handleNotificationActivate = useCallback(
    async (
      notificationId: string,
      type: string,
      referenceId: string | null,
      referenceType: string | null
    ) => {
      // Handle enrichment notifications - open modal
      if (type === 'gear_enrichment') {
        setPopoverOpen(false);
        setShowEnrichmentModal(true);
        // Mark as read when opening modal
        await markAsRead(notificationId);
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
   * Handle when all enrichment proposals are resolved
   * Deletes all enrichment notifications from the database and local state
   */
  const handleAllEnrichmentResolved = useCallback(async () => {
    // Delete all enrichment notifications when all suggestions are resolved
    await deleteAllEnrichmentNotifications();
  }, [deleteAllEnrichmentNotifications]);

  // Don't render if no user
  if (!userId) {
    return null;
  }

  return (
    <>
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
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
              {t('title')}
            </h3>
            {unreadCount > 0 && (
              <span className="text-xs text-muted-foreground">
                {unreadCount} {t('unread')}
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
                {t('noNotifications')}
              </div>
            ) : (
              notifications.map((notification) => {
                const isEnrichment = notification.type === 'gear_enrichment';

                return (
                  <div
                    key={notification.id}
                    role="listitem"
                    tabIndex={0}
                    className={cn(
                      'w-full border-b px-4 py-3 transition-colors outline-none cursor-pointer',
                      'hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                      !notification.isRead && 'bg-accent/50'
                    )}
                    onClick={() =>
                      handleNotificationActivate(
                        notification.id,
                        notification.type,
                        notification.referenceId,
                        notification.referenceType
                      )
                    }
                    onKeyDown={(e) =>
                      handleNotificationKeyDown(
                        e,
                        notification.id,
                        notification.type,
                        notification.referenceId,
                        notification.referenceType
                      )
                    }
                    aria-label={`${notification.message}, ${formatDistanceToNow(notification.createdAt, { addSuffix: true })}${!notification.isRead ? ', unread' : ''}`}
                  >
                    <div className="flex gap-3">
                      {/* Enrichment icon indicator */}
                      {isEnrichment && (
                        <div className="flex-shrink-0 mt-0.5">
                          <Sparkles className="h-4 w-4 text-forest-600" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm">{notification.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                        </p>
                        {/* Hint for enrichment notifications */}
                        {isEnrichment && (
                          <p className="text-xs text-forest-600 font-medium">
                            {t('enrichmentModal.description')}
                          </p>
                        )}
                      </div>
                      {!notification.isRead && (
                        <div
                          className="mt-1 h-2 w-2 rounded-full bg-blue-500 flex-shrink-0"
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

      {/* Enrichment Proposals Modal */}
      <EnrichmentProposalsModal
        open={showEnrichmentModal}
        onOpenChange={setShowEnrichmentModal}
        onAllResolved={handleAllEnrichmentResolved}
      />
    </>
  );
}
