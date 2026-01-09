/**
 * API route: Alert preferences management
 * Feature: 050-price-tracking (US6)
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { AlertPreferences } from '@/types/price-tracking';

/**
 * GET: Fetch user's alert preferences
 */
export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get or create preferences
    const { data: existingPrefs, error: prefsError } = await supabase
      .from('alert_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (prefsError) {
      console.error('Failed to fetch preferences:', prefsError);
      return NextResponse.json(
        { error: 'Failed to fetch preferences' },
        { status: 500 }
      );
    }

    // Create default preferences if none exist
    if (!existingPrefs) {
      const { data: newPrefs, error: createError } = await supabase
        .from('alert_preferences')
        .insert({
          user_id: user.id,
          push_enabled: true,
          email_enabled: false,
          price_drop_enabled: true,
          local_shop_enabled: true,
          community_enabled: true,
          personal_offer_enabled: true,
        })
        .select()
        .single();

      if (createError) {
        console.error('Failed to create preferences:', createError);
        return NextResponse.json(
          { error: 'Failed to create preferences' },
          { status: 500 }
        );
      }

      return NextResponse.json(newPrefs);
    }

    return NextResponse.json(existingPrefs);
  } catch (error) {
    console.error('GET preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update user's alert preferences
 */
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: Partial<AlertPreferences> = await request.json();

    // Remove fields that shouldn't be updated
    const { id: _id, user_id: _userId, created_at: _createdAt, updated_at: _updatedAt, ...updates } = body as Record<string, unknown>;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    // Update preferences
    const { data: updatedPrefs, error: updateError } = await supabase
      .from('alert_preferences')
      .update(updates)
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update preferences:', updateError);
      return NextResponse.json(
        { error: 'Failed to update preferences' },
        { status: 500 }
      );
    }

    return NextResponse.json(updatedPrefs);
  } catch (error) {
    console.error('PUT preferences error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
