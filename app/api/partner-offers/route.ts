/**
 * API route: Partner retailers submit personal offers
 * Feature: 050-price-tracking (US5)
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { SEARCH_CONFIG } from '@/lib/constants/price-tracking';
import {
  partnerOfferSchema,
  validateRequestBody,
} from '@/lib/validation/price-tracking';
import type { FuzzySearchResult } from '@/types/database-helpers';

export async function POST(request: NextRequest) {
  try {
    // Check API key authentication
    const apiKey = request.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      );
    }

    const supabase = await createClient();

    // Verify API key belongs to an active partner (Review fix #2)
    const { data: partnerRaw, error: authError } = await supabase
      .from('partner_retailers')
      .select('id, name, is_active, rate_limit_per_hour')
      .eq('api_key', apiKey)
      .maybeSingle();

    const partner = partnerRaw as { id: string; name: string; is_active: boolean; rate_limit_per_hour: number } | null;
    if (authError || !partner) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        { error: 'Partner account is inactive' },
        { status: 403 }
      );
    }

    // Validate request body (Review fix #11)
    const { data: body, error: validationError } = await validateRequestBody(
      request,
      partnerOfferSchema
    );

    if (validationError || !body) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Check rate limit using database (production-safe, survives serverless cold starts)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- RPC function not yet in generated Supabase types
    const { data: withinLimit, error: rateLimitError } = await (supabase as any).rpc(
      'check_partner_rate_limit',
      {
        p_partner_id: partner.id,
        p_max_requests: partner.rate_limit_per_hour,
        p_window_seconds: 3600,
      }
    );

    // Separate error handling: database errors vs rate limit violations
    if (rateLimitError) {
      console.error('Rate limit check failed:', rateLimitError);
      return NextResponse.json(
        { error: 'Failed to check rate limit' },
        { status: 500 }
      );
    }

    if (!withinLimit) {
      return NextResponse.json(
        { error: `Rate limit exceeded. Maximum ${partner.rate_limit_per_hour} requests per hour.` },
        { status: 429 }
      );
    }

    // Find matching gear items using fuzzy search (Review fix #7)
    const { data: fuzzyMatches } = await supabase.rpc('fuzzy_search_products', {
      search_query: body.product_name,
      similarity_threshold: SEARCH_CONFIG.FUZZY_SIMILARITY_THRESHOLD,
      max_results: SEARCH_CONFIG.FUZZY_MAX_RESULTS,
    });

    if (!fuzzyMatches || fuzzyMatches.length === 0) {
      return NextResponse.json(
        { message: 'No matching products found', offers_created: 0 },
        { status: 200 }
      );
    }

    // Get tracking records for matched gear items
    const gearItemIds = (fuzzyMatches as FuzzySearchResult[]).map((match) => match.gear_item_id);
    const { data: trackingRecords } = await supabase
      .from('price_tracking')
      .select('id, user_id, gear_item_id')
      .in('gear_item_id', gearItemIds)
      .eq('alerts_enabled', true);

    if (!trackingRecords || trackingRecords.length === 0) {
      return NextResponse.json(
        { message: 'No users currently tracking matching products', offers_created: 0 },
        { status: 200 }
      );
    }

    // Create personal offers for matching users
    const offers = trackingRecords.map((record) => ({
        partner_retailer_id: partner.id,
        user_id: record.user_id,
        tracking_id: record.id,
        product_name: body.product_name,
        product_url: body.product_url,
        product_image_url: null, // Optional field, not provided in request
        offer_price: body.offer_price,
        original_price: body.original_price || body.offer_price,
        offer_currency: body.currency,
        expires_at: body.valid_until,
      }));

    if (offers.length === 0) {
      return NextResponse.json(
        { message: 'No matching users found for this product', offers_created: 0 },
        { status: 200 }
      );
    }

    // Insert personal offers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: createdOffers, error: offerError } = await (supabase as any)
      .from('personal_offers')
      .insert(offers)
      .select();

    if (offerError) {
      console.error('Failed to create offers:', offerError);
      return NextResponse.json(
        { error: 'Failed to create offers' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Personal offers created successfully',
        offers_created: createdOffers?.length || 0,
        partner_name: partner.name,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Partner offers route error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
