/**
 * Copy VIP Loadout API Route
 *
 * POST /api/vip/copy-loadout
 * Copies a VIP loadout to the authenticated user's account
 */

import { NextRequest, NextResponse } from 'next/server';
import { copyVipLoadout } from '@/lib/vip/vip-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { vipLoadoutId } = body;

    if (!vipLoadoutId || typeof vipLoadoutId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid vipLoadoutId' },
        { status: 400 }
      );
    }

    // Copy loadout using the new unified schema
    const result = await copyVipLoadout(vipLoadoutId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error copying VIP loadout:', error);

    const message = error instanceof Error ? error.message : 'Failed to copy loadout';

    // Handle specific error cases
    if (message === 'Authentication required') {
      return NextResponse.json({ error: message }, { status: 401 });
    }

    if (message === 'VIP loadout not found' || message === 'Not a VIP loadout') {
      return NextResponse.json({ error: message }, { status: 404 });
    }

    return NextResponse.json(
      { error: 'Failed to copy loadout' },
      { status: 500 }
    );
  }
}
