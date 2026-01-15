/**
 * GearGraph Stats API Proxy
 *
 * Proxies stats requests to the GearGraph Gardener API.
 * GET /api/geargraph/stats - Get system stats
 */

import { NextResponse } from 'next/server';

const GEARGRAPH_BASE_URL = 'https://geargraph.gearshack.app';

export async function GET() {
  try {
    const response = await fetch(`${GEARGRAPH_BASE_URL}/stats`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `GearGraph API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[GearGraph Proxy] Stats GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
