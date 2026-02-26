/* eslint-disable @typescript-eslint/no-explicit-any -- price_tracking tables not in generated types */
/**
 * API route: Enable price tracking for a gear item
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  enableTrackingSchema,
  validateRequestBody,
} from '@/lib/validation/price-tracking';

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

    // Validate request body (Review fix #11)
    const { data: body, error: validationError } = await validateRequestBody(
      request,
      enableTrackingSchema
    );

    if (validationError || !body) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Check if already tracking
    const { data: existing } = await (supabase as any)
      .from('price_tracking')
      .select('*')
      .eq('user_id', user.id)
      .eq('gear_item_id', body.gear_item_id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'Price tracking already enabled for this item' },
        { status: 409 }
      );
    }

    // Create tracking record
    const { data, error } = await (supabase as any)
      .from('price_tracking')
      .insert({
        user_id: user.id,
        gear_item_id: body.gear_item_id,
        alerts_enabled: body.alerts_enabled ?? true,
      })
      .select()
      .single();

    if (error) {
      console.error('Failed to enable tracking:', error);
      return NextResponse.json(
        { error: 'Failed to enable price tracking' },
        { status: 500 }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Track route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
