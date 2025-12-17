/**
 * Cron job: Daily price checks for all tracked items
 * Feature: 050-price-tracking (US2)
 * Date: 2025-12-17
 * Schedule: Daily at 2 AM UTC
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { searchAllSources } from '@/lib/external-apis/price-search';
import { compareWithHistory, recordPriceSnapshot } from '@/lib/services/price-comparison-service';
import { sendPersonalOfferAlert } from '@/lib/services/alert-service';
import { batchCreatePriceAlerts, batchCheckConversions } from '@/lib/services/batch-operations';
import { RATE_LIMITING } from '@/lib/constants/price-tracking';
import { createModuleLogger } from '@/lib/utils/logger';
import type { PriceTrackingWithGearItem, PersonalOfferWithPartner } from '@/types/database-helpers';
import PQueue from 'p-queue';

const log = createModuleLogger('cron:check-prices');

// Rate limit concurrent searches
const queue = new PQueue({ concurrency: RATE_LIMITING.MAX_CONCURRENT_SEARCHES });

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // Get all active tracking items
    const { data: trackingItems, error: trackingError } = await supabase
      .from('price_tracking')
      .select(`
        id,
        user_id,
        gear_item_id,
        alerts_enabled,
        gear_items (
          name
        )
      `)
      .eq('enabled', true);

    if (trackingError) {
      log.error('Failed to fetch tracking items', {}, trackingError);
      return NextResponse.json({ error: 'Failed to fetch tracking items' }, { status: 500 });
    }

    if (!trackingItems || trackingItems.length === 0) {
      log.info('No tracking items to process');
      return NextResponse.json({
        success: true,
        message: 'No items to track',
        processed: 0,
      });
    }

    log.info('Starting price check job', { item_count: trackingItems.length });

    // Process each item and collect price drop alerts (Review fix #12: Batch alerts)
    const priceDropAlerts: Array<{
      user_id: string;
      tracking_id: string;
      alert_type: 'price_drop';
      title: string;
      message: string;
      link_url: string;
    }> = [];

    const results = await Promise.allSettled(
      (trackingItems as PriceTrackingWithGearItem[]).map((item) =>
        queue.add(() => processTrackingItem(item, priceDropAlerts))
      )
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Batch create all price drop alerts (Review fix #12)
    if (priceDropAlerts.length > 0) {
      log.info('Creating price drop alerts', { alert_count: priceDropAlerts.length });
      await batchCreatePriceAlerts(priceDropAlerts);
    }

    // Batch check conversions (Review fix #12)
    const conversionData = trackingItems.map((item) => ({
      tracking_id: item.id,
      gear_item_id: item.gear_item_id,
      user_id: item.user_id,
    }));
    await batchCheckConversions(conversionData);

    // Update last_checked_at for all items
    await supabase
      .from('price_tracking')
      .update({ last_checked_at: new Date().toISOString() })
      .in('id', trackingItems.map((item) => item.id));

    log.info('Price check job completed', {
      processed: trackingItems.length,
      successful,
      failed,
    });

    return NextResponse.json({
      success: true,
      processed: trackingItems.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Cron job error', {}, error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single tracking item (Review fix #12: Collects alerts for batching)
 */
async function processTrackingItem(
  item: PriceTrackingWithGearItem,
  priceDropAlerts: Array<{
    user_id: string;
    tracking_id: string;
    alert_type: 'price_drop';
    title: string;
    message: string;
    link_url: string;
  }>
): Promise<void> {
  try {
    const itemName = item.gear_items.name;
    if (!itemName) {
      log.warn('No name found for gear item', {
        tracking_id: item.id,
        gear_item_id: item.gear_item_id,
      });
      return;
    }

    // Search all sources
    const searchResults = await searchAllSources(itemName, item.id);

    if (searchResults.results.length === 0) {
      log.debug('No price results found', {
        tracking_id: item.id,
        item_name: itemName,
      });
      return;
    }

    // Compare with history
    const comparison = await compareWithHistory(item.id, searchResults.results);

    // Record new price snapshot
    await recordPriceSnapshot(item.id, searchResults.results);

    // Collect alert if price dropped (will be batch created later)
    if (comparison.hasPriceDrop && item.alerts_enabled) {
      const savingsAmount = comparison.previousLowest - comparison.newLowest;
      const savingsPercent = ((savingsAmount / comparison.previousLowest) * 100).toFixed(0);

      priceDropAlerts.push({
        user_id: item.user_id,
        tracking_id: item.id,
        alert_type: 'price_drop',
        title: `Price drop! ${itemName}`,
        message: `Now €${comparison.newLowest.toFixed(2)} (was €${comparison.previousLowest.toFixed(2)}) - Save ${savingsPercent}%!`,
        link_url: `/wishlist/${item.gear_item_id}`,
      });

      log.info('Price drop detected', {
        tracking_id: item.id,
        item_name: itemName,
        previous_price: comparison.previousLowest,
        new_price: comparison.newLowest,
        savings_percent: savingsPercent,
      });
    }

    // Check for new personal offers (US5)
    await checkPersonalOffers(item.id, item.user_id, itemName);
  } catch (error) {
    log.error('Failed to process tracking item', { tracking_id: item.id }, error as Error);
    throw error;
  }
}

// Conversion checking moved to batch operation in batch-operations.ts (Review fix #12)

/**
 * Check for new personal offers and send notifications (US5)
 */
async function checkPersonalOffers(
  trackingId: string,
  userId: string,
  itemName: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  // Get unnotified personal offers for this tracking item
  const { data: offers } = await supabase
    .from('personal_offers')
    .select(`
      *,
      partner_retailers (
        name
      )
    `)
    .eq('tracking_id', trackingId)
    .eq('user_id', userId)
    .eq('dismissed', false)
    .gt('valid_until', new Date().toISOString())
    .is('notified_at', null);

  if (!offers || offers.length === 0) {
    return;
  }

  // Send notification for each new offer
  for (const offer of (offers as PersonalOfferWithPartner[])) {
    try {
      const partnerName = offer.partner_retailers.name;

      await sendPersonalOfferAlert(
        userId,
        offer.id,
        partnerName,
        offer.product_name,
        offer.offer_price,
        offer.original_price,
        offer.product_url
      );

      // Mark offer as notified
      await supabase
        .from('personal_offers')
        .update({ notified_at: new Date().toISOString() })
        .eq('id', offer.id);

      log.info('Personal offer alert sent', {
        tracking_id: trackingId,
        offer_id: offer.id,
        partner_name: partnerName,
        item_name: itemName,
      });
    } catch (error) {
      log.error('Failed to send personal offer alert', { offer_id: offer.id }, error as Error);
    }
  }
}
