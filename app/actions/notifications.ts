'use server';

/**
 * Notification Actions
 *
 * Feature: 048-shared-loadout-enhancement
 * User Story 7: Comment Notifications
 * Task: T046
 *
 * Server actions for notification operations.
 * Contract: See specs/048-shared-loadout-enhancement/contracts/api.md
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Result of marking notification as read
 */
interface MarkNotificationReadResult {
  success: boolean;
  error?: string;
}

/**
 * Marks a notification as read
 *
 * Updates the notification's is_read field to true.
 * Only allows marking notifications that belong to the authenticated user (RLS enforced).
 *
 * @param notificationId - ID of the notification to mark as read
 * @returns Result object indicating success or failure
 *
 * @example
 * ```ts
 * const result = await markNotificationRead(notificationId);
 * if (result.success) {
 *   console.log('Notification marked as read');
 * }
 * ```
 */
export async function markNotificationRead(
  notificationId: string
): Promise<MarkNotificationReadResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id); // RLS backup - ensure user owns notification

    if (error) {
      console.error('[markNotificationRead]', error);
      return { success: false, error: 'Failed to update notification' };
    }

    return { success: true };
  } catch (error) {
    console.error('[markNotificationRead] Unexpected error:', error);
    return { success: false, error: 'Internal error' };
  }
}
