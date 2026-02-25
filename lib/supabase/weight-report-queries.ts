/**
 * Weight Report Supabase Queries
 * Feature: community-verified-weights
 *
 * Service layer for community weight reporting using Supabase RPC functions.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  WeightReportsResponse,
  WeightReport,
  WeightReportStats,
  UserWeightReport,
  SubmitWeightReportResponse,
} from '@/types/weight-report';

// =============================================================================
// Raw RPC Response Types (snake_case from Postgres)
// =============================================================================

interface RawWeightReport {
  id: string;
  reported_weight_grams: number;
  measurement_context: string | null;
  created_at: string;
  is_own_report: boolean;
}

interface RawWeightReportStats {
  report_count: number;
  community_weight_grams: number | null;
  is_verified: boolean;
  manufacturer_weight_grams: number | null;
}

interface RawUserWeightReport {
  id: string;
  reported_weight_grams: number;
  measurement_context: string | null;
}

interface RawGetWeightReportsResponse {
  reports: RawWeightReport[];
  /** Null when p_catalog_product_id does not exist in catalog_products */
  stats: RawWeightReportStats | null;
  user_report: RawUserWeightReport | null;
}

interface RawSubmitResponse {
  report_id: string;
  report_count: number;
  community_weight_grams: number | null;
  is_verified: boolean;
}

// =============================================================================
// Transformers
// =============================================================================

function transformReport(raw: RawWeightReport): WeightReport {
  return {
    id: raw.id,
    reportedWeightGrams: raw.reported_weight_grams,
    measurementContext: raw.measurement_context,
    createdAt: raw.created_at,
    isOwnReport: raw.is_own_report,
  };
}

function transformStats(raw: RawWeightReportStats | null): WeightReportStats | null {
  if (!raw) return null;
  return {
    reportCount: raw.report_count,
    communityWeightGrams: raw.community_weight_grams,
    isVerified: raw.is_verified,
    manufacturerWeightGrams: raw.manufacturer_weight_grams,
  };
}

function transformUserReport(raw: RawUserWeightReport | null): UserWeightReport | null {
  if (!raw) return null;
  return {
    id: raw.id,
    reportedWeightGrams: raw.reported_weight_grams,
    measurementContext: raw.measurement_context,
  };
}

// =============================================================================
// Query Functions
// =============================================================================

/**
 * Fetch all weight reports and stats for a catalog product
 */
export async function getWeightReports(
  supabase: SupabaseClient,
  catalogProductId: string
): Promise<WeightReportsResponse> {
  const { data, error } = await supabase
    .rpc('get_weight_reports', { p_catalog_product_id: catalogProductId });

  if (error) throw new Error(`Failed to fetch weight reports: ${error.message}`);

  const raw = data as RawGetWeightReportsResponse;
  return {
    reports: (raw.reports || []).map(transformReport),
    stats: transformStats(raw.stats),   // null when catalog product not found
    userReport: transformUserReport(raw.user_report),
  };
}

/**
 * Submit or update a weight report for a catalog product
 */
export async function submitWeightReport(
  supabase: SupabaseClient,
  catalogProductId: string,
  reportedWeightGrams: number,
  measurementContext?: string
): Promise<SubmitWeightReportResponse> {
  const { data, error } = await supabase
    .rpc('submit_weight_report', {
      p_catalog_product_id: catalogProductId,
      p_reported_weight_grams: reportedWeightGrams,
      p_measurement_context: measurementContext ?? null,
    });

  if (error) throw new Error(`Failed to submit weight report: ${error.message}`);

  const raw = data as RawSubmitResponse;
  return {
    reportId: raw.report_id,
    reportCount: raw.report_count,
    communityWeightGrams: raw.community_weight_grams,
    isVerified: raw.is_verified,
  };
}
