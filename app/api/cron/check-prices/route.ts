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
import { sendPriceAlert, sendPersonalOfferAlert } from '@/lib/services/alert-service';
import type { PriceTrackingWithGearItem, PersonalOfferWithPartner } from '@/types/database-helpers';
import PQueue from 'p-queue';

// Rate limit: 5 concurrent searches
const queue = new PQueue({ concurrency: 5 });

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
      console.error('Failed to fetch tracking items:', trackingError);
      return NextResponse.json({ error: 'Failed to fetch tracking items' }, { status: 500 });
    }

    if (!trackingItems || trackingItems.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No items to track',
        processed: 0,
      });
    }

    console.log(`Processing ${trackingItems.length} tracked items...`);

    // Process each item
    const results = await Promise.allSettled(
      (trackingItems as PriceTrackingWithGearItem[]).map((item) =>
        queue.add(() => processTrackingItem(item))
      )
    );

    // Count successes and failures
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    // Update last_checked_at for all items
    await supabase
      .from('price_tracking')
      .update({ last_checked_at: new Date().toISOString() })
      .in('id', trackingItems.map((item) => item.id));

    return NextResponse.json({
      success: true,
      processed: trackingItems.length,
      successful,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Process a single tracking item
 */
async function processTrackingItem(item: PriceTrackingWithGearItem): Promise<void> {
  try {
    const itemName = item.gear_items.name;
    if (!itemName) {
      console.error(`No name found for gear item ${item.gear_item_id}`);
      return;
    }

    // Search all sources
    const searchResults = await searchAllSources(itemName, item.id);

    if (searchResults.results.length === 0) {
      console.log(`No results found for "${itemName}"`);
      return;
    }

    // Compare with history
    const comparison = await compareWithHistory(item.id, searchResults.results);

    // Record new price snapshot
    await recordPriceSnapshot(item.id, searchResults.results);

    // Send alert if price dropped and alerts are enabled
    if (comparison.hasPriceDrop && item.alerts_enabled) {
      const savingsAmount = comparison.previousLowest - comparison.newLowest;
      const savingsPercent = ((savingsAmount / comparison.previousLowest) * 100).toFixed(0);

      await sendPriceAlert({
        user_id: item.user_id,
        tracking_id: item.id,
        alert_type: 'price_drop',
        title: `Price drop! ${itemName}`,
        message: `Now €${comparison.newLowest.toFixed(2)} (was €${comparison.previousLowest.toFixed(2)}) - Save ${savingsPercent}%!`,
        link_url: `/wishlist/${item.gear_item_id}`,
      });

      console.log(`Price drop alert sent for "${itemName}": €${comparison.previousLowest} → €${comparison.newLowest}`);
    }

    // Check for conversion (item moved from wishlist to inventory)
    await checkConversion(item.gear_item_id, item.user_id, item.id);

    // Check for new personal offers (US5)
    await checkPersonalOffers(item.id, item.user_id, itemName);
  } catch (error) {
    console.error(`Failed to process tracking item ${item.id}:`, error);
    throw error;
  }
}

/**
 * Check if tracked item was purchased (wishlist → inventory)
 */
async function checkConversion(
  gearItemId: string,
  userId: string,
  trackingId: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: gearItem } = await supabase
    .from('gear_items')
    .select('status')
    .eq('id', gearItemId)
    .eq('user_id', userId)
    .single();

  if (gearItem && gearItem.status === 'inventory') {
    // Item was purchased! Record conversion
    await supabase
      .from('price_alerts')
      .insert({
        user_id: userId,
        tracking_id: trackingId,
        alert_type: 'price_drop',
        title: 'Purchase tracked',
        message: 'Item moved from wishlist to inventory',
        link_url: `/inventory/${gearItemId}`,
        sent_via_push: false,
        sent_via_email: false,
      });

    // Disable tracking since item was purchased
    await supabase
      .from('price_tracking')
      .update({ enabled: false })
      .eq('id', trackingId);

    console.log(`Conversion tracked for gear item ${gearItemId}`);
  }
}

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

      console.log(`Personal offer alert sent for "${itemName}" from ${partnerName}`);
    } catch (error) {
      console.error(`Failed to send personal offer alert for offer ${offer.id}:`, error);
    }
  }
}
