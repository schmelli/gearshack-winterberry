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

  // Create alert record
  const { data: alert, error: alertError } = await supabase
    .from('price_alerts')
    .insert({
      ...params,
      sent_via_push: prefs?.push_enabled ?? true,
      sent_via_email: prefs?.email_enabled ?? false,
    })
    .select()
    .single();

  if (alertError) {
    console.error('Failed to create alert:', alertError);
    throw alertError;
  }

  // Send push notification if enabled
  if (prefs?.push_enabled) {
    await sendPushNotification(alert);
  }

  // Send email if enabled
  if (prefs?.email_enabled) {
    await sendEmailAlert(alert);
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
