/**
 * Cron job: Expire merchant offers past their expiration date
 * Feature: 053-merchant-integration
 * Task: T090
 * Schedule: Daily at 3 AM UTC
 *
 * Updates offers from 'pending' or 'viewed' to 'expired' status
 * when their expires_at timestamp has passed.
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Timing-safe comparison of authorization header to prevent timing attacks.
 * Uses constant-time comparison to avoid leaking secret length or content.
 */
function verifyAuthHeader(authHeader: string | null, expectedSecret: string | undefined): boolean {
  if (!authHeader || !expectedSecret) {
    return false;
  }
  const expected = `Bearer ${expectedSecret}`;
  if (authHeader.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret exists
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
      console.error('[cron:expire-offers] CRON_SECRET environment variable not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Verify cron secret using timing-safe comparison
    const authHeader = request.headers.get('authorization');
    if (!verifyAuthHeader(authHeader, cronSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TODO: Remove type assertion after regenerating Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = createServiceRoleClient() as any;
    const now = new Date().toISOString();

    // Find all offers that are pending or viewed but past expiration
    const { data: expiredOffers, error: fetchError } = await supabase
      .from('merchant_offers')
      .select('id')
      .in('status', ['pending', 'viewed'])
      .lt('expires_at', now);

    if (fetchError) {
      console.error('[cron:expire-offers] Failed to fetch expired offers:', fetchError);
      return NextResponse.json(
        { error: 'Failed to fetch expired offers' },
        { status: 500 }
      );
    }

    if (!expiredOffers || expiredOffers.length === 0) {
      console.log('[cron:expire-offers] No offers to expire');
      return NextResponse.json({
        success: true,
        message: 'No offers to expire',
        expired: 0,
      });
    }

    const offerIds = expiredOffers.map((o: { id: string }) => o.id);

    // Update offers to expired status
    const { error: updateError, count } = await supabase
      .from('merchant_offers')
      .update({ status: 'expired' })
      .in('id', offerIds);

    if (updateError) {
      console.error('[cron:expire-offers] Failed to update offers:', updateError);
      return NextResponse.json(
        { error: 'Failed to update expired offers' },
        { status: 500 }
      );
    }

    console.log(`[cron:expire-offers] Expired ${count ?? offerIds.length} offers`);

    return NextResponse.json({
      success: true,
      expired: count ?? offerIds.length,
      offerIds,
    });
  } catch (error) {
    console.error('[cron:expire-offers] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
