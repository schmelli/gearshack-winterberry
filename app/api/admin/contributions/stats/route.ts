/**
 * Admin Contributions Stats API Route
 *
 * Feature: URL-Import & Contributions Tracking
 *
 * GET /api/admin/contributions/stats
 * Returns aggregated contribution statistics for admin dashboard.
 * Requires admin role.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ContributionStats } from '@/types/contributions';

// Type alias for Supabase client to bypass ungenerated table types
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

export async function GET() {
  try {
    const supabase = await createClient() as AnyClient;

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

    // Get total contributions
    const { count: totalContributions } = await supabase
      .from('user_contributions')
      .select('*', { count: 'exact', head: true });

    // Get contributions in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const { count: totalContributions7d } = await supabase
      .from('user_contributions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());

    // Get contributions in last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { count: totalContributions30d } = await supabase
      .from('user_contributions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    // Get unique contributors
    const { data: uniqueContributorsData } = await supabase
      .from('user_contributions')
      .select('contributor_hash')
      .limit(10000);
    const uniqueContributors = new Set(
      uniqueContributorsData?.map((c: { contributor_hash: string }) => c.contributor_hash) || []
    ).size;

    // Get matched vs unmatched counts
    const { count: matchedCount } = await supabase
      .from('user_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('geargraph_matched', true);

    const { count: unmatchedCount } = await supabase
      .from('user_contributions')
      .select('*', { count: 'exact', head: true })
      .eq('geargraph_matched', false);

    // Get country distribution
    const { data: countryData } = await supabase
      .from('user_contributions')
      .select('contributor_country_code')
      .not('contributor_country_code', 'is', null);

    const countryCounts = new Map<string, number>();
    countryData?.forEach((c: { contributor_country_code: string | null }) => {
      if (c.contributor_country_code) {
        countryCounts.set(
          c.contributor_country_code,
          (countryCounts.get(c.contributor_country_code) || 0) + 1
        );
      }
    });

    const totalWithCountry = countryData?.length || 1;
    const countryDistribution = Array.from(countryCounts.entries())
      .map(([countryCode, count]) => ({
        countryCode,
        count,
        percentage: Math.round((count / totalWithCountry) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Get missing brands count
    const { count: missingBrandsCount } = await supabase
      .from('missing_brands_log')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Get top missing brands
    const { data: topBrandsData } = await supabase
      .from('missing_brands_log')
      .select('brand_name, occurrence_count, first_seen_at, countries_seen')
      .eq('status', 'pending')
      .order('occurrence_count', { ascending: false })
      .limit(10);

    const topMissingBrands = (topBrandsData || []).map((b: {
      brand_name: string;
      occurrence_count: number;
      first_seen_at: string;
      countries_seen: string[] | null;
    }) => ({
      brandName: b.brand_name,
      count: b.occurrence_count,
      firstSeen: b.first_seen_at,
      countriesSeen: b.countries_seen || [],
    }));

    // Get frequently added fields
    const { data: addedFieldsData } = await supabase
      .from('user_contributions')
      .select('user_added_fields')
      .not('user_added_fields', 'eq', '{}')
      .limit(1000);

    const fieldCounts = new Map<string, number>();
    addedFieldsData?.forEach((c: { user_added_fields: Record<string, boolean> }) => {
      const fields = c.user_added_fields;
      Object.keys(fields).forEach((field) => {
        fieldCounts.set(field, (fieldCounts.get(field) || 0) + 1);
      });
    });

    const totalFieldEntries = addedFieldsData?.length || 1;
    const frequentlyAddedFields = Array.from(fieldCounts.entries())
      .map(([field, count]) => ({
        field,
        count,
        percentage: Math.round((count / totalFieldEntries) * 100),
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate match rate
    const total = (totalContributions || 0);
    const matched = (matchedCount || 0);
    const matchRate = total > 0 ? Math.round((matched / total) * 100) : 0;

    const stats: ContributionStats = {
      totalContributions: totalContributions || 0,
      totalContributions7d: totalContributions7d || 0,
      totalContributions30d: totalContributions30d || 0,
      uniqueContributors,
      matchedCount: matchedCount || 0,
      unmatchedCount: unmatchedCount || 0,
      matchRate,
      countryDistribution,
      missingBrandsCount: missingBrandsCount || 0,
      topMissingBrands,
      frequentlyAddedFields,
      frequentlyModifiedFields: [], // Would need similar logic
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error('[Admin Contributions Stats] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contribution stats' },
      { status: 500 }
    );
  }
}
