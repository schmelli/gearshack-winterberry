/**
 * Admin Missing Brands API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * GET /api/admin/contributions/missing-brands
 * Returns paginated list of missing brands for admin dashboard.
 *
 * PATCH /api/admin/contributions/missing-brands
 * Updates status of a missing brand (pending → added_to_catalog/rejected/merged).
 *
 * Requires admin role.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { MissingBrand, MissingBrandRow, MissingBrandsResponse } from '@/types/contributions';

// =============================================================================
// GET Handler - List Missing Brands
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Parse query parameters with validation
    const { searchParams } = new URL(request.url);
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
    const limitRaw = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 20;
    const status = searchParams.get('status') || 'pending';
    const search = searchParams.get('search') || '';

    const offset = (page - 1) * limit;

    // Build query - using raw query to avoid type issues with ungenerated table types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (supabase as any)
      .from('missing_brands_log')
      .select('*', { count: 'exact' });

    // Filter by status
    if (status !== 'all') {
      query = query.eq('status', status);
    }

    // Search by brand name - escape ILIKE special characters to prevent injection
    if (search) {
      const sanitizedSearch = search
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      query = query.ilike('brand_name', `%${sanitizedSearch}%`);
    }

    // Order and paginate
    query = query
      .order('occurrence_count', { ascending: false })
      .order('last_seen_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query as {
      data: MissingBrandRow[] | null;
      error: Error | null;
      count: number | null;
    };

    if (error) {
      console.error('[Admin Missing Brands] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch missing brands' }, { status: 500 });
    }

    // Transform to MissingBrand type
    const brands: MissingBrand[] = (data || []).map((row: MissingBrandRow) => ({
      id: row.id,
      brandName: row.brand_name,
      brandNameNormalized: row.brand_name_normalized,
      occurrenceCount: row.occurrence_count,
      firstSeenAt: row.first_seen_at,
      lastSeenAt: row.last_seen_at,
      status: row.status,
      sourceUrls: row.source_urls || [],
      countriesSeen: row.countries_seen || [],
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
      resolutionNote: row.resolution_note,
      mergedIntoBrandId: row.merged_into_brand_id,
    }));

    const response: MissingBrandsResponse = {
      brands,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Missing Brands] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch missing brands' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH Handler - Update Brand Status
// =============================================================================

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

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

    // Parse request body with error handling
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { id, status } = body as { id: string; status: string };

    // Validate
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'added_to_catalog', 'rejected', 'merged'];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    // Update the record - using raw query to avoid type issues with ungenerated table types
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from('missing_brands_log')
      .update({ status })
      .eq('id', id);

    if (updateError) {
      console.error('[Admin Missing Brands] Update error:', updateError);
      return NextResponse.json({ error: 'Failed to update brand status' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Missing Brands] PATCH Error:', error);
    return NextResponse.json(
      { error: 'Failed to update brand status' },
      { status: 500 }
    );
  }
}
