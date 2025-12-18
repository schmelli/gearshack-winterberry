/**
 * Cron job: Process alert delivery queue
 * Feature: 050-price-tracking (Review fix #10)
 * Date: 2025-12-17
 * Schedule: Every 2 minutes
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { RATE_LIMITING } from '@/lib/constants/price-tracking';

interface DeliveryTask {
  queue_id: string;
  alert_id: string;
  delivery_channel: 'push' | 'email';
  attempt_count: number;
  alert_user_id: string;
  alert_title: string;
  alert_message: string;
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get next batch of deliveries to process
    const { data: tasksRaw, error: fetchError } = await supabase.rpc(
      // @ts-ignore - Price tracking RPC function, types will be regenerated after migrations are applied
      'get_next_delivery_batch',
      { p_batch_size: RATE_LIMITING.MAX_CONCURRENT_SEARCHES }
    );

    if (fetchError) {
      console.error('Failed to fetch delivery batch:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch batch' }, { status: 500 });
    }

    const tasks = tasksRaw as any[];
    if (!tasks || tasks.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending deliveries',
        processed: 0,
      });
    }

    console.log(`Processing ${tasks.length} alert deliveries...`);

    // Process each delivery task
    const results = await Promise.allSettled(
      (tasks as DeliveryTask[]).map((task) => processDelivery(task, supabase))
    );

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    // Clean up old records (if this is the first run of the hour)
    const now = new Date();
    if (now.getMinutes() < 2) {
      // @ts-ignore - Price tracking RPC function
      const { data: cleanupCount } = await supabase.rpc('cleanup_delivery_queue');
      console.log(`Cleaned up ${cleanupCount} old delivery records`);
    }

    return NextResponse.json({
      success: true,
      processed: tasks.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Alert queue cron job error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Process a single delivery task
 */
async function processDelivery(task: DeliveryTask, supabase: any): Promise<void> {
  try {
    if (task.delivery_channel === 'push') {
      await sendPushNotification(task);
    } else if (task.delivery_channel === 'email') {
      await sendEmailAlert(task);
    }

    // Mark as successful
    await supabase.rpc('mark_delivery_success', {
      p_queue_id: task.queue_id,
    });

    console.log(`✓ Delivered ${task.delivery_channel} for alert ${task.alert_id}`);
  } catch (error) {
    // Mark as failed (will retry if attempts remaining)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    await supabase.rpc('mark_delivery_failed', {
      p_queue_id: task.queue_id,
      p_error_message: errorMessage,
    });

    console.error(
      `✗ Failed to deliver ${task.delivery_channel} for alert ${task.alert_id} (attempt ${task.attempt_count}):`,
      errorMessage
    );

    throw error;
  }
}

/**
 * Send push notification
 */
async function sendPushNotification(task: DeliveryTask): Promise<void> {
  // TODO: Integrate with push notification service (Firebase Cloud Messaging, OneSignal, etc.)
  // For now, just simulate delivery
  console.log(`[PUSH] ${task.alert_title}: ${task.alert_message}`);

  // Simulate occasional failures for testing
  if (Math.random() < 0.1 && task.attempt_count === 1) {
    throw new Error('Simulated push notification failure');
  }
}

/**
 * Send email alert
 */
async function sendEmailAlert(task: DeliveryTask): Promise<void> {
  // TODO: Integrate with email service (SendGrid, Resend, etc.)
  // For now, just simulate delivery
  console.log(`[EMAIL] ${task.alert_title}: ${task.alert_message}`);

  // Simulate occasional failures for testing
  if (Math.random() < 0.1 && task.attempt_count === 1) {
    throw new Error('Simulated email delivery failure');
  }
}
