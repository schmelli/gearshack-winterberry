/**
 * Batch operations to prevent N+1 queries
 * Feature: 050-price-tracking (Review fix #12)
 * Date: 2025-12-17
 */

import { createClient, createServiceRoleClient } from '@/lib/supabase/server';
import type { AlertPreferences } from '@/types/price-tracking';

/**
 * Batch fetch alert preferences for multiple users
 */
export async function batchGetAlertPreferences(
  userIds: string[]
): Promise<Map<string, AlertPreferences>> {
  if (userIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: prefs, error } = await supabase
    .from('alert_preferences')
    .select('*')
    .in('user_id', userIds);

  if (error) {
    console.error('Failed to batch fetch alert preferences:', error);
    return new Map();
  }

  // Create map for quick lookup
  const prefsMap = new Map<string, AlertPreferences>();
  prefs?.forEach((pref) => {
    prefsMap.set(pref.user_id, pref as AlertPreferences);
  });

  return prefsMap;
}

/**
 * Batch create price alerts (avoids N+1 queries for preferences)
 */
export async function batchCreatePriceAlerts(
  alerts: Array<{
    user_id: string;
    tracking_id?: string;
    offer_id?: string;
    alert_type: 'price_drop' | 'local_shop_available' | 'community_member_available' | 'personal_offer';
    title: string;
    message: string;
    link_url?: string;
  }>
): Promise<{ created: number; failed: number }> {
  if (alerts.length === 0) {
    return { created: 0, failed: 0 };
  }

  const supabase = createServiceRoleClient();

  // Batch fetch alert preferences for all users
  const uniqueUserIds = [...new Set(alerts.map((a) => a.user_id))];
  const prefsMap = await batchGetAlertPreferences(uniqueUserIds);

  // Filter and prepare alerts based on user preferences
  const validAlerts = alerts.filter((alert) => {
    const prefs = prefsMap.get(alert.user_id);

    // Check if alert type is enabled
    if (prefs) {
      const typeEnabled = {
        price_drop: prefs.price_drop_enabled,
        local_shop_available: prefs.local_shop_enabled,
        community_member_available: prefs.community_enabled,
        personal_offer: prefs.personal_offer_enabled,
      }[alert.alert_type];

      if (!typeEnabled) {
        console.log(`Alert type ${alert.alert_type} disabled for user ${alert.user_id}`);
        return false;
      }

      // Check quiet hours (handles overnight ranges like 22:00 to 06:00)
      if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
        const now = new Date();
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        const start = prefs.quiet_hours_start;
        const end = prefs.quiet_hours_end;

        const isInQuietHours = start <= end
          ? currentTime >= start && currentTime <= end
          : currentTime >= start || currentTime <= end;

        if (isInQuietHours) {
          console.log(`Quiet hours active for user ${alert.user_id}, skipping alert`);
          return false;
        }
      }
    }

    return true;
  });

  if (validAlerts.length === 0) {
    return { created: 0, failed: 0 };
  }

  // Batch insert alerts
  const alertRecords = validAlerts.map((alert) => {
    const prefs = prefsMap.get(alert.user_id);
    return {
      ...alert,
      sent_via_push: prefs?.push_enabled ?? true,
      sent_via_email: prefs?.email_enabled ?? false,
    };
  });

  const { data: createdAlerts, error } = await supabase
    .from('price_alerts')
    .insert(alertRecords)
    .select('id, user_id');

  if (error) {
    console.error('Failed to batch create alerts:', error);
    return { created: 0, failed: validAlerts.length };
  }

  // Batch enqueue delivery tasks
  if (createdAlerts && createdAlerts.length > 0) {
    const deliveryTasks: Array<{ p_alert_id: string; p_delivery_channel: string }> = [];

    createdAlerts.forEach((alert) => {
      const prefs = prefsMap.get(alert.user_id);

      if (prefs?.push_enabled) {
        deliveryTasks.push({
          p_alert_id: alert.id,
          p_delivery_channel: 'push',
        });
      }

      if (prefs?.email_enabled) {
        deliveryTasks.push({
          p_alert_id: alert.id,
          p_delivery_channel: 'email',
        });
      }
    });

    // Enqueue all delivery tasks in parallel
    await Promise.allSettled(
      deliveryTasks.map((task) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (supabase as any).rpc('enqueue_alert_delivery', task)
      )
    );
  }

  return { created: createdAlerts?.length || 0, failed: 0 };
}

/**
 * Batch fetch gear item names for tracking items
 */
export async function batchGetGearItemNames(
  gearItemIds: string[]
): Promise<Map<string, string>> {
  if (gearItemIds.length === 0) {
    return new Map();
  }

  const supabase = await createClient();

  const { data: items, error } = await supabase
    .from('gear_items')
    .select('id, name')
    .in('id', gearItemIds);

  if (error) {
    console.error('Failed to batch fetch gear item names:', error);
    return new Map();
  }

  const namesMap = new Map<string, string>();
  items?.forEach((item) => {
    namesMap.set(item.id, item.name);
  });

  return namesMap;
}

/**
 * Batch check conversions (wishlist → inventory)
 */
export async function batchCheckConversions(
  trackingItems: Array<{ tracking_id: string; gear_item_id: string; user_id: string }>
): Promise<string[]> {
  if (trackingItems.length === 0) {
    return [];
  }

  const supabase = createServiceRoleClient();

  // Get all gear items in one query
  const gearItemIds = trackingItems.map((t) => t.gear_item_id);

  const { data: gearItems, error: gearItemsError } = await supabase
    .from('gear_items')
    .select('id, user_id, status')
    .in('id', gearItemIds)
    .eq('status', 'own');

  if (gearItemsError) {
    console.error('Failed to fetch gear items for conversion check:', gearItemsError);
    return [];
  }

  if (!gearItems || gearItems.length === 0) {
    return [];
  }

  // Find tracking items that converted
  const convertedItemIds = new Set(gearItems.map((item) => item.id));
  const convertedTracking = trackingItems.filter((t) =>
    convertedItemIds.has(t.gear_item_id)
  );

  if (convertedTracking.length === 0) {
    return [];
  }

  // Batch create conversion alerts
  const alerts = convertedTracking.map((t) => ({
    user_id: t.user_id,
    tracking_id: t.tracking_id,
    alert_type: 'price_drop' as const,
    title: 'Purchase tracked',
    message: 'Item moved from wishlist to inventory',
    link_url: `/inventory/${t.gear_item_id}`,
  }));

  await batchCreatePriceAlerts(alerts);

  // Batch disable tracking for converted items
  const trackingIds = convertedTracking.map((t) => t.tracking_id);
  const { error: updateError } = await supabase
    .from('price_tracking')
    .update({ enabled: false })
    .in('id', trackingIds);

  if (updateError) {
    console.error('Failed to disable tracking for converted items:', updateError);
    // Don't throw - alerts were already created, log for monitoring
  }

  console.log(`Tracked ${convertedTracking.length} conversions`);

  return trackingIds;
}
