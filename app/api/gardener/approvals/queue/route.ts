/**
 * Gardener Approvals Queue API Proxy Route
 *
 * Proxies review queue requests to the external GearGraph Gardener API.
 *
 * GET /api/gardener/approvals/queue - Fetch current review item
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
 * GET - Fetch current review item from queue
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
  }

  try {
    // Forward query params
    const queryString = request.nextUrl.search;
    const url = `${GARDENER_BASE_URL}/api/approvals/queue${queryString}`;

    const response = await fetch(url, {
      headers: {
        Authorization: GARDENER_AUTH,
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Queue fetch failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to fetch queue', details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Gardener Proxy] Queue error:', error);
    return NextResponse.json(
      {
        error: 'GearGraph server unavailable',
        details: error instanceof Error ? error.message : 'Unknown error',
        item: null,
        position: 0,
        total: 0,
      },
      { status: 503 }
    );
  }
}
