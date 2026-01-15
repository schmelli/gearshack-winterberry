/**
 * Gardener Status API Proxy
 *
 * Proxies status requests to the GearGraph Gardener API.
 * GET /api/gardener/status - Get system status
 */

import { NextResponse } from 'next/server';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

export async function GET() {
  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/system/status`, {
      headers: {
        Authorization: AUTH_HEADER,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Gardener API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Gardener Proxy] Status GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
