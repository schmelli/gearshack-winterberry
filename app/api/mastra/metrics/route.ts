/**
 * Prometheus Metrics Endpoint
 * Feature: 001-mastra-agentic-voice
 * Task: T100 - Create Prometheus metrics endpoint
 *
 * Exposes Prometheus-compatible metrics for monitoring:
 * - Agent performance (latency, requests, tokens)
 * - Workflow execution (duration, status, steps)
 * - Tool invocations
 * - Memory operations
 * - Rate limiting
 *
 * Format: text/plain; version=0.0.4
 * Access: Protected - requires admin authentication
 */

import { register } from '@/lib/mastra/metrics';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

/**
 * GET /api/mastra/metrics
 *
 * Returns Prometheus-formatted metrics.
 * Protected endpoint - requires authenticated admin user.
 *
 * @returns text/plain metrics in Prometheus exposition format
 */
export async function GET(): Promise<Response> {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin using explicit admin user ID list
    // SECURITY: Do NOT rely on subscription_tier which is client-controllable
    const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || '').split(',').filter(Boolean);

    const isAdmin = ADMIN_USER_IDS.includes(user.id);

    if (!isAdmin) {
      // Log unauthorized access attempts for security monitoring
      console.warn(`[Metrics] Unauthorized access attempt by user ${user.id}`);

      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get metrics from Prometheus registry
    const metrics = await register.metrics();

    return new Response(metrics, {
      status: 200,
      headers: {
        'Content-Type': register.contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('[Metrics] Error generating metrics:', error);

    return new Response(
      JSON.stringify({
        error: 'Failed to generate metrics',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

/**
 * HEAD /api/mastra/metrics
 *
 * Health check for metrics endpoint.
 */
export async function HEAD(): Promise<Response> {
  return new Response(null, { status: 200 });
}
