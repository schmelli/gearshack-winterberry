/**
 * GearGraph Health API Proxy
 *
 * Proxies health check requests to the GearGraph Gardener API.
 * GET /api/geargraph/health - Get system health
 */

import { NextResponse } from 'next/server';

const GEARGRAPH_BASE_URL = 'https://geargraph.gearshack.app';

export async function GET() {
  try {
    const response = await fetch(`${GEARGRAPH_BASE_URL}/health`, {
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
    console.error('[GearGraph Proxy] Health GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch health status' },
      { status: 500 }
    );
  }
}
