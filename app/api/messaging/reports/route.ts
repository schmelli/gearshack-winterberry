/* eslint-disable @typescript-eslint/no-explicit-any -- user_reports table not in generated types */
/**
 * POST /api/messaging/reports
 *
 * Feature: 046-user-messaging-system
 * Task: T046
 *
 * Creates a user or message report for moderation.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { reportSchema } from '@/lib/validations/messaging-schema';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const validation = reportSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validation.error.flatten(),
        },
        { status: 400 }
      );
    }

    const { reportedUserId, messageId, reason, details } = validation.data;

    // Prevent self-reporting
    if (reportedUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'You cannot report yourself' },
        { status: 400 }
      );
    }

    // Verify reported user exists
    const { data: reportedUser, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', reportedUserId)
      .single();

    if (userError || !reportedUser) {
      return NextResponse.json(
        { success: false, error: 'Reported user not found' },
        { status: 404 }
      );
    }

    // If messageId provided, verify it exists and belongs to reported user
    if (messageId) {
      const { data: message, error: messageError } = await supabase
        .from('messages')
        .select('id, sender_id')
        .eq('id', messageId)
        .single();

      if (messageError || !message) {
        return NextResponse.json(
          { success: false, error: 'Reported message not found' },
          { status: 404 }
        );
      }

      if (message.sender_id !== reportedUserId) {
        return NextResponse.json(
          { success: false, error: 'Message does not belong to the reported user' },
          { status: 400 }
        );
      }
    }

    // Create the report
    const { data: report, error: reportError } = await (supabase as any)
      .from('user_reports')
      .insert({
        reporter_id: user.id,
        reported_user_id: reportedUserId,
        message_id: messageId || null,
        reason,
        details: details || null,
        status: 'pending',
      })
      .select('id')
      .single();

    if (reportError) {
      console.error('[Reports] Failed to create report:', reportError);
      return NextResponse.json(
        { success: false, error: 'Failed to create report' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      reportId: report.id,
      message: 'Report submitted successfully. Our team will review it.',
    });
  } catch (error) {
    console.error('[Reports] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
