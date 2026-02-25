/**
 * Resume Add-Gear Workflow API
 * Feature: Suspend/Resume for Human-in-the-Loop Actions
 *
 * POST /api/mastra/workflows/add-gear/resume
 *
 * Resumes a suspended add-gear workflow after user confirmation.
 * This is the "resume" side of Mastra's suspend/resume pattern:
 * the user clicks approve/cancel, and this endpoint completes the workflow.
 *
 * Request body:
 * - runId: string — The workflow run ID from the confirm_action SSE event
 * - approved: boolean — Whether the user approved (true) or cancelled (false)
 *
 * Response:
 * - 200: Success with result details
 * - 400: Invalid request
 * - 401: Unauthorized
 * - 404: Confirmation not found or expired
 * - 500: Server error
 *
 * @see https://mastra.ai/docs/workflows/suspend-and-resume
 */

import { createClient } from '@/lib/supabase/server';
import { logInfo, logError } from '@/lib/mastra/logging';
import {
  resolveConfirmation,
} from '@/lib/mastra/workflows/pending-confirmations';
import { executeAddToLoadout } from '@/lib/mastra/workflows/add-gear-workflow';

// Force Node.js runtime for Supabase compatibility
export const runtime = 'nodejs';

// =============================================================================
// Request Validation
// =============================================================================

interface ResumeRequestBody {
  runId: string;
  approved: boolean;
}

function validateRequest(body: unknown): {
  valid: true;
  data: ResumeRequestBody;
} | {
  valid: false;
  error: string;
} {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body must be a JSON object' };
  }

  const request = body as Record<string, unknown>;

  if (typeof request.runId !== 'string' || request.runId.trim() === '') {
    return { valid: false, error: 'runId is required and must be a non-empty string' };
  }

  if (typeof request.approved !== 'boolean') {
    return { valid: false, error: 'approved is required and must be a boolean' };
  }

  return {
    valid: true,
    data: {
      runId: request.runId.trim(),
      approved: request.approved,
    },
  };
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: Request): Promise<Response> {
  try {
    // 1. Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // 2. Validate request
    const validation = validateRequest(body);
    if (!validation.valid) {
      return Response.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const { runId, approved } = validation.data;

    // 3. Authenticate user via Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return Response.json(
        { error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    // 4. Resolve the confirmation atomically (approve or cancel).
    // The atomic UPDATE … WHERE handles all failure cases (not found, wrong user,
    // already resolved, expired) in a single round-trip, eliminating the TOCTOU
    // window that a separate pre-check would introduce.
    const confirmation = await resolveConfirmation(runId, user.id, approved);
    if (!confirmation) {
      return Response.json(
        { error: 'Confirmation not found, expired, already resolved, or belongs to another user.' },
        { status: 404 }
      );
    }

    // 5. If cancelled, return success with cancelled status
    if (!approved) {
      logInfo('[Resume] User cancelled', { metadata: { runId } });
      return Response.json({
        success: true,
        cancelled: true,
        resultCode: 'ADD_TO_LOADOUT_CANCELLED',
        details: {
          gearItemName: confirmation.payload.gearItemName,
          loadoutName: confirmation.payload.loadoutName,
        },
      });
    }

    // 6. Execute the actual add-to-loadout operation (this is the "resume" step)
    // Pass userId for ownership re-verification before the write.
    logInfo('[Resume] User approved, executing add', { metadata: { runId } });
    const result = await executeAddToLoadout(confirmation.payload, user.id);

    return Response.json({
      success: result.success,
      resultCode: result.success ? 'ADD_TO_LOADOUT_SUCCESS' : 'ADD_TO_LOADOUT_FAILED',
      details: {
        gearItemName: confirmation.payload.gearItemName,
        loadoutName: confirmation.payload.loadoutName,
        loadoutItemId: result.loadoutItemId,
        updatedTotalWeight: result.updatedTotalWeight,
      },
      error: result.error,
    });
  } catch (error) {
    logError('[Resume API] Unexpected error', error);
    return Response.json(
      { error: 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Method Not Allowed Handlers
// =============================================================================

export function GET(): Response {
  return Response.json(
    { error: 'Method not allowed. Use POST.' },
    { status: 405, headers: { Allow: 'POST' } }
  );
}
