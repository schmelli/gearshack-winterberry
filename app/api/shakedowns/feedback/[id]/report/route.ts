/**
 * API Route: Report Shakedown Feedback
 *
 * Feature: 001-community-shakedowns
 * Task: T074
 *
 * POST /api/shakedowns/feedback/[id]/report - Report feedback for moderation
 *
 * Allows users to report inappropriate feedback. Reports are tracked to prevent
 * duplicates and soft-hide content when threshold (3 reports) is reached.
 */

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { reportFeedbackSchema } from '@/lib/shakedown-schemas';

// =============================================================================
// Constants
// =============================================================================

const REPORT_THRESHOLD = 3;

// =============================================================================
// Types
// =============================================================================

interface ReportFeedbackResponse {
  success: true;
  code: 'REPORT_SUCCESS' | 'REPORT_SUCCESS_HIDDEN';
  hidden: boolean;
}

interface ErrorResponse {
  error: string;
  code?: string;
  details?: z.ZodIssue[] | Record<string, string[]>;
}

/**
 * Minimal feedback row for report checks
 */
interface FeedbackCheckRow {
  id: string;
  author_id: string;
  is_hidden: boolean;
  report_count: number;
}

/**
 * Insert payload for shakedown_feedback_reports table
 */
interface ReportInsertPayload {
  feedback_id: string;
  reporter_id: string;
  reason: 'spam' | 'harassment' | 'off_topic' | 'other';
  details?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Validates UUID format
 */
function isValidUuid(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

// =============================================================================
// POST Handler - Report Feedback
// =============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<ReportFeedbackResponse | ErrorResponse>> {
  try {
    const { id: feedbackId } = await params;

    // -------------------------------------------------------------------------
    // Validate feedback ID format
    // -------------------------------------------------------------------------
    if (!isValidUuid(feedbackId)) {
      return NextResponse.json(
        { error: 'Invalid feedback ID format', code: 'INVALID_ID' },
        { status: 400 }
      );
    }

    // -------------------------------------------------------------------------
    // Authenticate user
    // -------------------------------------------------------------------------
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized', code: 'UNAUTHORIZED' },
        { status: 401 }
      );
    }

    // -------------------------------------------------------------------------
    // Parse and validate request body
    // -------------------------------------------------------------------------
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body', code: 'INVALID_JSON' },
        { status: 400 }
      );
    }

    const validation = reportFeedbackSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { reason, details } = validation.data;

    // -------------------------------------------------------------------------
    // Fetch feedback to verify it exists and check ownership
    // -------------------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: feedback, error: feedbackError } = await (supabase as any)
      .from('shakedown_feedback')
      .select('id, author_id, is_hidden, report_count')
      .eq('id', feedbackId)
      .single();

    if (feedbackError || !feedback) {
      return NextResponse.json(
        { error: 'Feedback not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    const typedFeedback = feedback as FeedbackCheckRow;

    // -------------------------------------------------------------------------
    // Check if feedback is already hidden
    // -------------------------------------------------------------------------
    if (typedFeedback.is_hidden) {
      return NextResponse.json(
        { error: 'Feedback not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // -------------------------------------------------------------------------
    // Prevent self-reporting
    // -------------------------------------------------------------------------
    if (typedFeedback.author_id === user.id) {
      return NextResponse.json(
        { error: 'Cannot report your own feedback', code: 'SELF_REPORT' },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------------------
    // Check if user already reported this feedback
    // -------------------------------------------------------------------------
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReport, error: reportCheckError } = await (supabase as any)
      .from('shakedown_feedback_reports')
      .select('id')
      .eq('feedback_id', feedbackId)
      .eq('reporter_id', user.id)
      .maybeSingle();

    if (reportCheckError) {
      console.error('[API] Error checking existing report:', reportCheckError);
      return NextResponse.json(
        { error: 'Failed to check report status', code: 'CHECK_FAILED' },
        { status: 500 }
      );
    }

    if (existingReport) {
      return NextResponse.json(
        { error: 'You have already reported this feedback', code: 'ALREADY_REPORTED' },
        { status: 409 }
      );
    }

    // -------------------------------------------------------------------------
    // Insert report record
    // -------------------------------------------------------------------------
    const insertPayload: ReportInsertPayload = {
      feedback_id: feedbackId,
      reporter_id: user.id,
      reason,
      details: details?.trim() || undefined,
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: insertError } = await (supabase as any)
      .from('shakedown_feedback_reports')
      .insert(insertPayload);

    if (insertError) {
      console.error('[API] Failed to insert report:', insertError);

      // Handle unique constraint violation (race condition)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already reported this feedback', code: 'ALREADY_REPORTED' },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to submit report', code: 'INSERT_FAILED' },
        { status: 500 }
      );
    }

    // -------------------------------------------------------------------------
    // Determine if content was hidden (threshold reached)
    // Note: The trigger handles the actual hiding, we just report the status
    // -------------------------------------------------------------------------
    const newReportCount = typedFeedback.report_count + 1;
    const wasHidden = newReportCount >= REPORT_THRESHOLD;

    // -------------------------------------------------------------------------
    // Build response with code for client-side i18n
    // -------------------------------------------------------------------------
    const code = wasHidden ? 'REPORT_SUCCESS_HIDDEN' : 'REPORT_SUCCESS';

    return NextResponse.json({
      success: true,
      code,
      hidden: wasHidden,
    });
  } catch (error) {
    console.error('[API] Feedback report error:', error);

    // Handle Zod validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          code: 'VALIDATION_ERROR',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
