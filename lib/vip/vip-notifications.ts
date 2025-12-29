/**
 * VIP Notification Helpers
 *
 * Feature: 052-vip-loadouts
 * Task: T016
 *
 * Helpers for VIP-related notifications.
 * Integrates with the existing notification system.
 */

import { createClient } from '@/lib/supabase/client';

// =============================================================================
// Types
// =============================================================================

export type VipNotificationType =
  | 'vip_new_loadout'
  | 'vip_claimed'
  | 'vip_archived';

export interface VipNotificationData {
  vip_id: string;
  vip_name: string;
  vip_slug: string;
  loadout_id?: string;
  loadout_name?: string;
  loadout_slug?: string;
}

export interface NotifyResult {
  success: boolean;
  notificationCount: number;
  error?: string;
}

// =============================================================================
// Server-Side Notification Functions
// =============================================================================

/**
 * Notify all followers when a VIP publishes a new loadout
 * This is called from the admin publish API
 */
export async function notifyVipFollowersOfNewLoadout(
  vipId: string,
  loadoutId: string
): Promise<NotifyResult> {
  const supabase = createClient();

  try {
    // Call the database function that handles bulk notification creation
    const { data, error } = await supabase.rpc('notify_vip_followers', {
      p_vip_id: vipId,
      p_loadout_id: loadoutId,
    });

    if (error) throw error;

    return {
      success: true,
      notificationCount: data ?? 0,
    };
  } catch (error) {
    console.error('Failed to notify VIP followers:', error);
    return {
      success: false,
      notificationCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Notify all followers when a VIP claims their account
 */
export async function notifyVipClaimed(vipId: string): Promise<NotifyResult> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase.rpc('notify_vip_claimed', {
      p_vip_id: vipId,
    });

    if (error) throw error;

    return {
      success: true,
      notificationCount: data ?? 0,
    };
  } catch (error) {
    console.error('Failed to notify VIP claimed:', error);
    return {
      success: false,
      notificationCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Notify followers when a VIP is archived (takedown)
 */
export async function notifyVipArchived(
  vipId: string,
  vipName: string,
  vipSlug: string
): Promise<NotifyResult> {
  const supabase = createClient();

  try {
    // Get all followers
    const { data: followers, error: followersError } = await (supabase as any)
      .from('vip_follows')
      .select('follower_id')
      .eq('vip_id', vipId);

    if (followersError) throw followersError;

    if (!followers || followers.length === 0) {
      return { success: true, notificationCount: 0 };
    }

    // Create notifications for each follower
    const notifications = followers.map((f) => ({
      user_id: f.follower_id,
      type: 'vip_archived' as const,
      data: {
        vip_id: vipId,
        vip_name: vipName,
        vip_slug: vipSlug,
      },
      created_at: new Date().toISOString(),
    }));

    const { error: insertError } = await (supabase as any)
      .from('notifications')
      .insert(notifications);

    if (insertError) throw insertError;

    return {
      success: true,
      notificationCount: notifications.length,
    };
  } catch (error) {
    console.error('Failed to notify VIP archived:', error);
    return {
      success: false,
      notificationCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =============================================================================
// Notification Display Helpers
// =============================================================================

/**
 * Get display message for a VIP notification
 */
export function getVipNotificationMessage(
  type: VipNotificationType,
  data: VipNotificationData,
  locale: string = 'en'
): string {
  // These would typically come from translation files
  // For now, using English strings
  switch (type) {
    case 'vip_new_loadout':
      return `${data.vip_name} published a new loadout: ${data.loadout_name}`;
    case 'vip_claimed':
      return `${data.vip_name} joined GearShack!`;
    case 'vip_archived':
      return `${data.vip_name} is no longer available on GearShack`;
    default:
      return 'New VIP notification';
  }
}

/**
 * Get the URL to navigate to when clicking a VIP notification
 */
export function getVipNotificationUrl(
  type: VipNotificationType,
  data: VipNotificationData,
  locale: string = 'en'
): string {
  switch (type) {
    case 'vip_new_loadout':
      if (data.loadout_slug) {
        return `/${locale}/vip/${data.vip_slug}/${data.loadout_slug}`;
      }
      return `/${locale}/vip/${data.vip_slug}`;
    case 'vip_claimed':
      return `/${locale}/vip/${data.vip_slug}`;
    case 'vip_archived':
      // Link to VIP discovery page since the specific VIP is gone
      return `/${locale}/community`;
    default:
      return `/${locale}/community`;
  }
}

/**
 * Get icon for VIP notification type (lucide-react icon names)
 */
export function getVipNotificationIcon(type: VipNotificationType): string {
  switch (type) {
    case 'vip_new_loadout':
      return 'Backpack';
    case 'vip_claimed':
      return 'BadgeCheck';
    case 'vip_archived':
      return 'UserX';
    default:
      return 'Bell';
  }
}

// =============================================================================
// Notification Preference Helpers
// =============================================================================

/**
 * Check if user wants VIP notifications
 * This integrates with the existing notification preferences system
 */
export async function userWantsVipNotifications(userId: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('notification_preferences')
      .eq('id', userId)
      .single();

    if (!profile?.notification_preferences) return true; // Default to enabled

    const prefs = profile.notification_preferences as Record<string, boolean>;
    return prefs.vip_updates !== false; // Default to enabled if not set
  } catch {
    return true; // Default to enabled on error
  }
}

/**
 * Update user's VIP notification preference
 */
export async function setVipNotificationPreference(
  userId: string,
  enabled: boolean
): Promise<void> {
  const supabase = createClient();

  // Get current preferences
  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single();

  const currentPrefs = (profile?.notification_preferences ?? {}) as Record<string, boolean>;

  // Update VIP preference
  const { error } = await (supabase as any)
    .from('profiles')
    .update({
      notification_preferences: {
        ...currentPrefs,
        vip_updates: enabled,
      },
    })
    .eq('id', userId);

  if (error) throw error;
}
