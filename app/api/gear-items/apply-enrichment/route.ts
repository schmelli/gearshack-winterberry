/* eslint-disable @typescript-eslint/no-explicit-any -- gear_enrichment_suggestions/notifications tables not in generated types */
/**
 * POST /api/gear-items/apply-enrichment
 * Apply GearGraph enrichment suggestions to gear items
 * Feature: Gear enrichment system
 * Date: 2025-12-18
 *
 * Accepts or dismisses enrichment suggestions from the notification menu.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import type { SupabaseClient } from '@supabase/supabase-js';

const applyEnrichmentSchema = z.object({
  suggestion_id: z.string().uuid(),
  action: z.enum(['accept', 'dismiss']),
  notification_id: z.string().uuid().optional(), // Optional: delete notification after processing
});

/** User-friendly labels for technical field names */
const FIELD_LABELS: Record<string, string> = {
  weight_grams: 'Weight',
  description: 'Description',
  price_paid: 'Price',
  currency: 'Currency',
};

/**
 * Helper to delete notification after processing enrichment action.
 * Non-blocking - logs errors but doesn't fail the request.
 */
async function deleteNotificationIfProvided(
  supabase: SupabaseClient,
  notificationId: string | undefined,
  userId: string
): Promise<void> {
  if (!notificationId) return;

  const { error } = await (supabase as any)
    .from('notifications')
    .delete()
    .eq('id', notificationId)
    .eq('user_id', userId); // Security: ensure user owns notification

  if (error) {
    console.error('[apply-enrichment] Failed to delete notification:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = applyEnrichmentSchema.safeParse(body);

    if (!validation.success) {
      // Log details server-side but return generic message to client
      console.warn('[apply-enrichment] Validation failed:', validation.error.issues);
      return NextResponse.json(
        { error: 'Invalid request format' },
        { status: 400 }
      );
    }

    const { suggestion_id, action, notification_id } = validation.data;

    // Fetch the enrichment suggestion
    const { data: suggestion, error: fetchError } = await (supabase as any)
      .from('gear_enrichment_suggestions')
      .select('*')
      .eq('id', suggestion_id)
      .eq('user_id', user.id) // Security: ensure user owns this suggestion
      .eq('status', 'pending') // Only process pending suggestions
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json(
        { error: 'Suggestion not found or already processed' },
        { status: 404 }
      );
    }

    if (action === 'dismiss') {
      // Simply mark as dismissed
      const { error: updateError } = await (supabase as any)
        .from('gear_enrichment_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', suggestion_id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to dismiss suggestion' },
          { status: 500 }
        );
      }

      // Delete notification so it's removed from the list
      await deleteNotificationIfProvided(supabase, notification_id, user.id);

      return NextResponse.json({
        success: true,
        action: 'dismissed',
      });
    }

    // Action is 'accept' - apply the enrichment to the gear item
    const updateData: {
      weight_grams?: number;
      description?: string;
      price_paid?: number;
      currency?: string;
    } = {};

    if (suggestion.suggested_weight_grams !== null) {
      updateData.weight_grams = suggestion.suggested_weight_grams;
    }

    if (suggestion.suggested_description !== null) {
      updateData.description = suggestion.suggested_description;
    }

    if (suggestion.suggested_price_usd !== null) {
      updateData.price_paid = suggestion.suggested_price_usd;
      updateData.currency = 'USD';
    }

    // Update the gear item
    const { error: updateGearError } = await (supabase as any)
      .from('gear_items')
      .update(updateData)
      .eq('id', suggestion.gear_item_id)
      .eq('user_id', user.id); // Security: ensure user owns this item

    if (updateGearError) {
      return NextResponse.json(
        { error: 'Failed to update gear item' },
        { status: 500 }
      );
    }

    // Mark suggestion as accepted
    const { error: updateSuggestionError } = await (supabase as any)
      .from('gear_enrichment_suggestions')
      .update({ status: 'accepted' })
      .eq('id', suggestion_id);

    if (updateSuggestionError) {
      // Item was updated but suggestion status wasn't - log but don't fail
      console.error('[apply-enrichment] Failed to update suggestion status:', updateSuggestionError);
    }

    // Delete notification so it's removed from the list
    await deleteNotificationIfProvided(supabase, notification_id, user.id);

    // Map technical field names to user-friendly labels
    const updatedFieldLabels = Object.keys(updateData).map(
      (field) => FIELD_LABELS[field] || field
    );

    return NextResponse.json({
      success: true,
      action: 'accepted',
      updated_fields: updatedFieldLabels,
    });
  } catch (error) {
    console.error('Apply enrichment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
