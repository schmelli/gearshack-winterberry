/**
 * Gardener Chat API Proxy Route
 *
 * Proxies requests to the external GearGraph Gardener API.
 * Handles authentication server-side to avoid CORS issues and
 * keep credentials secure.
 *
 * GET /api/gardener/chat - Fetch chat history
 * POST /api/gardener/chat - Send a message (SSE streaming)
 * DELETE /api/gardener/chat - Clear chat history
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GARDENER_BASE_URL = process.env.GEARGRAPH_GARDENER_URL || 'https://geargraph.gearshack.app/gardener';
const GARDENER_AUTH = process.env.GEARGRAPH_GARDENER_AUTH || 'Basic Z2VhcmdyYXBoYWRtaW46R0dBZG1pbjIwMjU=';

/**
 * Verify that the user is an admin
 */
async function verifyAdmin(): Promise<{ isAdmin: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { isAdmin: false, error: 'Unauthorized' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return { isAdmin: false, error: 'Forbidden' };
    }

    return { isAdmin: true };
  } catch (error) {
    console.error('[Gardener Proxy] Auth error:', error);
    return { isAdmin: false, error: 'Auth failed' };
  }
}

/**
 * GET - Fetch chat history
 */
export async function GET() {
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/chat`, {
      headers: {
        Authorization: GARDENER_AUTH,
      },
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Chat history fetch failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch chat history', details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Gardener Proxy] Chat history error:', error);
    return NextResponse.json(
      { error: 'GearGraph server unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

/**
 * POST - Send a message with SSE streaming
 */
export async function POST(request: NextRequest) {
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        Authorization: GARDENER_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Chat POST failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to send message', details: await response.text() },
        { status: response.status }
      );
    }

    // Stream the response back to the client
    const readable = response.body;
    if (!readable) {
      return NextResponse.json({ error: 'No response body' }, { status: 500 });
    }

    return new NextResponse(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('[Gardener Proxy] Chat POST error:', error);
    return NextResponse.json(
      { error: 'GearGraph server unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}

/**
 * DELETE - Clear chat history
 */
export async function DELETE() {
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const response = await fetch(`${GARDENER_BASE_URL}/api/chat`, {
      method: 'DELETE',
      headers: {
        Authorization: GARDENER_AUTH,
      },
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Chat DELETE failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to clear history', details: await response.text() },
        { status: response.status }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Gardener Proxy] Chat DELETE error:', error);
    return NextResponse.json(
      { error: 'GearGraph server unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
