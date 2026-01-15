/**
 * Gardener Chat History API Proxy
 *
 * Proxies chat history requests to the GearGraph Gardener API.
 * GET /api/gardener/history - Get chat history
 * DELETE /api/gardener/history - Clear chat history
 */

import { NextResponse } from 'next/server';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

export async function GET() {
  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/chat/history`, {
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
    console.error('[Gardener Proxy] History GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch history' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/chat/history`, {
      method: 'DELETE',
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
    console.error('[Gardener Proxy] History DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to clear history' },
      { status: 500 }
    );
  }
}
