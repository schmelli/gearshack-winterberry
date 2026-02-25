/**
 * Memory Deletion API Endpoint (GDPR Article 17)
 * Feature: 001-mastra-agentic-voice
 * Task: T107 - Create memory deletion endpoint (DELETE handler)
 *
 * Provides GDPR Right to Erasure compliance for conversation memory.
 *
 * DELETE /api/mastra/memory
 *   - Deletes all user conversation memory
 *   - Creates audit trail in gdpr_deletion_records
 *   - Returns deletion ID for status tracking
 *
 * DELETE /api/mastra/memory?conversationId={id}
 *   - Deletes specific conversation only (no audit trail)
 */

import { createClient } from '@/lib/supabase/server';
import {
  requestGdprDeletion,
  executeGdprDeletion,
  listGdprDeletionRequests,
} from '@/lib/mastra/gdpr';
import { logInfo, logError, logWarn } from '@/lib/mastra/logging';
import type { Database } from '@/types/supabase';

export const runtime = 'nodejs';

// =====================================================
// DELETE Handler - GDPR Deletion
// =====================================================

/**
 * DELETE /api/mastra/memory
 *
 * Delete user's conversation memory (GDPR Right to Erasure).
 *
 * Query Parameters:
 * - conversationId (optional): Delete specific conversation only
 *
 * Response:
 * - 200: Deletion complete (with audit record)
 * - 202: Deletion accepted, processing async (for large datasets)
 * - 401: Unauthorized
 * - 500: Server error
 */
export async function DELETE(request: Request): Promise<Response> {
  try {
    // Parse query parameters
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversationId');

    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      logWarn('Unauthorized GDPR deletion attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logInfo('GDPR memory deletion requested', {
      userId: user.id,
      metadata: { conversationId },
    });

    // If specific conversation requested, delete just that one
    if (conversationId) {
      const supabaseClient = supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>;
      const { error: deleteError } = await supabaseClient
        .from('conversation_memory' as Parameters<typeof supabaseClient.from>[0])
        .delete()
        .eq('user_id' as never, user.id)
        .eq('conversation_id' as never, conversationId);

      if (deleteError) {
        logError('Failed to delete conversation', deleteError instanceof Error ? deleteError : new Error(String(deleteError)), {
          userId: user.id,
          metadata: { conversationId },
        });
        return new Response(
          JSON.stringify({ error: 'Failed to delete conversation', message: String(deleteError) }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      logInfo('Specific conversation deleted', {
        userId: user.id,
        metadata: { conversationId },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Conversation deleted successfully',
          conversationId,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Full GDPR deletion with audit trail
    const requestResult = await requestGdprDeletion(
      supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
      user.id
    );

    if (!requestResult.success || !requestResult.deletionId) {
      logError('Failed to create GDPR deletion request', new Error(requestResult.error), {
        userId: user.id,
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to initiate deletion request',
          message: requestResult.error,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Execute deletion synchronously for now (can be made async for large datasets)
    const executionResult = await executeGdprDeletion(
      supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
      user.id,
      requestResult.deletionId
    );

    if (!executionResult.success) {
      return new Response(
        JSON.stringify({
          error: 'Deletion failed',
          message: executionResult.error,
          deletionId: requestResult.deletionId,
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    logInfo('GDPR deletion completed successfully', {
      userId: user.id,
      metadata: {
        deletionId: requestResult.deletionId,
        recordsDeleted: executionResult.recordsDeleted,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'All conversation data has been deleted',
        deletionId: requestResult.deletionId,
        recordsDeleted: executionResult.recordsDeleted,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('GDPR deletion endpoint error', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// GET Handler - List Deletion History
// =====================================================

/**
 * GET /api/mastra/memory
 *
 * List user's GDPR deletion history.
 *
 * Response:
 * - 200: Array of deletion records
 * - 401: Unauthorized
 * - 500: Server error
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
        JSON.stringify({ error: 'Unauthorized. Please log in.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // List deletion requests
    const records = await listGdprDeletionRequests(
      supabase as unknown as import('@supabase/supabase-js').SupabaseClient<Database>,
      user.id
    );

    return new Response(
      JSON.stringify({
        success: true,
        records: records.map(r => ({
          id: r.id,
          status: r.status,
          requestedAt: r.requestedAt.toISOString(),
          completedAt: r.completedAt?.toISOString() ?? null,
          recordsDeleted: r.recordsDeleted,
          errorMessage: r.errorMessage,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError('Error listing deletion history', error instanceof Error ? error : undefined);

    return new Response(
      JSON.stringify({ error: 'Internal server error', message: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// =====================================================
// Unsupported Methods
// =====================================================

export function POST(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use DELETE.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, DELETE' } }
  );
}

export function PUT(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use DELETE.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET, DELETE' } }
  );
}
