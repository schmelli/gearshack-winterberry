/**
 * Contribution Tracking API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * POST /api/contributions/track
 * Records anonymous user contribution for admin analytics.
 * Called after a new gear item is saved.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/server';
import { createHash } from 'crypto';
import type { TrackContributionRequest } from '@/types/contributions';

// Type alias for Supabase client to bypass ungenerated table types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

// =============================================================================
// Configuration
// =============================================================================

/** Salt for hashing user IDs (should be set in env for production) */
const HASH_SALT = process.env.CONTRIBUTION_HASH_SALT || 'gearshack-contributions-v1';

// =============================================================================
// Helpers
// =============================================================================

/**
 * Hash user ID for anonymous tracking
 */
function hashUserId(userId: string): string {
  return createHash('sha256')
    .update(`${userId}:${HASH_SALT}`)
    .digest('hex')
    .substring(0, 16);
}

/**
 * Get country code from request headers or profile
 */
async function getCountryCode(
  request: NextRequest,
  userId: string,
  supabase: AnyClient
): Promise<string | null> {
  // Try Cloudflare header first (available on Vercel)
  const cfCountry = request.headers.get('CF-IPCountry');
  if (cfCountry && cfCountry.length === 2 && cfCountry !== 'XX') {
    return cfCountry.toUpperCase();
  }

  // Try Vercel geo header
  const vercelCountry = request.headers.get('x-vercel-ip-country');
  if (vercelCountry && vercelCountry.length === 2) {
    return vercelCountry.toUpperCase();
  }

  // Fallback: Try to get from user profile location_name
  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('location_name')
      .eq('id', userId)
      .single();

    if (profile?.location_name) {
      // Simple country name to code mapping for common countries
      const countryMap: Record<string, string> = {
        germany: 'DE',
        deutschland: 'DE',
        austria: 'AT',
        österreich: 'AT',
        switzerland: 'CH',
        schweiz: 'CH',
        'united states': 'US',
        usa: 'US',
        'united kingdom': 'GB',
        uk: 'GB',
        france: 'FR',
        italy: 'IT',
        spain: 'ES',
        netherlands: 'NL',
        belgium: 'BE',
        canada: 'CA',
        australia: 'AU',
      };

      const locationLower = profile.location_name.toLowerCase();
      for (const [name, code] of Object.entries(countryMap)) {
        if (locationLower.includes(name)) {
          return code;
        }
      }
    }
  } catch {
    // Ignore errors, country is optional
  }

  return null;
}

/**
 * Check if brand exists in catalog
 */
async function checkBrandInCatalog(
  brandName: string,
  serviceClient: AnyClient
): Promise<boolean> {
  if (!brandName) return false;

  const { data } = await serviceClient
    .from('catalog_brands')
    .select('id')
    .ilike('name', brandName)
    .limit(1);

  return (data?.length ?? 0) > 0;
}

// =============================================================================
// POST Handler
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json() as TrackContributionRequest;
    const {
      gearItemId,
      brandName,
      productName,
      sourceUrl,
      catalogMatchId,
      catalogMatchConfidence,
      userAddedFields,
      userModifiedFields,
    } = body;

    // Validate required fields
    if (!gearItemId || !productName) {
      return NextResponse.json(
        { error: 'gearItemId and productName are required' },
        { status: 400 }
      );
    }

    // Get anonymous contributor info
    const contributorHash = hashUserId(user.id);
    const countryCode = await getCountryCode(request, user.id, supabase);

    // Use service role client for inserts (bypasses RLS)
    const serviceClient = createServiceRoleClient() as AnyClient;

    // Convert field arrays to JSONB objects
    const addedFieldsObj = (userAddedFields || []).reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {} as Record<string, boolean>
    );
    const modifiedFieldsObj = (userModifiedFields || []).reduce(
      (acc, field) => ({ ...acc, [field]: true }),
      {} as Record<string, boolean>
    );

    // Insert contribution record
    const { error: insertError } = await serviceClient
      .from('user_contributions')
      .insert({
        contributor_hash: contributorHash,
        contributor_country_code: countryCode,
        gear_item_id: gearItemId,
        brand_name: brandName || 'Unknown',
        product_name: productName,
        source_url: sourceUrl || null,
        geargraph_matched: !!catalogMatchId,
        matched_catalog_product_id: catalogMatchId || null,
        matched_confidence: catalogMatchConfidence || null,
        user_added_fields: addedFieldsObj,
        user_modified_fields: modifiedFieldsObj,
      });

    if (insertError) {
      console.error('[Contributions] Insert error:', insertError);
      // Don't fail the request - contribution tracking is non-critical
    }

    // If brand is not empty and not matched, log as missing brand
    if (brandName && !catalogMatchId) {
      const brandExists = await checkBrandInCatalog(brandName, serviceClient);

      if (!brandExists) {
        // Use the upsert function we created in the migration
        await serviceClient.rpc('upsert_missing_brand', {
          p_brand_name: brandName,
          p_source_url: sourceUrl || null,
          p_country_code: countryCode,
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Contributions] Track error:', error);
    // Return success anyway - contribution tracking should not block the user
    return NextResponse.json({ success: true });
  }
}
