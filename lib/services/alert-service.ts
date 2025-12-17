/**
 * Alert delivery service
 * Feature: 050-price-tracking (US2)
 * Date: 2025-12-17
 */

import { createClient } from '@/lib/supabase/server';
import type { AlertType, PriceAlert } from '@/types/price-tracking';

interface CreateAlertParams {
  user_id: string;
  tracking_id?: string;
  offer_id?: string;
  alert_type: AlertType;
  title: string;
  message: string;
  link_url?: string;
}

/**
 * Create and send price alert
 */
export async function sendPriceAlert(params: CreateAlertParams): Promise<void> {
  const supabase = await createClient();

  // Get user alert preferences
  const { data: prefs } = await supabase
    .from('alert_preferences')
    .select('*')
    .eq('user_id', params.user_id)
    .single();

  // Check if alert type is enabled
  if (prefs) {
    const typeEnabled = {
      price_drop: prefs.price_drop_enabled,
      local_shop_available: prefs.local_shop_enabled,
      community_member_available: prefs.community_enabled,
      personal_offer: prefs.personal_offer_enabled,
    }[params.alert_type];

    if (!typeEnabled) {
      console.log(`Alert type ${params.alert_type} disabled for user ${params.user_id}`);
      return;
    }

    // Check quiet hours
    if (prefs.quiet_hours_start && prefs.quiet_hours_end) {
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      if (currentTime >= prefs.quiet_hours_start && currentTime <= prefs.quiet_hours_end) {
        console.log(`Quiet hours active for user ${params.user_id}, skipping alert`);
        return;
      }
    }
  }

  // Create alert record using transaction function (Review fix #9)
  const { data: alertId, error: alertError } = await supabase.rpc('create_price_alert', {
    p_user_id: params.user_id,
    p_tracking_id: params.tracking_id || undefined,
    p_offer_id: params.offer_id || undefined,
    p_alert_type: params.alert_type,
    p_title: params.title,
    p_message: params.message,
    p_link_url: params.link_url || undefined,
    p_send_push: prefs?.push_enabled ?? true,
    p_send_email: prefs?.email_enabled ?? false,
  });

  if (alertError || !alertId) {
    console.error('Failed to create alert:', alertError);
    throw alertError || new Error('No alert ID returned');
  }

  // Enqueue notifications for delivery (Review fix #10: Queue with retry)
  if (prefs?.push_enabled) {
    try {
      await supabase.rpc('enqueue_alert_delivery', {
        p_alert_id: alertId as string,
        p_delivery_channel: 'push',
      });
    } catch (err) {
      console.error('Failed to enqueue push notification:', err);
    }
  }

  if (prefs?.email_enabled) {
    try {
      await supabase.rpc('enqueue_alert_delivery', {
        p_alert_id: alertId as string,
        p_delivery_channel: 'email',
      });
    } catch (err) {
      console.error('Failed to enqueue email alert:', err);
    }
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(alert: PriceAlert): Promise<void> {
  try {
    // TODO: Integrate with push notification service (e.g., Firebase Cloud Messaging, OneSignal)
    console.log('Push notification sent:', alert.title);

    const supabase = await createClient();
    await supabase
      .from('price_alerts')
      .update({ push_sent_at: new Date().toISOString() })
      .eq('id', alert.id);
  } catch (error) {
    console.error('Failed to send push notification:', error);
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(alert: PriceAlert): Promise<void> {
  try {
    // TODO: Integrate with email service (e.g., SendGrid, Resend)
    console.log('Email alert sent:', alert.title);

    const supabase = await createClient();
    await supabase
      .from('price_alerts')
      .update({ email_sent_at: new Date().toISOString() })
      .eq('id', alert.id);
  } catch (error) {
    console.error('Failed to send email alert:', error);
  }
}

/**
 * Send personal offer alert (convenience wrapper for US5)
 */
export async function sendPersonalOfferAlert(
  userId: string,
  offerId: string,
  partnerName: string,
  productName: string,
  offerPrice: number,
  originalPrice: number | null,
  productUrl: string
): Promise<void> {
  const discount = originalPrice
    ? Math.round(((originalPrice - offerPrice) / originalPrice) * 100)
    : null;

  const message = discount
    ? `${partnerName} has a personal offer: ${discount}% off ${productName}`
    : `${partnerName} has a personal offer for ${productName}`;

  await sendPriceAlert({
    user_id: userId,
    offer_id: offerId,
    alert_type: 'personal_offer',
    title: `💎 ${partnerName} has a personal offer for you`,
    message,
    link_url: productUrl,
  });
}
