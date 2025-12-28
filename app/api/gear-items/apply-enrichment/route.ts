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

const applyEnrichmentSchema = z.object({
  suggestion_id: z.string().uuid(),
  action: z.enum(['accept', 'dismiss']),
  notification_id: z.string().uuid().optional(), // Optional: delete notification after processing
});

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
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { suggestion_id, action, notification_id } = validation.data;

    // Fetch the enrichment suggestion
    const { data: suggestion, error: fetchError } = await supabase
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
      const { error: updateError } = await supabase
        .from('gear_enrichment_suggestions')
        .update({ status: 'dismissed' })
        .eq('id', suggestion_id);

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to dismiss suggestion' },
          { status: 500 }
        );
      }

      // Delete the notification so it's removed from the list
      if (notification_id) {
        await supabase
          .from('notifications')
          .delete()
          .eq('id', notification_id)
          .eq('user_id', user.id); // Security: ensure user owns notification
      }

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
    const { error: updateGearError } = await supabase
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
    const { error: updateSuggestionError } = await supabase
      .from('gear_enrichment_suggestions')
      .update({ status: 'accepted' })
      .eq('id', suggestion_id);

    if (updateSuggestionError) {
      // Item was updated but suggestion status wasn't - log but don't fail
      console.error('Failed to update suggestion status:', updateSuggestionError);
    }

    // Delete the notification so it's removed from the list
    if (notification_id) {
      await supabase
        .from('notifications')
        .delete()
        .eq('id', notification_id)
        .eq('user_id', user.id); // Security: ensure user owns notification
    }

    return NextResponse.json({
      success: true,
      action: 'accepted',
      updated_fields: Object.keys(updateData),
    });
  } catch (error) {
    console.error('Apply enrichment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
