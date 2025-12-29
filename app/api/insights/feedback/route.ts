/**
 * Insight Feedback API Route
 *
 * Feature: 045-gear-detail-modal
 *
 * Handles user feedback (thumbs up/down) on GearGraph insights.
 * POST /api/insights/feedback - Submit feedback
 * GET /api/insights/feedback?hash=xxx - Get user's feedback for an insight
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import crypto from 'crypto';

// =============================================================================
// Zod Schemas
// =============================================================================

const feedbackSchema = z.object({
  insightContent: z.string().min(1).max(2000),
  isPositive: z.boolean(),
  gearItemId: z.string().uuid().optional(),
  gearBrand: z.string().max(100).optional(),
  gearName: z.string().max(200).optional(),
  categoryId: z.string().max(100).optional(),
});

// =============================================================================
// Helper Functions
// =============================================================================

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content.toLowerCase().trim()).digest('hex');
}

// =============================================================================
// POST Handler - Submit Feedback
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parseResult = feedbackSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { insightContent, isPositive, gearItemId, gearBrand, gearName, categoryId } =
      parseResult.data;

    const contentHash = hashContent(insightContent);

    // Upsert the feedback (update if exists, insert if not)
    const { data, error } = await (supabase as any)
      .from('insight_feedback')
      .upsert(
        {
          user_id: user.id,
          insight_content_hash: contentHash,
          insight_content: insightContent.slice(0, 2000),
          is_positive: isPositive,
          gear_item_id: gearItemId || null,
          gear_brand: gearBrand || null,
          gear_name: gearName || null,
          category_id: categoryId || null,
        },
        {
          onConflict: 'user_id,insight_content_hash',
        }
      )
      .select()
      .single();

    if (error) {
      console.error('[InsightFeedback] Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: data.id,
        isPositive: data.is_positive,
        contentHash: data.insight_content_hash,
      },
    });
  } catch (error) {
    console.error('[InsightFeedback] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// GET Handler - Get User's Feedback
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const contentHash = searchParams.get('hash');

    // Build query
    let query = supabase
      .from('insight_feedback')
      .select('insight_content_hash, is_positive')
      .eq('user_id', user.id);

    // If specific hash provided, filter by it
    if (contentHash) {
      query = query.eq('insight_content_hash', contentHash);
    }

    const { data, error } = await query;

    if (error) {
      console.error('[InsightFeedback] Query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch feedback' },
        { status: 500 }
      );
    }

    // Return as a map of hash -> isPositive for easy lookup
    const feedbackMap: Record<string, boolean> = {};
    for (const row of data || []) {
      feedbackMap[row.insight_content_hash] = row.is_positive;
    }

    return NextResponse.json({ feedback: feedbackMap });
  } catch (error) {
    console.error('[InsightFeedback] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE Handler - Remove Feedback
// =============================================================================

export async function DELETE(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const contentHash = searchParams.get('hash');

    if (!contentHash) {
      return NextResponse.json(
        { error: 'hash is required' },
        { status: 400 }
      );
    }

    const { error } = await (supabase as any)
      .from('insight_feedback')
      .delete()
      .eq('user_id', user.id)
      .eq('insight_content_hash', contentHash);

    if (error) {
      console.error('[InsightFeedback] Delete error:', error);
      return NextResponse.json(
        { error: 'Failed to delete feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[InsightFeedback] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
