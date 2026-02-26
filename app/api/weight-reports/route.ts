/**
 * API Route: Community Weight Reports
 * Feature: community-verified-weights
 *
 * GET  /api/weight-reports?catalogProductId=xxx - Get reports for a product
 * POST /api/weight-reports - Submit a weight report
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  getWeightReports,
  submitWeightReport,
} from '@/lib/supabase/weight-report-queries';

// =============================================================================
// Validation Schemas
// =============================================================================

const getParamsSchema = z.object({
  catalogProductId: z.string().uuid('Invalid UUID format for catalogProductId'),
});

const postBodySchema = z.object({
  catalogProductId: z.string().uuid('CommunityWeight.errors.invalidUuid'),
  reportedWeightGrams: z
    .number()
    .int('CommunityWeight.errors.mustBeInteger')
    .min(1, 'CommunityWeight.errors.tooLight')
    .max(99999, 'CommunityWeight.errors.tooHeavy'),
  measurementContext: z
    .string()
    .max(500, 'CommunityWeight.errors.contextTooLong')
    .optional(),
});

// =============================================================================
// GET - Fetch weight reports for a catalog product
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('catalogProductId');

    const parseResult = getParamsSchema.safeParse({ catalogProductId: rawId });
    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = await getWeightReports(supabase, parseResult.data.catalogProductId);

    // stats is null when the catalog product does not exist
    if (data.stats === null) {
      return NextResponse.json(
        { error: 'Catalog product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, ...data }, { status: 200 });
  } catch (error) {
    console.error('[API] Get weight reports failed:', error);
    return NextResponse.json(
      { error: 'Failed to fetch weight reports' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Submit or update a weight report
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parseResult = postBodySchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: parseResult.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 }
      );
    }

    const { catalogProductId, reportedWeightGrams, measurementContext } =
      parseResult.data;

    const result = await submitWeightReport(
      supabase,
      catalogProductId,
      reportedWeightGrams,
      measurementContext
    );

    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('[API] Submit weight report failed:', error);

    if (error instanceof Error) {
      if (error.message.includes('CATALOG_PRODUCT_NOT_FOUND')) {
        return NextResponse.json(
          { error: 'Catalog product not found' },
          { status: 404 }
        );
      }
      if (error.message.includes('NOT_AUTHENTICATED')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      if (error.message.includes('WEIGHT_OUT_OF_RANGE')) {
        return NextResponse.json(
          { error: 'CommunityWeight.errors.tooHeavy', code: 'WEIGHT_OUT_OF_RANGE' },
          { status: 422 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to submit weight report' },
      { status: 500 }
    );
  }
}
