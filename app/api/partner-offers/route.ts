/**
 * API route: Partner retailers submit personal offers
 * Feature: 050-price-tracking (US5)
 * Date: 2025-12-17
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface PartnerOfferRequest {
  partner_retailer_id: string;
  product_id: string;
  product_name: string;
  product_url: string;
  offer_price: number;
  original_price?: number;
  currency: string;
  valid_until: string; // ISO timestamp
  description?: string;
  terms?: string;
}

// Rate limiting tracking (in-memory for MVP)
const rateLimits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // requests per hour
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour in ms

function checkRateLimit(partnerId: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(partnerId);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(partnerId, { count: 1, resetAt: now + RATE_WINDOW });
    return true;
  }

  if (limit.count >= RATE_LIMIT) {
    return false;
  }

  limit.count++;
  return true;
}

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

    // Verify API key matches environment variable
    if (apiKey !== process.env.PARTNER_API_SECRET) {
      return NextResponse.json(
        { error: 'Invalid API key' },
        { status: 403 }
      );
    }

    // Parse request body
    const body: PartnerOfferRequest = await request.json();

    // Validate required fields
    if (!body.partner_retailer_id || !body.product_id || !body.offer_price) {
      return NextResponse.json(
        { error: 'Missing required fields: partner_retailer_id, product_id, offer_price' },
        { status: 400 }
      );
    }

    // Check rate limit
    if (!checkRateLimit(body.partner_retailer_id)) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Maximum 100 requests per hour.' },
        { status: 429 }
      );
    }

    const supabase = await createClient();

    // Verify partner retailer exists and is active
    const { data: partner, error: partnerError } = await supabase
      .from('partner_retailers')
      .select('id, name, is_active')
      .eq('id', body.partner_retailer_id)
      .maybeSingle();

    if (partnerError || !partner) {
      return NextResponse.json(
        { error: 'Partner retailer not found' },
        { status: 404 }
      );
    }

    if (!partner.is_active) {
      return NextResponse.json(
        { error: 'Partner account is inactive' },
        { status: 403 }
      );
    }

    // Find users tracking similar products
    const { data: trackingRecords } = await supabase
      .from('price_tracking')
      .select(`
        id,
        user_id,
        gear_item_id,
        gear_items (name)
      `)
      .eq('alerts_enabled', true)
      .limit(100);

    if (!trackingRecords || trackingRecords.length === 0) {
      return NextResponse.json(
        { message: 'No users currently tracking products', offers_created: 0 },
        { status: 200 }
      );
    }

    // Create personal offers for matching users
    const offers = trackingRecords
      .filter((record) => {
        const gearItem = record.gear_items as any;
        const gearName = gearItem?.name?.toLowerCase() || '';
        const productName = body.product_name.toLowerCase();

        // Simple fuzzy matching - check if product name contains major keywords
        const keywords = productName.split(' ').filter((word) => word.length > 3);
        return keywords.some((keyword) => gearName.includes(keyword));
      })
      .map((record) => ({
        partner_retailer_id: body.partner_retailer_id,
        user_id: record.user_id,
        tracking_id: record.id,
        product_id: body.product_id,
        product_name: body.product_name,
        product_url: body.product_url,
        offer_price: body.offer_price,
        original_price: body.original_price,
        currency: body.currency,
        valid_until: body.valid_until,
        description: body.description,
        terms: body.terms,
      }));

    if (offers.length === 0) {
      return NextResponse.json(
        { message: 'No matching users found for this product', offers_created: 0 },
        { status: 200 }
      );
    }

    // Insert personal offers
    const { data: createdOffers, error: offerError } = await supabase
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
