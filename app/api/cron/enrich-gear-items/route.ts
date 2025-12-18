/**
 * Cron job: Background GearGraph enrichment check
 * Feature: Gear enrichment system
 * Date: 2025-12-18
 * Schedule: Daily at 3 AM UTC
 *
 * Checks all user gear items for missing data and creates enrichment suggestions
 * from the GearGraph catalog. Never overwrites existing user data.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/utils/logger';

const log = createModuleLogger('cron:enrich-gear-items');

interface GearItem {
  id: string;
  user_id: string;
  name: string;
  brand: string | null;
  weight_grams: number | null;
  description: string | null;
  price_paid: number | null;
}

interface CatalogMatch {
  id: string;
  name: string;
  weight_grams: number | null;
  description: string | null;
  price_usd: number | null;
  score: number;
}

const MIN_MATCH_CONFIDENCE = 0.85; // Only suggest high-confidence matches

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    log.info('Starting gear enrichment check');

    // Fetch all gear items with at least one missing field
    const { data: gearItems, error: gearError } = await supabase
      .from('gear_items')
      .select('id, user_id, name, brand, weight_grams, description, price_paid')
      .or('weight_grams.is.null,description.is.null,price_paid.is.null')
      .eq('status', 'own') // Only enrich owned items, not wishlist
      .limit(1000); // Process up to 1000 items per run

    if (gearError) {
      log.error('Failed to fetch gear items', {}, gearError);
      return NextResponse.json({ error: 'Failed to fetch gear items' }, { status: 500 });
    }

    if (!gearItems || gearItems.length === 0) {
      log.info('No gear items with missing data found');
      return NextResponse.json({
        success: true,
        message: 'No gear items to enrich',
        processed: 0,
      });
    }

    log.info('Processing gear items for enrichment', { count: gearItems.length });

    let suggestionsCreated = 0;
    let notificationsCreated = 0;

    // Process each gear item
    for (const item of gearItems as GearItem[]) {
      try {
        // Search catalog for matching products
        const matches = await findCatalogMatches(supabase, item);

        if (matches.length === 0) {
          continue; // No matches found
        }

        // Take the best match
        const bestMatch = matches[0];

        // Check if we already have a pending suggestion for this item
        const { data: existingSuggestion } = await supabase
          // @ts-expect-error - gear_enrichment_suggestions table added in migration, types will be regenerated
          .from('gear_enrichment_suggestions')
          .select('id')
          .eq('gear_item_id', item.id)
          .eq('status', 'pending')
          .maybeSingle();

        if (existingSuggestion) {
          continue; // Skip if suggestion already exists
        }

        // Determine what fields can be enriched (only empty fields)
        const enrichmentData: {
          suggested_weight_grams?: number;
          suggested_description?: string;
          suggested_price_usd?: number;
        } = {};

        let hasEnrichment = false;

        if (!item.weight_grams && bestMatch.weight_grams) {
          enrichmentData.suggested_weight_grams = bestMatch.weight_grams;
          hasEnrichment = true;
        }

        if (!item.description && bestMatch.description) {
          enrichmentData.suggested_description = bestMatch.description;
          hasEnrichment = true;
        }

        if (!item.price_paid && bestMatch.price_usd) {
          enrichmentData.suggested_price_usd = bestMatch.price_usd;
          hasEnrichment = true;
        }

        // Only create suggestion if there's data to enrich
        if (!hasEnrichment) {
          continue;
        }

        // Create enrichment suggestion
        const { data: suggestion, error: suggestionError } = await supabase
          // @ts-expect-error - gear_enrichment_suggestions table added in migration, types will be regenerated
          .from('gear_enrichment_suggestions')
          .insert({
            user_id: item.user_id,
            gear_item_id: item.id,
            catalog_product_id: bestMatch.id,
            match_confidence: bestMatch.score,
            ...enrichmentData,
          })
          .select('id')
          .single();

        if (suggestionError) {
          log.error('Failed to create enrichment suggestion', { gear_item_id: item.id }, suggestionError);
          continue;
        }

        suggestionsCreated++;

        // Create notification for user
        const enrichmentFields = [];
        if (enrichmentData.suggested_weight_grams) enrichmentFields.push('weight');
        if (enrichmentData.suggested_description) enrichmentFields.push('description');
        if (enrichmentData.suggested_price_usd) enrichmentFields.push('price');

        const message = `New data available for "${item.name}": ${enrichmentFields.join(', ')}`;

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: item.user_id,
            type: 'gear_enrichment',
            reference_type: 'gear_enrichment_suggestion',
            reference_id: (suggestion as any).id,
            message,
          });

        if (notifError) {
          log.error('Failed to create notification', { gear_item_id: item.id }, notifError);
        } else {
          notificationsCreated++;
        }

        log.info('Created enrichment suggestion', {
          gear_item_id: item.id,
          fields: enrichmentFields,
          confidence: bestMatch.score,
        });
      } catch (err) {
        log.error('Failed to process gear item', { gear_item_id: item.id }, err as Error);
      }
    }

    log.info('Gear enrichment check completed', {
      processed: gearItems.length,
      suggestions_created: suggestionsCreated,
      notifications_created: notificationsCreated,
    });

    return NextResponse.json({
      success: true,
      processed: gearItems.length,
      suggestions_created: suggestionsCreated,
      notifications_created: notificationsCreated,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    log.error('Gear enrichment cron job error', {}, error as Error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Find matching catalog products for a gear item
 */
async function findCatalogMatches(
  supabase: any,
  item: GearItem
): Promise<CatalogMatch[]> {
  // Build search query - match by name and optionally brand
  let query = supabase
    .from('catalog_products')
    .select('id, name, weight_grams, description, price_usd')
    .ilike('name', `%${item.name}%`)
    .limit(5);

  // Filter by brand if available
  if (item.brand) {
    query = query.or(
      `brand_id.in.(select id from catalog_brands where name ilike '%${item.brand}%'),brand_external_id.ilike.%${item.brand}%`
    );
  }

  const { data, error } = await query;

  if (error || !data) {
    return [];
  }

  // Calculate similarity scores
  const matches: CatalogMatch[] = data.map((product: any) => {
    const nameLower = product.name.toLowerCase();
    const itemNameLower = item.name.toLowerCase();

    // Simple similarity: exact match > starts with > contains
    let score = 0;
    if (nameLower === itemNameLower) {
      score = 1.0;
    } else if (nameLower.startsWith(itemNameLower) || itemNameLower.startsWith(nameLower)) {
      score = 0.9;
    } else if (nameLower.includes(itemNameLower) || itemNameLower.includes(nameLower)) {
      score = 0.8;
    } else {
      score = 0.5; // Partial match from ILIKE
    }

    return {
      id: product.id,
      name: product.name,
      weight_grams: product.weight_grams,
      description: product.description,
      price_usd: product.price_usd,
      score,
    };
  });

  // Filter by minimum confidence and sort by score
  return matches
    .filter((m) => m.score >= MIN_MATCH_CONFIDENCE)
    .sort((a, b) => b.score - a.score);
}
