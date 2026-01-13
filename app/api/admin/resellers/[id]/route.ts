/**
 * Admin Single Reseller API Routes
 *
 * Feature: 057-wishlist-pricing-enhancements
 * Purpose: Individual reseller operations (Admin only)
 *
 * GET /api/admin/resellers/[id] - Get single reseller
 * PATCH /api/admin/resellers/[id] - Update reseller
 * DELETE /api/admin/resellers/[id] - Delete reseller
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkAdminAccess, createPostGISPoint } from '@/lib/supabase/admin-helpers';
import { UpdateResellerSchema } from '@/lib/validations/reseller-schema';
import { parsePostGISLocation } from '@/lib/supabase/transformers';
import type { Reseller } from '@/types/reseller';
import type { Database } from '@/types/supabase';

type ResellerRow = Database['public']['Tables']['resellers']['Row'];

/**
 * Map database record to Reseller type
 */
function mapToReseller(r: ResellerRow): Reseller {
  return {
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
  };
}

// =============================================================================
// Route Params Type
// =============================================================================

interface RouteParams {
  params: Promise<{ id: string }>;
}

// =============================================================================
// GET - Get Single Reseller
// =============================================================================

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin access
    const access = await checkAdminAccess(supabase);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Fetch reseller
    const { data: resellerData, error } = await supabase
      .from('resellers')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !resellerData) {
      return NextResponse.json(
        { error: 'Reseller not found' },
        { status: 404 }
      );
    }

    const reseller = mapToReseller(resellerData);
    return NextResponse.json(reseller);
  } catch (error) {
    console.error('[Admin Resellers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reseller' },
      { status: 500 }
    );
  }
}

// =============================================================================
// PATCH - Update Reseller
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin access
    const access = await checkAdminAccess(supabase);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Parse and validate request body
    const rawBody = await request.json();
    const validationResult = UpdateResellerSchema.safeParse(rawBody);

    if (!validationResult.success) {
      const errors = validationResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return NextResponse.json(
        { error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const body = validationResult.data;

    // Build update object (only include provided fields)
    type ResellerUpdate = Database['public']['Tables']['resellers']['Update'];
    const updateData: ResellerUpdate = {
      updated_at: new Date().toISOString(),
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.websiteUrl !== undefined) updateData.website_url = body.websiteUrl;
    if (body.logoUrl !== undefined) updateData.logo_url = body.logoUrl;
    if (body.resellerType !== undefined) updateData.reseller_type = body.resellerType;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.countriesServed !== undefined) updateData.countries_served = body.countriesServed;
    if (body.searchUrlTemplate !== undefined) updateData.search_url_template = body.searchUrlTemplate;
    if (body.affiliateTag !== undefined) updateData.affiliate_tag = body.affiliateTag;
    if (body.addressLine1 !== undefined) updateData.address_line1 = body.addressLine1;
    if (body.addressLine2 !== undefined) updateData.address_line2 = body.addressLine2;
    if (body.addressCity !== undefined) updateData.address_city = body.addressCity;
    if (body.addressPostalCode !== undefined) updateData.address_postal_code = body.addressPostalCode;
    if (body.addressCountry !== undefined) updateData.address_country = body.addressCountry;
    if (body.isActive !== undefined) updateData.is_active = body.isActive;
    if (body.priority !== undefined) updateData.priority = body.priority;

    // Handle location update with proper validation
    if (body.latitude !== undefined || body.longitude !== undefined) {
      try {
        updateData.location = createPostGISPoint(body.latitude, body.longitude);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Invalid coordinates' },
          { status: 400 }
        );
      }
    }

    // Update reseller
    const { data: updatedData, error } = await supabase
      .from('resellers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedData) {
      console.error('[Admin Resellers] Error updating:', error);
      return NextResponse.json(
        { error: 'Failed to update reseller' },
        { status: 500 }
      );
    }

    const reseller = mapToReseller(updatedData);
    return NextResponse.json(reseller);
  } catch (error) {
    console.error('[Admin Resellers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update reseller' },
      { status: 500 }
    );
  }
}

// =============================================================================
// DELETE - Delete Reseller
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient();
    const { id } = await params;

    // Check admin access
    const access = await checkAdminAccess(supabase);
    if (!access.authorized) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    // Delete reseller
    const { error } = await supabase
      .from('resellers')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('[Admin Resellers] Error deleting:', error);
      return NextResponse.json(
        { error: 'Failed to delete reseller' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Admin Resellers] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete reseller' },
      { status: 500 }
    );
  }
}
