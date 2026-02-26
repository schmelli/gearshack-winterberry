/**
 * Gardener Approvals Batch Review API Proxy Route
 *
 * Proxies batch review requests to the external GearGraph Gardener API.
 *
 * POST /api/gardener/approvals/review/batch - Batch approve/reject items
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
 * POST - Batch approve/reject items
 */
export async function POST(request: NextRequest) {
  const { isAdmin, error } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json({ error }, { status: error === 'Unauthorized' ? 401 : 403 });
  }

  try {
    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review/batch`, {
      method: 'POST',
      headers: {
        Authorization: GARDENER_AUTH,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000), // Longer timeout for batch operations
    });

    if (!response.ok) {
      console.error('[Gardener Proxy] Batch review failed:', response.status);
      return NextResponse.json(
        { error: 'Failed to batch review', details: await response.text() },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[Gardener Proxy] Batch review error:', error);
    return NextResponse.json(
      { error: 'GearGraph server unavailable', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 503 }
    );
  }
}
