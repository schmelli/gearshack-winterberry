/**
 * Admin Catalog Gaps API Route
 *
 * Feature: Missing Gear Logging for Catalog Gap Detection
 *
 * GET /api/admin/catalog-gaps
 * Returns catalog gap report: searches that returned zero results,
 * sorted by frequency. Supports ?period=7d|30d|all, ?status=open|all,
 * ?page=N, ?limit=N query params. Requires admin role.
 *
 * PATCH /api/admin/catalog-gaps
 * Updates the status of a catalog gap entry.
 * Body: { id: string, status: 'open' | 'catalog_added' | 'dismissed' | 'duplicate', note?: string }
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// =============================================================================
// Validation schemas + constants
// =============================================================================

const VALID_PERIODS = ['7d', '30d', 'all'] as const;
type Period = (typeof VALID_PERIODS)[number];

const VALID_STATUSES = ['open', 'catalog_added', 'dismissed', 'duplicate', 'all'] as const;
type StatusFilter = (typeof VALID_STATUSES)[number];

const updateGapSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['open', 'catalog_added', 'dismissed', 'duplicate']),
  // max(2000) prevents multi-MB resolution notes from being stored
  note: z.string().max(2000).optional(),
});

// =============================================================================
// Typed row shape for catalog_gaps results
// (catalog_gaps is a new table not yet in generated Supabase types)
// =============================================================================

interface CatalogGapRow {
  id: string;
  query: string;
  category_hint: string | null;
  scope: string | null;
  filters_used: Record<string, unknown>;
  occurrence_count: number;
  unique_users: number;
  first_seen_at: string;
  last_seen_at: string;
  status: string;
  resolution_note: string | null;
}

// =============================================================================
// Admin role verification helper (eliminates duplication across GET and PATCH)
// =============================================================================

type AdminCheckResult =
  | { ok: true; userId: string }
  | { ok: false; errorResponse: NextResponse };

async function verifyAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<AdminCheckResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return {
      ok: false,
      errorResponse: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return { ok: true, userId: user.id };
}

// =============================================================================
// GET /api/admin/catalog-gaps
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminCheck = await verifyAdmin(supabase);
    if (!adminCheck.ok) return adminCheck.errorResponse;

    // Parse and validate query params
    const { searchParams } = new URL(request.url);

    const rawPeriod = searchParams.get('period') ?? '7d';
    const period: Period = (VALID_PERIODS as ReadonlyArray<string>).includes(rawPeriod)
      ? (rawPeriod as Period)
      : '7d';

    // Validate statusFilter against known values; invalid values fall back to 'open'
    const rawStatus = searchParams.get('status') ?? 'open';
    const statusFilter: StatusFilter = (VALID_STATUSES as ReadonlyArray<string>).includes(rawStatus)
      ? (rawStatus as StatusFilter)
      : 'open';

    const limitParam = parseInt(searchParams.get('limit') ?? '20', 10);
    const limit = Math.min(Math.max(limitParam, 1), 100);
    const pageParam = parseInt(searchParams.get('page') ?? '1', 10);
    const page = Math.max(pageParam, 1);
    const offset = (page - 1) * limit;

    // catalog_gaps is a new table not yet in the generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any;

    // Build paginated items query
    let itemsQuery = db
      .from('catalog_gaps')
      .select(
        'id, query, category_hint, scope, filters_used, occurrence_count, unique_users, first_seen_at, last_seen_at, status, resolution_note'
      )
      .order('occurrence_count', { ascending: false })
      .range(offset, offset + limit - 1);

    // Build matching count query (same filters, no pagination)
    let countQuery = db
      .from('catalog_gaps')
      .select('*', { count: 'exact', head: true });

    // Hoist sinceISO so it can be passed to the summary RPC for period alignment
    let sinceISO: string | null = null;

    // Apply period filter
    if (period !== 'all') {
      const days = period === '30d' ? 30 : 7;
      const since = new Date();
      since.setDate(since.getDate() - days);
      sinceISO = since.toISOString();
      itemsQuery = itemsQuery.gte('last_seen_at', sinceISO);
      countQuery = countQuery.gte('last_seen_at', sinceISO);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      itemsQuery = itemsQuery.eq('status', statusFilter);
      countQuery = countQuery.eq('status', statusFilter);
    }

    // Execute items, total count, and open-gap summary in parallel.
    // Pass sinceISO to the summary RPC so it matches the period filter applied
    // to the items list (otherwise summary would always show all-time totals).
    const [itemsResult, countResult, summaryResult] = await Promise.all([
      itemsQuery,
      countQuery,
      db.rpc('get_catalog_gap_summary', { p_since_date: sinceISO }).single(),
    ]);

    if (itemsResult.error) {
      console.error('[Admin Catalog Gaps] Query error:', itemsResult.error);
      return NextResponse.json(
        { error: 'Failed to fetch catalog gaps' },
        { status: 500 }
      );
    }

    if (countResult.error) {
      console.error('[Admin Catalog Gaps] Count query error:', countResult.error);
      return NextResponse.json(
        { error: 'Failed to count catalog gaps' },
        { status: 500 }
      );
    }

    if (summaryResult.error) {
      // Non-fatal: log the error but continue with zeroed summary rather than
      // failing the whole request — items + pagination data are still useful.
      console.error('[Admin Catalog Gaps] Summary RPC error:', summaryResult.error);
    }

    const totalMatchingCount = (countResult.count as number) ?? 0;
    const totalPages = Math.ceil(totalMatchingCount / limit);
    const summaryRow = summaryResult.data as {
      total_open_gaps: number;
      total_searches_missed: number;
    } | null;

    return NextResponse.json({
      gaps: ((itemsResult.data || []) as CatalogGapRow[]).map(
        (row) => ({
          id: row.id,
          query: row.query,
          categoryHint: row.category_hint,
          scope: row.scope,
          filtersUsed: row.filters_used,
          frequency: row.occurrence_count,
          uniqueUsers: row.unique_users,
          firstSeen: row.first_seen_at,
          lastSeen: row.last_seen_at,
          status: row.status,
          resolutionNote: row.resolution_note,
        })
      ),
      summary: {
        totalOpenGaps: summaryRow?.total_open_gaps ?? 0,
        totalSearchesMissed: summaryRow?.total_searches_missed ?? 0,
        period,
      },
      pagination: {
        page,
        limit,
        total: totalMatchingCount,
        totalPages,
        hasMore: page < totalPages,
      },
    });
  } catch (error) {
    console.error('[Admin Catalog Gaps] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch catalog gaps report' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH /api/admin/catalog-gaps
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();
    const adminCheck = await verifyAdmin(supabase);
    if (!adminCheck.ok) return adminCheck.errorResponse;
    const { userId } = adminCheck;

    // Parse request body (guard against malformed JSON)
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // Validate with Zod
    const parseResult = updateGapSchema.safeParse(rawBody);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parseResult.error.issues },
        { status: 400 }
      );
    }

    const { id, status: newStatus, note } = parseResult.data;

    // Build the update object. resolution_note is only included when the caller
    // explicitly provides it — omitting it preserves the existing note in the DB.
    // Using `note ?? null` would wipe the note whenever it's not in the request body.
    const updatePayload: Record<string, unknown> = {
      status: newStatus,
      resolved_at: newStatus !== 'open' ? new Date().toISOString() : null,
      resolved_by: newStatus !== 'open' ? userId : null,
    };
    if (note !== undefined) {
      updatePayload.resolution_note = note;
    }

    // catalog_gaps is a new table not yet in the generated Supabase types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from('catalog_gaps')
      .update(updatePayload)
      .eq('id', id)
      .select('id, query, status')
      .maybeSingle();

    if (error) {
      console.error('[Admin Catalog Gaps] Update error:', error);
      return NextResponse.json(
        { error: 'Failed to update catalog gap' },
        { status: 500 }
      );
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Catalog gap not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, gap: data });
  } catch (error) {
    console.error('[Admin Catalog Gaps] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update catalog gap' },
      { status: 500 }
    );
  }
}
