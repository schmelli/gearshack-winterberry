/**
 * Admin Reseller API Routes
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: CRUD operations for reseller catalog management (Admin only)
 *
 * GET /api/admin/resellers - List all resellers (paginated)
 * POST /api/admin/resellers - Create new reseller
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess, createPostGISPoint } from '@/lib/supabase/admin-helpers';
import { CreateResellerSchema } from '@/lib/validations/reseller-schema';
import { parsePostGISLocation } from '@/lib/supabase/transformers';
import type {
  Reseller,
  ResellerListResponse,
} from '@/types/reseller';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// =============================================================================
// GET - List Resellers
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const access = await checkAdminAccess(supabase);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const pageRaw = parseInt(searchParams.get('page') || '1', 10);
    const page = Number.isFinite(pageRaw) ? Math.max(1, pageRaw) : 1;
    const pageSizeRaw = parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE), 10);
    const pageSize = Number.isFinite(pageSizeRaw)
      ? Math.min(MAX_PAGE_SIZE, Math.max(1, pageSizeRaw))
      : DEFAULT_PAGE_SIZE;
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') as Reseller['resellerType'] | null;
    const status = searchParams.get('status') as Reseller['status'] | null;
    const country = searchParams.get('country') || '';
    const isActive = searchParams.get('isActive');
    const sortField = searchParams.get('sortField') || 'name';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    // Build query
    let query = supabase
      .from('resellers')
      .select('*', { count: 'exact' });

    // Apply filters with sanitized search input
    if (search) {
      // Sanitize search: escape backslashes, ILIKE wildcards, and PostgREST operators
      const sanitizedSearch = search
        .slice(0, 100) // Limit length
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_')
        .replace(/,/g, '')       // Remove commas (PostgREST .or() delimiter)
        .replace(/\(/g, '')      // Remove parentheses (PostgREST operators)
        .replace(/\)/g, '');
      query = query.or(`name.ilike.%${sanitizedSearch}%,website_url.ilike.%${sanitizedSearch}%`);
    }

    if (type) {
      query = query.eq('reseller_type', type);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (country) {
      query = query.contains('countries_served', [country]);
    }

    if (isActive !== null) {
      query = query.eq('is_active', isActive === 'true');
    }

    // Apply sorting and pagination
    const offset = (page - 1) * pageSize;
    query = query
      .order(sortField, { ascending: sortOrder === 'asc' })
      .range(offset, offset + pageSize - 1);

    const { data: resellersData, error, count } = await query;

    if (error) {
      console.error('[Admin Resellers] Error fetching:', error);
      throw new Error('Failed to fetch resellers');
    }

    // Map database fields to TypeScript interface
    const resellers: Reseller[] = (resellersData ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      websiteUrl: r.website_url,
      logoUrl: r.logo_url,
      resellerType: r.reseller_type as Reseller['resellerType'],
      status: r.status as Reseller['status'],
      countriesServed: r.countries_served,
      searchUrlTemplate: r.search_url_template,
      affiliateTag: r.affiliate_tag,
      location: parsePostGISLocation(r.location),
      addressLine1: r.address_line1,
      addressLine2: r.address_line2,
      addressCity: r.address_city,
      addressPostalCode: r.address_postal_code,
      addressCountry: r.address_country,
      isActive: r.is_active,
      priority: r.priority,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const total = count ?? 0;
    const response: ResellerListResponse = {
      resellers,
      total,
      page,
      pageSize,
      hasMore: offset + resellers.length < total,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[Admin Resellers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resellers' },
      { status: 500 }
    );
  }
}

// =============================================================================
// POST - Create Reseller
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check admin access
    const access = await checkAdminAccess(supabase);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Parse and validate request body with JSON error handling
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const validationResult = CreateResellerSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const body = validationResult.data;

    // Build location PostGIS point with proper validation
    let location: string | null = null;
    try {
      location = createPostGISPoint(body.latitude, body.longitude);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Invalid coordinates' },
        { status: 400 }
      );
    }

    // Insert new reseller
    const { data: newReseller, error } = await supabase
      .from('resellers')
      .insert({
        name: body.name,
        website_url: body.websiteUrl,
        logo_url: body.logoUrl ?? null,
        reseller_type: body.resellerType,
        status: body.status ?? 'standard',
        countries_served: body.countriesServed,
        search_url_template: body.searchUrlTemplate ?? null,
        affiliate_tag: body.affiliateTag ?? null,
        location: location,
        address_line1: body.addressLine1 ?? null,
        address_line2: body.addressLine2 ?? null,
        address_city: body.addressCity ?? null,
        address_postal_code: body.addressPostalCode ?? null,
        address_country: body.addressCountry ?? null,
        is_active: body.isActive ?? true,
        priority: body.priority ?? 50,
      })
      .select()
      .single();

    if (error) {
      console.error('[Admin Resellers] Error creating:', error);
      return NextResponse.json(
        { error: 'Failed to create reseller' },
        { status: 500 }
      );
    }

    // Map to TypeScript interface
    const reseller: Reseller = {
      id: newReseller.id,
      name: newReseller.name,
      websiteUrl: newReseller.website_url,
      logoUrl: newReseller.logo_url,
      resellerType: newReseller.reseller_type as Reseller['resellerType'],
      status: newReseller.status as Reseller['status'],
      countriesServed: newReseller.countries_served,
      searchUrlTemplate: newReseller.search_url_template,
      affiliateTag: newReseller.affiliate_tag,
      location: parsePostGISLocation(newReseller.location),
      addressLine1: newReseller.address_line1,
      addressLine2: newReseller.address_line2,
      addressCity: newReseller.address_city,
      addressPostalCode: newReseller.address_postal_code,
      addressCountry: newReseller.address_country,
      isActive: newReseller.is_active,
      priority: newReseller.priority,
      createdAt: newReseller.created_at,
      updatedAt: newReseller.updated_at,
    };

    return NextResponse.json(reseller, { status: 201 });
  } catch (error) {
    console.error('[Admin Resellers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create reseller' },
      { status: 500 }
    );
  }
}
