/**
 * Price comparison and drop detection service
 * Feature: 050-price-tracking (US2)
 * Date: 2025-12-17
 */

import { createClient } from '@/lib/supabase/server';
import type { PriceResult } from '@/types/price-tracking';

/**
 * Compare current prices with historical data to detect drops
 */
export async function compareWithHistory(
  trackingId: string,
  currentResults: PriceResult[]
): Promise<{ hasPriceDrop: boolean; previousLowest: number; newLowest: number }> {
  const supabase = await createClient();

  if (currentResults.length === 0) {
    return { hasPriceDrop: false, previousLowest: 0, newLowest: 0 };
  }

  // Get current lowest price
  const newLowest = Math.min(...currentResults.map(r => r.total_price));

  // Get historical lowest price
  const { data: history } = await supabase
    .from('price_history')
    .select('lowest_price')
    .eq('tracking_id', trackingId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single();

  if (!history) {
    // No history yet - this is the first check
    return { hasPriceDrop: false, previousLowest: newLowest, newLowest };
  }

  const hasPriceDrop = newLowest < history.lowest_price;
  return { hasPriceDrop, previousLowest: history.lowest_price, newLowest };
}

/**
 * Record price snapshot in history (Review fix #9: Uses transaction function)
 */
export async function recordPriceSnapshot(
  trackingId: string,
  results: PriceResult[]
): Promise<void> {
  if (results.length === 0) return;

  const supabase = await createClient();

  const prices = results.map(r => r.total_price).filter(p => Number.isFinite(p));

  // Guard against empty prices array after filtering
  if (prices.length === 0) {
    console.warn('No valid prices found in results, skipping snapshot');
    return;
  }

  // Use database function for atomic insert of history + results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).rpc('record_price_snapshot', {
    p_tracking_id: trackingId,
    p_results: results,
    p_lowest_price: Math.min(...prices),
    p_highest_price: Math.max(...prices),
    p_average_price: prices.reduce((a, b) => a + b, 0) / prices.length,
  });

  if (error) {
    console.error('Failed to record price snapshot:', error);
    throw new Error('Failed to record price snapshot');
  }
}

/**
 * Calculate price trend (rising, falling, stable)
 */
export async function calculatePriceTrend(
  trackingId: string,
  days: number = 7
): Promise<'rising' | 'falling' | 'stable'> {
  const supabase = await createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data: history } = await supabase
    .from('price_history')
    .select('lowest_price, recorded_at')
    .eq('tracking_id', trackingId)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (!history || history.length < 2) {
    return 'stable';
  }

  const first = history[0].lowest_price;
  const last = history[history.length - 1].lowest_price;

  // Guard against invalid values - both must be valid finite numbers
  if (!first || first === 0 || !Number.isFinite(first)) {
    return 'stable';
  }
  if (last === null || last === undefined || !Number.isFinite(last)) {
    return 'stable';
  }

  const change = ((last - first) / first) * 100;

  if (change > 5) return 'rising';
  if (change < -5) return 'falling';
  return 'stable';
}
