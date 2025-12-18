// @ts-nocheck - Price tracking feature requires migrations to be applied
/**
 * Supabase query functions for price tracking
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { createClient } from '@/lib/supabase/client';
import type {
  PriceTracking,
  PriceResult,
  PriceHistoryEntry,
  EnableTrackingRequest,
  ConfirmMatchRequest,
  CommunityAvailability,
} from '@/types/price-tracking';

/**
 * Enable price tracking for a gear item
 */
export async function enablePriceTracking(
  request: EnableTrackingRequest
): Promise<PriceTracking> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('price_tracking')
    .insert({
      user_id: user.id,
      gear_item_id: request.gear_item_id,
      alerts_enabled: request.alerts_enabled ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to enable tracking: ${error.message}`);
  return data;
}

/**
 * Disable price tracking for a gear item
 */
export async function disablePriceTracking(gearItemId: string): Promise<void> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { error } = await supabase
    .from('price_tracking')
    .delete()
    .eq('user_id', user.id)
    .eq('gear_item_id', gearItemId);

  if (error) throw new Error(`Failed to disable tracking: ${error.message}`);
}

/**
 * Get price tracking status for a gear item
 */
export async function getPriceTrackingStatus(
  gearItemId: string
): Promise<PriceTracking | null> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');

  const { data, error } = await supabase
    .from('price_tracking')
    .select('*')
    .eq('user_id', user.id)
    .eq('gear_item_id', gearItemId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get tracking status: ${error.message}`);
  return data;
}

/**
 * Update price tracking with confirmed match
 */
export async function confirmProductMatch(
  request: ConfirmMatchRequest
): Promise<PriceTracking> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('price_tracking')
    .update({
      confirmed_product_id: request.selected_product_id,
      match_confidence: request.confidence,
    })
    .eq('id', request.tracking_id)
    .select()
    .single();

  if (error) throw new Error(`Failed to confirm match: ${error.message}`);
  return data;
}

/**
 * Get price results for a tracking item
 */
export async function getPriceResults(trackingId: string): Promise<PriceResult[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('price_results')
    .select('*')
    .eq('tracking_id', trackingId)
    .gt('expires_at', new Date().toISOString())
    .order('total_price', { ascending: true });

  if (error) throw new Error(`Failed to get price results: ${error.message}`);
  return data || [];
}

/**
 * Get price history for a tracking item
 */
export async function getPriceHistory(
  trackingId: string,
  days: number = 30
): Promise<PriceHistoryEntry[]> {
  const supabase = createClient();

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('tracking_id', trackingId)
    .gte('recorded_at', startDate.toISOString())
    .order('recorded_at', { ascending: true });

  if (error) throw new Error(`Failed to get price history: ${error.message}`);
  return data || [];
}

/**
 * Save price results to database (service role only)
 */
export async function savePriceResults(
  trackingId: string,
  results: Omit<PriceResult, 'id' | 'tracking_id' | 'fetched_at' | 'expires_at'>[]
): Promise<void> {
  const supabase = createClient();

  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(); // 6 hours from now

  const priceResults = results.map((result) => ({
    ...result,
    tracking_id: trackingId,
    fetched_at: now,
    expires_at: expiresAt,
  }));

  const { error } = await supabase.from('price_results').insert(priceResults);

  if (error) throw new Error(`Failed to save price results: ${error.message}`);
}

/**
 * Toggle alerts for a tracking item
 */
export async function toggleAlerts(
  trackingId: string,
  enabled: boolean
): Promise<PriceTracking> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('price_tracking')
    .update({ alerts_enabled: enabled })
    .eq('id', trackingId)
    .select()
    .single();

  if (error) throw new Error(`Failed to toggle alerts: ${error.message}`);
  return data;
}

/**
 * Get community availability for a gear item
 */
export async function getCommunityAvailability(
  gearItemId: string
): Promise<CommunityAvailability | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('community_availability')
    .select('*')
    .eq('gear_item_id', gearItemId)
    .maybeSingle();

  if (error) throw new Error(`Failed to get community availability: ${error.message}`);
  return data;
}
