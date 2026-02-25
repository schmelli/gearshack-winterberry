/**
 * Gardener Review API Proxy
 *
 * Proxies requests to the GearGraph Gardener API to avoid CORS issues.
 * GET /api/gardener/review - Get next review item
 * POST /api/gardener/review - Submit decision
 *
 * Security: Requires admin authentication and uses environment variables for credentials.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GARDENER_BASE_URL = process.env.GARDENER_API_URL || 'https://geargraph.gearshack.app/gardener';

/**
 * Gets the authorization header from environment variable.
 */
function getAuthHeader(): string {
  const token = process.env.GARDENER_AUTH_TOKEN;
  if (!token) {
    console.error('[Gardener Proxy] GARDENER_AUTH_TOKEN not configured');
    return '';
  }
  return token;
}

/**
 * Verifies admin authentication.
 * Returns user if authenticated, null otherwise.
 */
async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Authentication required', status: 401 };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { error: 'Admin access required', status: 403 };
  }

  return { user };
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: 'Gardener API not configured' }, { status: 503 });
    }

    const searchParams = request.nextUrl.searchParams;
    const queryString = searchParams.toString();
    const url = `${GARDENER_BASE_URL}/api/approvals/review${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
      headers: {
        Authorization: authHeader,
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
    // Verify admin authentication
    const authResult = await verifyAdmin();
    if ('error' in authResult) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      return NextResponse.json({ error: 'Gardener API not configured' }, { status: 503 });
    }

    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/approvals/review`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
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
