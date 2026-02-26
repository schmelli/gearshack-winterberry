/**
 * eBay Listing Feedback API
 *
 * Feature: 054-ebay-integration
 * Purpose: Store user feedback on eBay listing relevance for ML training
 *
 * POST /api/ebay-feedback
 * Body: EbayListingFeedback
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

// =============================================================================
// Validation Schema
// =============================================================================

const feedbackSchema = z.object({
  // Context
  gearItemId: z.string().uuid().optional(),
  searchQuery: z.string().min(1).max(200),

  // Listing details
  ebayItemId: z.string().min(1).max(100),
  listingTitle: z.string().min(1).max(500),
  listingPrice: z.number().positive().optional(),
  listingCurrency: z.string().length(3).default('EUR'),
  listingCondition: z.string().max(50).optional(),
  listingUrl: z.string().url().optional(),

  // Feedback
  feedbackType: z.enum(['irrelevant', 'wrong_product', 'accessory', 'knockoff', 'other']),
  feedbackReason: z.string().max(500).optional(),

  // Metadata
  brandName: z.string().max(100).optional(),
  itemName: z.string().max(200).optional(),
  wasFiltered: z.boolean().default(false),
});

export type EbayListingFeedbackInput = z.infer<typeof feedbackSchema>;

// =============================================================================
// Route Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate body
    const body = await request.json();
    const validationResult = feedbackSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validationResult.error.flatten() },
        { status: 400 }
      );
    }

    const feedback = validationResult.data;

    // Insert feedback
    const { data, error } = await supabase
      .from('ebay_listing_feedback')
      .insert({
        user_id: user.id,
        gear_item_id: feedback.gearItemId || null,
        search_query: feedback.searchQuery,
        ebay_item_id: feedback.ebayItemId,
        listing_title: feedback.listingTitle,
        listing_price: feedback.listingPrice || null,
        listing_currency: feedback.listingCurrency,
        listing_condition: feedback.listingCondition || null,
        listing_url: feedback.listingUrl || null,
        feedback_type: feedback.feedbackType,
        feedback_reason: feedback.feedbackReason || null,
        brand_name: feedback.brandName || null,
        item_name: feedback.itemName || null,
        was_filtered: feedback.wasFiltered,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[eBay Feedback] Insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      feedbackId: data.id,
    });

  } catch (error) {
    console.error('[eBay Feedback] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
