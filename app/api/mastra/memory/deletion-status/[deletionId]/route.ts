/**
 * Deletion Status API Endpoint
 * Feature: 001-mastra-agentic-voice
 * Task: T110 - Create deletion status endpoint
 *
 * Provides status tracking for GDPR deletion requests.
 *
 * GET /api/mastra/memory/deletion-status/[deletionId]
 *   - Returns the status of a specific deletion request
 *   - Verifies user ownership of the deletion request
 */

import { createClient } from '@/lib/supabase/server';
import { getGdprDeletionStatus } from '@/lib/mastra/gdpr';
import { logError, logWarn } from '@/lib/mastra/logging';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

// =====================================================
// Types
// =====================================================

interface RouteParams {
  params: Promise<{
    deletionId: string;
  }>;
}

// =====================================================
// GET Handler - Deletion Status
// =====================================================

/**
 * GET /api/mastra/memory/deletion-status/[deletionId]
 *
 * Get the status of a GDPR deletion request.
 *
 * Path Parameters:
 * - deletionId: UUID of the deletion request
 *
 * Response:
 * - 200: Deletion record found
 * - 401: Unauthorized
 * - 404: Deletion record not found
 * - 500: Server error
 */
export async function GET(
  request: Request,
  { params }: RouteParams
): Promise<Response> {
  try {
    // Await the params (Next.js 15+ dynamic route params are async)
    const { deletionId } = await params;

    // Validate deletionId format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(deletionId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid deletion ID format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logWarn('Unauthorized deletion status check');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get deletion status (includes user ownership check via RLS)
    const result = await getGdprDeletionStatus(
      supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
      deletionId,
      user.id
    );

    if (result.error) {
      logError('Error fetching deletion status', new Error(result.error), {
        metadata: { deletionId, userId: user.id },
      });

      return new Response(
        JSON.stringify({ error: 'Failed to fetch deletion status', message: result.error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!result.found || !result.record) {
      return new Response(
        JSON.stringify({
          error: 'Deletion record not found',
          message: 'The deletion request was not found or does not belong to you.',
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Return status
    const record = result.record;

    return new Response(
      JSON.stringify({
        success: true,
        deletion: {
          id: record.id,
          status: record.status,
          requestedAt: record.requestedAt.toISOString(),
          completedAt: record.completedAt?.toISOString() ?? null,
          recordsDeleted: record.recordsDeleted,
          errorMessage: record.errorMessage,
          // Provide human-readable status message
          statusMessage: getStatusMessage(record.status, record.errorMessage),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Deletion status endpoint error', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// Helpers
// =====================================================

/**
 * Get human-readable status message
 */
function getStatusMessage(status: string, errorMessage: string | null): string {
  switch (status) {
    case 'pending':
      return 'Your deletion request is queued and will be processed shortly.';
    case 'processing':
      return 'Your data is currently being deleted. This may take a few moments.';
    case 'completed':
      return 'Your data has been successfully deleted.';
    case 'failed':
      return errorMessage
        ? `Deletion failed: ${errorMessage}`
        : 'Deletion failed. Please try again or contact support.';
    default:
      return 'Unknown status.';
  }
}

// =====================================================
// Unsupported Methods
// =====================================================

export function POST(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET' } }
  );
}

export function PUT(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET' } }
  );
}

export function DELETE(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET' } }
  );
}
