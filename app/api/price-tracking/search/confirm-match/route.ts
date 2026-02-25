/* eslint-disable @typescript-eslint/no-explicit-any -- price_tracking tables not in generated types */
/**
 * API route: Confirm fuzzy match selection
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ConfirmMatchRequest } from '@/types/price-tracking';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body with error handling
    let body: ConfirmMatchRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }

    if (!body.tracking_id || !body.selected_product_id) {
      return NextResponse.json(
        { error: 'tracking_id and selected_product_id are required' },
        { status: 400 }
      );
    }

    // Verify tracking belongs to user
    const { data: tracking, error: trackingError } = await (supabase as any)
      .from('price_tracking')
      .select('*')
      .eq('id', body.tracking_id)
      .eq('user_id', user.id)
      .single();

    if (trackingError || !tracking) {
      return NextResponse.json(
        { error: 'Tracking record not found' },
        { status: 404 }
      );
    }

    // Update tracking with confirmed match
    const { data, error } = await (supabase as any)
      .from('price_tracking')
      .update({
        confirmed_product_id: body.selected_product_id,
        match_confidence: body.confidence || 0.5,
      })
      .eq('id', body.tracking_id)
      .select()
      .single();

    if (error) {
      console.error('Failed to confirm match:', error);
      return NextResponse.json(
        { error: 'Failed to confirm match' },
        { status: 500 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Confirm match route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
