/**
 * API Route: Copy VIP Loadout
 *
 * Feature: 052-vip-loadouts
 * Task: T055 (US3 Copy)
 *
 * POST /api/vip/copy-loadout - Copy VIP loadout to user's account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import type { CopyLoadoutResponse } from '@/types/vip';

// =============================================================================
// Types
// =============================================================================

interface ErrorResponse {
  error: string;
}

// =============================================================================
// Request Schema
// =============================================================================

const copyLoadoutSchema = z.object({
  vipLoadoutId: z.string().uuid(),
});

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(
  request: NextRequest
): Promise<NextResponse<CopyLoadoutResponse | ErrorResponse>> {
  try {
    const supabase = await createClient();

    // Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    const body = await request.json();
    const validation = copyLoadoutSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request' },
        { status: 400 }
      );
    }

    const { vipLoadoutId } = validation.data;

    // Get VIP loadout with items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: vipLoadout, error: loadoutError } = await (supabase as any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .from('vip_loadouts')
      .select(`
        *,
        vip_accounts (name),
        vip_loadout_items (*)
      `)
      .eq('id', vipLoadoutId)
      .eq('status', 'published')
      .single();

    if (loadoutError || !vipLoadout) {
      return NextResponse.json(
        { error: 'VIP loadout not found' },
        { status: 404 }
      );
    }

    // Create user loadout
    const loadoutName = `${vipLoadout.vip_accounts?.name}'s ${vipLoadout.name} - Copy`;

    const { data: newLoadout, error: createError } = await (supabase as any)
      .from('loadouts')
      .insert({
        user_id: user.id,
        name: loadoutName,
        description: `Copied from VIP loadout: ${vipLoadout.name}`,
        source_vip_loadout_id: vipLoadoutId,
      })
      .select()
      .single();

    if (createError || !newLoadout) {
      console.error('[API] Failed to create loadout:', createError);
      return NextResponse.json(
        { error: 'Failed to create loadout' },
        { status: 500 }
      );
    }

    // Copy items as wishlist status
    const itemsToInsert = (vipLoadout.vip_loadout_items || []).map((item: Record<string, unknown>) => ({
      loadout_id: newLoadout.id,
      gear_item_id: item.gear_item_id || null,
      name: item.name,
      brand: item.brand,
      weight_grams: item.weight_grams,
      quantity: item.quantity,
      category: item.category,
      status: 'wishlist',
      notes: item.notes,
    }));

    if (itemsToInsert.length > 0) {
      const { error: itemsError } = await (supabase as any)
        .from('loadout_items')
        .insert(itemsToInsert);

      if (itemsError) {
        console.error('[API] Failed to copy items:', itemsError);
        // Don't fail the whole operation - loadout was created
      }
    }

    return NextResponse.json({
      loadoutId: newLoadout.id,
      loadoutName,
    });
  } catch (error) {
    console.error('[API] Copy loadout error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
