/**
 * Gardener Status API Proxy
 *
 * Proxies status requests to the GearGraph Gardener API.
 * GET /api/gardener/status - Get system status
 *
 * Security: Requires admin authentication.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GARDENER_BASE_URL =
  process.env.GARDENER_API_URL || 'https://geargraph.gearshack.app/gardener';

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
 * Returns user if authenticated as admin, error object otherwise.
 */
async function verifyAdmin(): Promise<
  { user: { id: string } } | { error: string; status: number }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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

export async function GET() {
  try {
    // Verify admin authentication
    const authResult = await verifyAdmin();
    if ('error' in authResult) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Gardener API not configured' },
        { status: 503 }
      );
    }

    const response = await fetch(`${GARDENER_BASE_URL}/api/system/status`, {
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
    console.error('[Gardener Proxy] Status GET error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}
