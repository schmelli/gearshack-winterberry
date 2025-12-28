/**
 * useNotifications Hook
 *
 * Feature: 048-shared-loadout-enhancement
 * User Story 7: Comment Notifications
 * Task: T047
 *
 * Custom hook for managing user notifications with realtime updates.
 * Contract: See specs/048-shared-loadout-enhancement/contracts/api.md
 */

'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getUserNotifications, mapDbNotificationToNotification } from '@/lib/supabase/queries/notifications';
import { markNotificationRead } from '@/app/actions/notifications';
import type { Notification } from '@/types/notifications';

/**
 * Result of processing an enrichment action
 */
export interface EnrichmentActionResult {
  success: boolean;
  updatedFields?: string[];
  error?: string;
}

/**
 * Hook result interface
 */
interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  processingEnrichmentId: string | null;
  markAsRead: (notificationId: string) => Promise<void>;
  refetch: () => Promise<void>;
  processEnrichmentAction: (
    notificationId: string,
    suggestionId: string,
    action: 'accept' | 'dismiss'
  ) => Promise<EnrichmentActionResult>;
}

/**
 * Custom hook for notifications with realtime subscription
 *
 * Fetches initial notifications, subscribes to realtime INSERT events,
 * and provides functions to mark notifications as read.
 *
 * @param userId - ID of the user to fetch notifications for (null if not authenticated)
 * @returns Notifications data, unread count, and helper functions
 *
 * @example
 * ```tsx
 * function NotificationBell() {
 *   const { notifications, unreadCount, markAsRead } = useNotifications(userId);
 *
 *   return (
 *     <button onClick={() => markAsRead(notifications[0].id)}>
 *       Notifications ({unreadCount})
 *     </button>
 *   );
 * }
 * ```
 */
export function useNotifications(userId: string | null): UseNotificationsResult {
  const supabase = useMemo(() => createClient(), []);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingEnrichmentId, setProcessingEnrichmentId] = useState<string | null>(null);

  /**
   * Fetches notifications from the database
   */
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await getUserNotifications(supabase, userId, { limit: 50 });
      setNotifications(data);
    } catch (error) {
      console.error('[useNotifications] Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, supabase]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  /**
   * Realtime subscription for new notifications
   */
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Add new notification to the top of the list
          const newNotification = mapDbNotificationToNotification(payload.new as {
            id: string;
            user_id: string;
            type: string;
            reference_type: string | null;
            reference_id: string | null;
            message: string;
            is_read: boolean;
            created_at: string;
          });

          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  /**
   * Computed unread count
   */
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.isRead).length;
  }, [notifications]);

  /**
   * Marks a notification as read
   */
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const result = await markNotificationRead(notificationId);

      if (result.success) {
        // Optimistically update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
        );
      } else {
        console.error('[useNotifications] Failed to mark as read:', result.error);
      }
    } catch (error) {
      console.error('[useNotifications] Error marking notification as read:', error);
    }
  }, []);

  /**
   * Processes an enrichment action (accept or dismiss).
   * Encapsulates the API call and state management.
   */
  const processEnrichmentAction = useCallback(
    async (
      notificationId: string,
      suggestionId: string,
      action: 'accept' | 'dismiss'
    ): Promise<EnrichmentActionResult> => {
      setProcessingEnrichmentId(suggestionId);

      try {
        const response = await fetch('/api/gear-items/apply-enrichment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suggestion_id: suggestionId,
            action,
            notification_id: notificationId,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMsg = data.error || 'Failed to process enrichment';
          return { success: false, error: errorMsg };
        }

        // Refresh notifications list (notification was deleted by API)
        await fetchNotifications();

        return {
          success: true,
          updatedFields: data.updated_fields,
        };
      } catch (error) {
        console.error('[useNotifications] Enrichment action error:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to process suggestion',
        };
      } finally {
        setProcessingEnrichmentId(null);
      }
    },
    [fetchNotifications]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    processingEnrichmentId,
    markAsRead,
    refetch: fetchNotifications,
    processEnrichmentAction,
  };
}
