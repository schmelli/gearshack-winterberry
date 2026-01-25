/**
 * Copy VIP Loadout API Route
 *
 * POST /api/vip/copy-loadout
 * Copies a VIP loadout to the authenticated user's account
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { copyVipLoadout } from '@/lib/vip/vip-service';
import {
  VipAuthenticationError,
  VipNotFoundError,
  VipInvalidLoadoutError
} from '@/lib/vip/errors';

const requestSchema = z.object({
  vipLoadoutId: z.string().uuid('Invalid UUID format for vipLoadoutId'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body with Zod
    const validation = requestSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { vipLoadoutId } = validation.data;

    // Copy loadout using the new unified schema
    const result = await copyVipLoadout(vipLoadoutId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error copying VIP loadout:', error);

    // Handle specific error classes instead of string matching
    if (error instanceof VipAuthenticationError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof VipNotFoundError || error instanceof VipInvalidLoadoutError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // Don't expose internal error details to clients
    return NextResponse.json(
      { error: 'Failed to copy loadout' },
      { status: 500 }
    );
  }
}
