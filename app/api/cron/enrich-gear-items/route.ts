/**
 * Cron job: Background GearGraph enrichment check
 * Feature: Gear enrichment system
 * Date: 2025-12-18
 * Schedule: Daily at 3 AM UTC
 *
 * Checks all user gear items for missing data and creates enrichment suggestions
 * from the GearGraph catalog. Never overwrites existing user data.
 *
 * Tier Differentiation (added 2025-12-27):
 * - Trailblazer users: Get web search for weight when catalog has no match
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createModuleLogger } from '@/lib/utils/logger';
import { fuzzyProductSearch, fuzzyBrandSearch } from '@/lib/supabase/catalog';
import { searchProductWeight } from '@/app/actions/weight-search';
import { ENRICHMENT_CONFIG } from '@/lib/constants/enrichment';

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

const MIN_MATCH_CONFIDENCE = 0.70; // Match threshold - allows "contains" matches from fuzzyProductSearch

/**
 * Timing-safe comparison of authorization header to prevent timing attacks.
 * Uses constant-time comparison to avoid leaking secret length or content.
 */
function verifyAuthHeader(authHeader: string | null, expectedSecret: string | undefined): boolean {
  if (!authHeader || !expectedSecret) {
    return false;
  }
  const expected = `Bearer ${expectedSecret}`;
  if (authHeader.length !== expected.length) {
    return false;
  }
  try {
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret using timing-safe comparison
    const authHeader = request.headers.get('authorization');
    if (!verifyAuthHeader(authHeader, process.env.CRON_SECRET)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();
    log.info('Starting gear enrichment check');

    // Fetch all gear items with at least one missing field
    const { data: gearItems, error: gearError } = await (supabase as any)
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

    // Batch fetch subscription tiers for all users with pending items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userIds = [...new Set(gearItems.map((item: any) => item.user_id))];
    const { data: profiles, error: profilesError } = await (supabase as any)
      .from('profiles')
      .select('id, subscription_tier')
      .in('id', userIds);

    if (profilesError) {
      log.warn('Failed to fetch subscription tiers, proceeding without web search', {}, profilesError);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const trailblazerUsers = new Set(
      profiles?.filter((p: any) => p.subscription_tier === 'trailblazer').map((p: any) => p.id) || []
    );

    log.info('Subscription tiers fetched', {
      totalUsers: userIds.length,
      trailblazerCount: trailblazerUsers.size,
    });

    let suggestionsCreated = 0;
    let notificationsCreated = 0;
    let webSearchesPerformed = 0;

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
        const { data: existingSuggestion } = await (supabase as any)
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

        // For Trailblazer users: Try web search for weight if catalog has none
        const isTrailblazer = trailblazerUsers.has(item.user_id);
        if (
          !enrichmentData.suggested_weight_grams &&
          !item.weight_grams &&
          isTrailblazer &&
          webSearchesPerformed < ENRICHMENT_CONFIG.maxWebSearchesPerRun
        ) {
          try {
            // Build search query from brand + name
            const searchQuery = [item.brand, item.name].filter(Boolean).join(' ').trim();
            if (searchQuery.length >= 3) {
              // Add delay between web searches to avoid rate limiting
              if (webSearchesPerformed > 0) {
                await new Promise((resolve) => setTimeout(resolve, ENRICHMENT_CONFIG.webSearchDelayMs));
              }

              const webWeight = await searchProductWeight(searchQuery);
              webSearchesPerformed++;

              if (webWeight) {
                enrichmentData.suggested_weight_grams = webWeight.weightGrams;
                hasEnrichment = true;
                log.info('Found weight via web search', {
                  gear_item_id: item.id,
                  query: searchQuery,
                  weightGrams: webWeight.weightGrams,
                  confidence: webWeight.confidence,
                });
              }
            }
          } catch (webSearchError) {
            log.warn('Web search failed, continuing', { gear_item_id: item.id }, webSearchError as Error);
          }
        }

        // Only create suggestion if there's data to enrich
        if (!hasEnrichment) {
          continue;
        }

        // Create enrichment suggestion
        const { data: suggestion, error: suggestionError } = await (supabase as any)
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

        // Create notification for user with detailed field information
        const enrichmentDetails: string[] = [];
        // Track if weight came from web search for notification message
        const weightFromWebSearch = enrichmentData.suggested_weight_grams && !bestMatch.weight_grams;
        if (enrichmentData.suggested_weight_grams) {
          const weightStr = `${enrichmentData.suggested_weight_grams}g`;
          enrichmentDetails.push(weightFromWebSearch ? `Weight: ${weightStr} (web)` : `Weight: ${weightStr}`);
        }
        if (enrichmentData.suggested_price_usd) {
          enrichmentDetails.push(`Price: $${enrichmentData.suggested_price_usd.toFixed(2)}`);
        }
        if (enrichmentData.suggested_description) {
          // Truncate long descriptions
          const descPreview = enrichmentData.suggested_description.length > 50
            ? enrichmentData.suggested_description.slice(0, 47) + '...'
            : enrichmentData.suggested_description;
          enrichmentDetails.push(`Desc: "${descPreview}"`);
        }

        const message = `"${item.name}" • ${enrichmentDetails.join(' • ')}`;

        const { error: notifError } = await (supabase as any)
          .from('notifications')
          .insert({
            user_id: item.user_id,
            type: 'gear_enrichment',
            reference_type: 'gear_enrichment_suggestion',
            reference_id: suggestion.id,
            message,
          });

        if (notifError) {
          log.error('Failed to create notification', { gear_item_id: item.id }, notifError);
        } else {
          notificationsCreated++;
        }

        log.info('Created enrichment suggestion', {
          gear_item_id: item.id,
          fields: enrichmentDetails,
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
      web_searches_performed: webSearchesPerformed,
    });

    return NextResponse.json({
      success: true,
      processed: gearItems.length,
      suggestions_created: suggestionsCreated,
      notifications_created: notificationsCreated,
      web_searches_performed: webSearchesPerformed,
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
 * Uses the fuzzyProductSearch utility which has proper ILIKE queries and scoring
 */
async function findCatalogMatches(
  supabase: ReturnType<typeof createServiceRoleClient>,
  item: GearItem
): Promise<CatalogMatch[]> {
  try {
    // If brand is provided, first look up the brand ID
    let brandId: string | undefined;
    if (item.brand) {
      try {
        const brandResults = await fuzzyBrandSearch(supabase, item.brand, 1);
        if (brandResults.length > 0 && brandResults[0].similarity >= 0.7) {
          brandId = brandResults[0].id;
          log.debug('Found brand match', {
            brand: item.brand,
            matchedBrand: brandResults[0].name,
            similarity: brandResults[0].similarity
          });
        }
      } catch (brandError) {
        log.warn('Brand lookup failed, continuing without brand filter', { brand: item.brand }, brandError as Error);
      }
    }

    // Search for matching products using the proven fuzzyProductSearch
    const products = await fuzzyProductSearch(supabase, item.name, {
      brandId,
      limit: 5,
    });

    if (products.length === 0) {
      log.debug('No catalog matches found', { gear_item_id: item.id, name: item.name });
      return [];
    }

    // Map to CatalogMatch format and filter by confidence threshold
    const matches: CatalogMatch[] = products
      .filter((p) => p.score >= MIN_MATCH_CONFIDENCE)
      .map((product) => ({
        id: product.id,
        name: product.name,
        weight_grams: product.weightGrams,
        description: product.description,
        price_usd: product.priceUsd,
        score: product.score,
      }));

    log.debug('Catalog matches found', {
      gear_item_id: item.id,
      name: item.name,
      matchCount: matches.length,
      topScore: matches[0]?.score
    });

    return matches;
  } catch (error) {
    log.error('Failed to find catalog matches', { gear_item_id: item.id, name: item.name }, error as Error);
    return [];
  }
}
