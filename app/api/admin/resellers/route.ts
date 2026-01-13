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
import type {
  Reseller,
  ResellerListResponse,
  CreateResellerInput,
} from '@/types/reseller';

// =============================================================================
// Constants
// =============================================================================

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if user is admin
 */
async function checkAdminAccess(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { authorized: false, error: 'Unauthorized', status: 401 };
  }

  // Check if user has admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') {
    return { authorized: false, error: 'Forbidden: Admin access required', status: 403 };
  }

  return { authorized: true, user };
}

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
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('pageSize') || String(DEFAULT_PAGE_SIZE)))
    );
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

    // Apply filters
    if (search) {
      query = query.or(`name.ilike.%${search}%,website_url.ilike.%${search}%`);
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
      location: r.location as Reseller['location'],
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

    // Parse request body
    const body: CreateResellerInput = await request.json();

    // Validate required fields
    if (!body.name || !body.websiteUrl || !body.resellerType || !body.countriesServed?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: name, websiteUrl, resellerType, countriesServed' },
        { status: 400 }
      );
    }

    // Build location PostGIS point if coordinates provided
    let location = null;
    if (body.latitude !== null && body.longitude !== null &&
        body.latitude !== undefined && body.longitude !== undefined) {
      location = `POINT(${body.longitude} ${body.latitude})`;
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
      location: newReseller.location as Reseller['location'],
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
