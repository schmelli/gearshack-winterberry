/**
 * A/B Test Analytics API Route
 * Feature: A/B Testing for System Prompts (Kap. 29)
 *
 * GET /api/mastra/ab-analytics - Get experiment analytics
 * GET /api/mastra/ab-analytics?experiment=prompt-focus-v1 - Get specific experiment
 *
 * Returns variant-level satisfaction rates, user counts, and
 * basic statistical significance testing.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ExperimentAnalytics, VariantAnalytics } from '@/types/prompt-ab';

// Force Node.js runtime
export const runtime = 'nodejs';

// =============================================================================
// Statistical Significance (Chi-Squared Test)
// =============================================================================

/**
 * Basic chi-squared test for independence between variants.
 * Returns true if the difference is statistically significant (p < 0.05).
 *
 * Requires minimum 30 total feedbacks for meaningful results.
 */
function isStatisticallySignificant(variants: VariantAnalytics[]): boolean {
  if (variants.length < 2) return false;

  const totalFeedback = variants.reduce((sum, v) => sum + v.total_feedbacks, 0);

  // Minimum sample size requirement
  if (totalFeedback < 30) return false;

  const totalPositive = variants.reduce((sum, v) => sum + v.positive_feedbacks, 0);
  const totalNegative = variants.reduce((sum, v) => sum + v.negative_feedbacks, 0);

  if (totalPositive === 0 || totalNegative === 0) return false;

  // Chi-squared statistic
  let chiSquared = 0;
  for (const variant of variants) {
    const expectedPositive = (variant.total_feedbacks * totalPositive) / totalFeedback;
    const expectedNegative = (variant.total_feedbacks * totalNegative) / totalFeedback;

    if (expectedPositive > 0) {
      chiSquared += Math.pow(variant.positive_feedbacks - expectedPositive, 2) / expectedPositive;
    }
    if (expectedNegative > 0) {
      chiSquared += Math.pow(variant.negative_feedbacks - expectedNegative, 2) / expectedNegative;
    }
  }

  // Critical value for p < 0.05 with df = variants.length - 1
  // df=1: 3.841, df=2: 5.991, df=3: 7.815
  const criticalValues: Record<number, number> = { 1: 3.841, 2: 5.991, 3: 7.815 };
  const df = variants.length - 1;
  const criticalValue = criticalValues[df] ?? 3.841;

  return chiSquared > criticalValue;
}

// =============================================================================
// GET Handler
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const experimentName = searchParams.get('experiment');

    // Query the analytics view
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prompt_ab_analytics view not in generated types
    let query = (supabase as any)
      .from('prompt_ab_analytics')
      .select('*');

    if (experimentName) {
      query = query.eq('experiment_name', experimentName);
    }

    const { data: analyticsData, error: analyticsError } = await query;

    if (analyticsError) {
      console.error('[AB Analytics] Query error:', analyticsError);
      return NextResponse.json(
        { error: 'Failed to fetch analytics' },
        { status: 500 }
      );
    }

    if (!analyticsData || analyticsData.length === 0) {
      return NextResponse.json({
        experiments: [],
        message: 'No active experiments with data found',
      });
    }

    // Group by experiment
    const experimentMap = new Map<string, VariantAnalytics[]>();
    for (const row of analyticsData) {
      const name = row.experiment_name as string;
      if (!experimentMap.has(name)) {
        experimentMap.set(name, []);
      }
      experimentMap.get(name)!.push({
        experiment_name: row.experiment_name,
        variant_id: row.variant_id,
        unique_users: Number(row.unique_users),
        total_sessions: Number(row.total_sessions),
        positive_feedbacks: Number(row.positive_feedbacks),
        negative_feedbacks: Number(row.negative_feedbacks),
        total_feedbacks: Number(row.total_feedbacks),
        satisfaction_rate_pct: Number(row.satisfaction_rate_pct),
      });
    }

    // Fetch experiment metadata
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- prompt_ab_experiments not in generated types
    const { data: experiments } = await (supabase as any)
      .from('prompt_ab_experiments')
      .select('name, description, is_active, created_at')
      .in('name', Array.from(experimentMap.keys()));

    const experimentLookup = new Map<string, { name: string; description: string | null; is_active: boolean; created_at: string }>();
    for (const exp of experiments || []) {
      experimentLookup.set(exp.name, exp);
    }

    // Build response
    const results: ExperimentAnalytics[] = [];
    for (const [name, variants] of experimentMap) {
      const expMeta = experimentLookup.get(name);
      const totalFeedback = variants.reduce((sum, v) => sum + v.total_feedbacks, 0);

      results.push({
        experiment: {
          name,
          description: expMeta?.description ?? null,
          is_active: expMeta?.is_active ?? true,
          created_at: expMeta?.created_at ?? '',
        },
        variants,
        is_significant: isStatisticallySignificant(variants),
        total_feedback_count: totalFeedback,
      });
    }

    return NextResponse.json({ experiments: results });
  } catch (error) {
    console.error('[AB Analytics] Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// =============================================================================
// Method Not Allowed Handlers
// =============================================================================

export function POST(): Response {
  return new Response(
    JSON.stringify({ error: 'Method not allowed. Use GET.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'GET' } }
  );
}
