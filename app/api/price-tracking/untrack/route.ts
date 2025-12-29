/**
 * API route: Disable price tracking for a gear item
 * Feature: 050-price-tracking
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
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

    // Get gear_item_id from query params
    const { searchParams } = new URL(request.url);
    const gearItemId = searchParams.get('gearItemId');

    if (!gearItemId) {
      return NextResponse.json(
        { error: 'gearItemId query parameter is required' },
        { status: 400 }
      );
    }

    // Delete tracking record
    const { error } = await (supabase as any)
      .from('price_tracking')
      .delete()
      .eq('user_id', user.id)
      .eq('gear_item_id', gearItemId);

    if (error) {
      console.error('Failed to disable tracking:', error);
      return NextResponse.json(
        { error: 'Failed to disable price tracking' },
        { status: 500 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Untrack route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
