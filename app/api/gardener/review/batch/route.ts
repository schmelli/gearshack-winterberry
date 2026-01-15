/**
 * Gardener Batch Review API Proxy
 *
 * Proxies batch review requests to the GearGraph Gardener API.
 * POST /api/gardener/review/batch - Batch approve/reject
 */

import { NextRequest, NextResponse } from 'next/server';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review/batch`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
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
    console.error('[Gardener Proxy] Batch POST error:', error);
    return NextResponse.json(
      { error: 'Failed to batch process' },
      { status: 500 }
    );
  }
}
