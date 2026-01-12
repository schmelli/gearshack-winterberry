/**
 * Gardener Status API Proxy Route
 *
 * Proxies system status requests to the external GearGraph Gardener API.
 *
 * GET /api/gardener/status - Fetch system status
 */

import { NextResponse } from 'next/server';

const GARDENER_BASE_URL = process.env.GEARGRAPH_GARDENER_URL || 'https://geargraph.gearshack.app/gardener';

/**
 * GET - Fetch system status
 * Note: Status endpoint is public - no auth required
 */
export async function GET() {
  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/system/status`, {
      // Add a timeout to prevent hanging
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Status fetch failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch status', details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Gardener Proxy] Status error:', error);

    // Return a degraded status response instead of error
    return NextResponse.json({
      status: 'unhealthy',
      message: 'GearGraph server unavailable',
      error: error instanceof Error ? error.message : 'Unknown error',
      metrics: {
        totalNodes: 0,
        totalRelationships: 0,
        orphanCount: 0,
        duplicatesDetected: 0,
      },
      pendingApprovals: 0,
    });
  }
}
