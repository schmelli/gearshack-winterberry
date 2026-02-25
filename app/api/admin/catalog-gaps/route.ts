/**
 * Admin Catalog Gaps API Route
 *
 * Feature: Missing Gear Logging for Catalog Gap Detection
 *
 * GET /api/admin/catalog-gaps
 * Returns catalog gap report: searches that returned zero results,
 * sorted by frequency. Supports ?period=7d|30d|all query param.
 * Requires admin role.
 *
 * PATCH /api/admin/catalog-gaps
 * Updates the status of a catalog gap entry.
 * Body: { id: string, status: 'open' | 'catalog_added' | 'dismissed' | 'duplicate', note?: string }
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Type alias for Supabase client to bypass ungenerated table types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient;

    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '7d';
    const status = searchParams.get('status') || 'open';
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(limitParam, 1), 100);

    // Build query
    let query = supabase
      .from('catalog_gaps')
      .select('id, query, category_hint, scope, filters_used, occurrence_count, unique_users, first_seen_at, last_seen_at, status, resolution_note')
      .order('occurrence_count', { ascending: false })
      .limit(limit);

    // Apply period filter
    if (period !== 'all') {
      const days = period === '30d' ? 30 : 7;
      const since = new Date();
      since.setDate(since.getDate() - days);
      query = query.gte('last_seen_at', since.toISOString());
    }

    // Apply status filter
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[Admin Catalog Gaps] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch catalog gaps' }, { status: 500 });
    }

    // Get total open count for summary
    const { count: totalOpen } = await supabase
      .from('catalog_gaps')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open');

    // Get total occurrence count across all open gaps
    const { data: sumData } = await supabase
      .from('catalog_gaps')
      .select('occurrence_count')
      .eq('status', 'open');

    const totalSearchesMissed = (sumData || []).reduce(
      (sum: number, row: { occurrence_count: number }) => sum + row.occurrence_count,
      0
    );

    return NextResponse.json({
      gaps: (data || []).map((row: Record<string, unknown>) => ({
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
      })),
      summary: {
        totalOpenGaps: totalOpen || 0,
        totalSearchesMissed,
        period,
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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient() as AnyClient;

    // Verify admin role
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { id, status: newStatus, note } = body;

    if (!id || !newStatus) {
      return NextResponse.json({ error: 'id and status are required' }, { status: 400 });
    }

    const validStatuses = ['open', 'catalog_added', 'dismissed', 'duplicate'];
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('catalog_gaps')
      .update({
        status: newStatus,
        resolved_at: newStatus !== 'open' ? new Date().toISOString() : null,
        resolved_by: newStatus !== 'open' ? user.id : null,
        resolution_note: note || null,
      })
      .eq('id', id)
      .select('id, query, status')
      .single();

    if (error) {
      console.error('[Admin Catalog Gaps] Update error:', error);
      return NextResponse.json({ error: 'Failed to update catalog gap' }, { status: 500 });
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
