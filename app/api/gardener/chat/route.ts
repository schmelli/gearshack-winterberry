/**
 * Gardener Chat API Proxy
 *
 * Proxies chat requests to the GearGraph Gardener API.
 * Supports streaming responses.
 * POST /api/gardener/chat - Send chat message
 */

import { NextRequest } from 'next/server';

const GARDENER_BASE_URL = 'https://geargraph.gearshack.app/gardener';
const AUTH_HEADER = 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Gardener API error: ${response.status}` }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if it's a streaming response
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream') || contentType?.includes('application/x-ndjson')) {
      // Forward the stream
      return new Response(response.body, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    }

    // Regular JSON response
    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[Gardener Proxy] Chat POST error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to send chat message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
