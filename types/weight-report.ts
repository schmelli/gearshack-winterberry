/**
 * Community-verified Weight Types
 * Feature: community-verified-weights
 *
 * Types for the weight reporting system where users can submit
 * actual measured weights for catalog products.
 */

// =============================================================================
// Database Entity Types
// =============================================================================

/** A single weight report submitted by a user */
export interface WeightReport {
  id: string;
  reportedWeightGrams: number;
  measurementContext: string | null;
  createdAt: string;
  isOwnReport: boolean;
}

/** Aggregate stats for a catalog product's weight reports */
export interface WeightReportStats {
  reportCount: number;
  communityWeightGrams: number | null;
  isVerified: boolean;
  manufacturerWeightGrams: number | null;
}

/** Current user's existing report for a product (if any) */
export interface UserWeightReport {
  id: string;
  reportedWeightGrams: number;
  measurementContext: string | null;
}

/** Full response from get_weight_reports RPC */
export interface WeightReportsResponse {
  reports: WeightReport[];
  /** Null when the catalog product does not exist */
  stats: WeightReportStats | null;
  userReport: UserWeightReport | null;
}

// =============================================================================
// Submit Weight Report Types
// =============================================================================

/** Input for submitting a weight report */
export interface SubmitWeightReportInput {
  catalogProductId: string;
  reportedWeightGrams: number;
  measurementContext?: string;
}

/** Response from submit_weight_report RPC */
export interface SubmitWeightReportResponse {
  reportId: string;
  reportCount: number;
  communityWeightGrams: number | null;
  isVerified: boolean;
}

// =============================================================================
// Hook Return Types
// =============================================================================

/** Return type for useWeightReports hook */
export interface UseWeightReportsReturn {
  /** All weight reports for the product */
  reports: WeightReport[];
  /** Aggregate statistics */
  stats: WeightReportStats | null;
  /** Current user's existing report */
  userReport: UserWeightReport | null;
  /** Whether data is loading */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Submit or update a weight report */
  submitReport: (weightGrams: number, context?: string) => Promise<void>;
  /** Whether a submission is in progress */
  isSubmitting: boolean;
  /** Refresh the data */
  refresh: () => void;
}
