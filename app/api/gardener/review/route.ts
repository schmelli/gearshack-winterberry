/**
 * Gardener Review API Proxy
 *
 * Proxies requests to the GearGraph Gardener API to avoid CORS issues.
 * GET /api/gardener/review - Get next review item
 * POST /api/gardener/review - Submit decision
 */

import { NextRequest, NextResponse } from 'next/server';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${GARDENER_BASE_URL}/api/approvals/review${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
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
    console.error('[Gardener Proxy] Review GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch from Gardener API' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review`, {
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
    console.error('[Gardener Proxy] Review POST error:', error);
    return NextResponse.json(
      { error: 'Failed to submit to Gardener API' },
      { status: 500 }
    );
  }
}
