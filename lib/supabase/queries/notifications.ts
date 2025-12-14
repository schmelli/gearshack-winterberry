/**
 * Notification Queries
 *
 * Feature: 048-shared-loadout-enhancement
 * User Story 7: Comment Notifications
 * Task: T045
 *
 * Query functions for fetching user notifications.
 * Contract: See specs/048-shared-loadout-enhancement/contracts/api.md
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Notification } from '@/types/notifications';

/**
 * Maps database notification row to Notification interface
 */
function mapDbNotificationToNotification(dbNotification: {
  id: string;
  user_id: string;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  message: string;
  is_read: boolean;
  created_at: string;
}): Notification {
  return {
    id: dbNotification.id,
    userId: dbNotification.user_id,
    type: dbNotification.type as Notification['type'],
    referenceType: dbNotification.reference_type,
    referenceId: dbNotification.reference_id,
    message: dbNotification.message,
    isRead: dbNotification.is_read,
    createdAt: new Date(dbNotification.created_at),
  };
}

/**
 * Options for fetching notifications
 */
export interface GetNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * Fetches notifications for the given user
 *
 * @param supabase - Supabase client instance
 * @param userId - ID of the user to fetch notifications for
 * @param options - Query options (unreadOnly, limit)
 * @returns Array of notifications
 *
 * @example
 * ```ts
 * const notifications = await getUserNotifications(supabase, userId, {
 *   unreadOnly: true,
 *   limit: 10
 * });
 * ```
 */
export async function getUserNotifications(
  supabase: SupabaseClient,
  userId: string,
  options: GetNotificationsOptions = {}
): Promise<Notification[]> {
  let query = supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (options.unreadOnly) {
    query = query.eq('is_read', false);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error('[getUserNotifications]', error);
    return [];
  }

  return (data || []).map(mapDbNotificationToNotification);
}

// Export mapper for use in hooks
export { mapDbNotificationToNotification };
