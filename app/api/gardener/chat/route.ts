/**
 * Gardener Chat API Proxy
 *
 * Proxies chat requests to the GearGraph Gardener API.
 * Supports streaming responses.
 * POST /api/gardener/chat - Send chat message
 *
 * Security: Requires admin authentication and uses environment variables for credentials.
 */

import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const GARDENER_BASE_URL = process.env.GARDENER_API_URL || 'https://geargraph.gearshack.app/gardener';

/**
 * Gets the authorization header from environment variable.
 * Falls back to a placeholder if not configured.
 */
function getAuthHeader(): string {
  const token = process.env.GARDENER_AUTH_TOKEN;
  if (!token) {
    console.error('[Gardener Proxy] GARDENER_AUTH_TOKEN not configured');
    return '';
  }
  return token;
}

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify admin role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = getAuthHeader();
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Gardener API not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const body = await request.json();

    const response = await fetch(`${GARDENER_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
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
